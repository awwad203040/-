package org.noor.alquran;

import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * ScreenUnlockReceiver (مثل تطبيق الشفيع تماماً)
 * ينطق بصوت ندي "صلي على النبي محمد" عند فتح شاشة الجوال بعد أن كان مغلقاً
 */
public class ScreenUnlockReceiver extends BroadcastReceiver {
    private static final String TAG = "ScreenUnlockReceiver";
    public static final String PREFS_NAME = "noor_screen_unlock_prefs";
    public static final String KEY_ENABLED = "unlock_salawat_enabled";
    public static final String KEY_LAST_PLAYED = "unlock_salawat_last_played";
    private static final long COOLDOWN_MS = 8000L; // 8s cooldown to avoid rapid double-triggers

    private static PowerManager.WakeLock wakeLock;
    private static MediaPlayer activePlayer;
    private static volatile boolean wasScreenOff = true; // Tracks whether screen was turned off
    private static ScreenUnlockReceiver registeredInstance = null;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.i(TAG, "ScreenUnlockReceiver onReceive action: " + action);

        // If phone just booted or app updated, re-arm registration and screen-off state
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            ScreenUnlockService.startService(context);
            ensureRegistered(context);
            wasScreenOff = true;
            return;
        }

        // 1. Phone screen was closed / locked
        if (Intent.ACTION_SCREEN_OFF.equals(action)) {
            wasScreenOff = true;
            Log.d(TAG, "Screen turned OFF. Ready for next unlock/open.");
            return;
        }

        // 2. Phone was opened / unlocked (either screen turned ON, user unlocked, or manual trigger)
        if (Intent.ACTION_USER_PRESENT.equals(action) ||
            Intent.ACTION_SCREEN_ON.equals(action) ||
            "org.noor.alquran.ACTION_TRIGGER_UNLOCK_SALAWAT".equals(action)) {

            // Must call goAsync() to guarantee Android OS does not kill receiver during playback
            final PendingResult pendingResult = goAsync();
            triggerSalawatIfEnabled(context, pendingResult, action);
        }
    }

    public static void triggerSalawatIfEnabled(Context context, final PendingResult pendingResult, String triggerAction) {
        if (context == null) {
            if (pendingResult != null) pendingResult.finish();
            return;
        }
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isEnabled = prefs.getBoolean(KEY_ENABLED, true);
            if (!isEnabled) {
                Log.d(TAG, "Unlock Salawat is disabled in settings.");
                if (pendingResult != null) pendingResult.finish();
                return;
            }

            long now = System.currentTimeMillis();
            long lastPlayed = prefs.getLong(KEY_LAST_PLAYED, 0L);
            if (now - lastPlayed < COOLDOWN_MS) {
                Log.d(TAG, "Unlock Salawat skipped due to cooldown (" + (now - lastPlayed) + "ms)");
                if (pendingResult != null) pendingResult.finish();
                return;
            }

            // Only trigger if screen was actually closed/off, or on USER_PRESENT / manual test
            if (!wasScreenOff && !Intent.ACTION_USER_PRESENT.equals(triggerAction) && !"org.noor.alquran.ACTION_TRIGGER_UNLOCK_SALAWAT".equals(triggerAction)) {
                Log.d(TAG, "Screen was already on, skipping redundant trigger.");
                if (pendingResult != null) pendingResult.finish();
                return;
            }

            wasScreenOff = false;
            prefs.edit().putLong(KEY_LAST_PLAYED, now).apply();
            playSalawatDirect(context.getApplicationContext(), pendingResult);
        } catch (Exception e) {
            Log.e(TAG, "Error in triggerSalawatIfEnabled: " + e.getMessage(), e);
            if (pendingResult != null) {
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        }
    }

    public static void playSalawatDirect(Context context) {
        playSalawatDirect(context, null);
    }

    public static synchronized void playSalawatDirect(Context context, final PendingResult pendingResult) {
        if (context == null) {
            if (pendingResult != null) pendingResult.finish();
            return;
        }

        try {
            // Acquire partial wake lock for 7 seconds to ensure playback completes uninterrupted
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (wakeLock != null && wakeLock.isHeld()) {
                    wakeLock.release();
                }
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NoorAlQuran:UnlockSalawatWakeLock");
                wakeLock.acquire(7000L);
            }

            // Clean up any previous playback
            stopActivePlayer();

            int soundResId = context.getResources().getIdentifier("salawat_nabi", "raw", context.getPackageName());
            if (soundResId == 0) {
                Log.w(TAG, "salawat_nabi raw sound resource not found!");
                releaseWakeLock();
                if (pendingResult != null) pendingResult.finish();
                return;
            }

            // AudioAttributes configured for USAGE_MEDIA (STREAM_MUSIC) - high audibility through phone speakers
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();

            // Request AudioFocus so audio is clear and ducks background music
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            AudioFocusRequest focusRequest = null;
            if (am != null) {
                try {
                    int currentVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                    int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    if (currentVol < maxVol / 4) {
                        am.setStreamVolume(AudioManager.STREAM_MUSIC, maxVol / 2, 0);
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                                .setAudioAttributes(attrs)
                                .build();
                        am.requestAudioFocus(focusRequest);
                    } else {
                        am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                    }
                } catch (Exception ignored) {}
            }

            final AudioFocusRequest finalFocus = focusRequest;
            final AudioManager finalAm = am;
            final AtomicBoolean finished = new AtomicBoolean(false);

            Runnable cleanup = () -> {
                if (finished.compareAndSet(false, true)) {
                    try {
                        if (finalAm != null && finalFocus != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            finalAm.abandonAudioFocusRequest(finalFocus);
                        }
                    } catch (Exception ignored) {}
                    stopActivePlayer();
                    releaseWakeLock();
                    if (pendingResult != null) {
                        try {
                            pendingResult.finish();
                        } catch (Exception ignored) {}
                    }
                }
            };

            // Watchdog safety timeout
            new Handler(Looper.getMainLooper()).postDelayed(cleanup, 6000L);

            MediaPlayer player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            player.setWakeMode(context, PowerManager.PARTIAL_WAKE_LOCK);

            AssetFileDescriptor afd = context.getResources().openRawResourceFd(soundResId);
            if (afd != null) {
                player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
            } else {
                Uri uri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/" + soundResId);
                player.setDataSource(context, uri);
            }

            player.setVolume(1.0f, 1.0f);

            player.setOnCompletionListener(mp -> {
                Log.i(TAG, "Unlock Salawat audio finished naturally.");
                cleanup.run();
            });

            player.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error playing unlock salawat: " + what + ", " + extra);
                cleanup.run();
                return true;
            });

            player.prepare();
            player.start();
            activePlayer = player;
            Log.i(TAG, "Unlock Salawat (صلي على النبي محمد) started playing successfully on media stream.");

        } catch (Exception e) {
            Log.e(TAG, "Failed to play unlock salawat: " + e.getMessage(), e);
            stopActivePlayer();
            releaseWakeLock();
            if (pendingResult != null) {
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        }
    }

    private static synchronized void stopActivePlayer() {
        try {
            if (activePlayer != null) {
                if (activePlayer.isPlaying()) {
                    activePlayer.stop();
                }
                activePlayer.reset();
                activePlayer.release();
                activePlayer = null;
            }
        } catch (Exception ignored) {}
    }

    private static synchronized void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception ignored) {}
    }

    public static synchronized void ensureRegistered(Context context) {
        if (context == null) return;
        try {
            if (registeredInstance == null) {
                registeredInstance = new ScreenUnlockReceiver();
                android.content.IntentFilter filter = new android.content.IntentFilter();
                filter.addAction(Intent.ACTION_USER_PRESENT);
                filter.addAction(Intent.ACTION_SCREEN_ON);
                filter.addAction(Intent.ACTION_SCREEN_OFF);
                context.getApplicationContext().registerReceiver(registeredInstance, filter);
                Log.i(TAG, "ScreenUnlockReceiver registered dynamically on ApplicationContext for SCREEN_ON, SCREEN_OFF, USER_PRESENT.");
            }
        } catch (Exception e) {
            Log.w(TAG, "ScreenUnlockReceiver ensureRegistered failed: " + e.getMessage());
        }
    }

    public static boolean isEnabled(Context context) {
        if (context == null) return true;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_ENABLED, true);
    }

    public static void setEnabled(Context context, boolean enabled) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, enabled).apply();
    }
}
