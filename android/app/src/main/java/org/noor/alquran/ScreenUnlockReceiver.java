package org.noor.alquran;

import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.PowerManager;
import android.util.Log;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * ScreenUnlockReceiver (مثل تطبيق الشفيع)
 * ينطق بصوت "اللهم صل على سيدنا محمد" عند فتح شاشة الجوال بعد أن كان مغلقاً
 */
public class ScreenUnlockReceiver extends BroadcastReceiver {
    private static final String TAG = "ScreenUnlockReceiver";
    public static final String PREFS_NAME = "noor_screen_unlock_prefs";
    public static final String KEY_ENABLED = "unlock_salawat_enabled";
    public static final String KEY_LAST_PLAYED = "unlock_salawat_last_played";
    private static final long COOLDOWN_MS = 12000L; // 12s cooldown to avoid repetitive triggers

    private static PowerManager.WakeLock wakeLock;
    private static MediaPlayer activePlayer;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.d(TAG, "ScreenUnlockReceiver onReceive action: " + action);

        if (Intent.ACTION_USER_PRESENT.equals(action) ||
            "org.noor.alquran.ACTION_TRIGGER_UNLOCK_SALAWAT".equals(action)) {
            triggerSalawatIfEnabled(context);
        }
    }

    public static void triggerSalawatIfEnabled(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean isEnabled = prefs.getBoolean(KEY_ENABLED, true);
            if (!isEnabled) {
                Log.d(TAG, "Unlock Salawat is disabled by user.");
                return;
            }

            long now = System.currentTimeMillis();
            long lastPlayed = prefs.getLong(KEY_LAST_PLAYED, 0L);
            if (now - lastPlayed < COOLDOWN_MS) {
                Log.d(TAG, "Unlock Salawat skipped due to cooldown (" + (now - lastPlayed) + "ms)");
                return;
            }

            prefs.edit().putLong(KEY_LAST_PLAYED, now).apply();
            playSalawatDirect(context.getApplicationContext());
        } catch (Exception e) {
            Log.e(TAG, "Error in triggerSalawatIfEnabled: " + e.getMessage(), e);
        }
    }

    public static synchronized void playSalawatDirect(Context context) {
        if (context == null) return;

        try {
            // Acquire wake lock for 5 seconds to ensure audio completes smoothly
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (wakeLock != null && wakeLock.isHeld()) {
                    wakeLock.release();
                }
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NoorAlQuran:UnlockSalawatWakeLock");
                wakeLock.acquire(6000L);
            }

            // Clean up any previous playback
            stopActivePlayer();

            int soundResId = context.getResources().getIdentifier("salawat_nabi", "raw", context.getPackageName());
            if (soundResId == 0) {
                Log.w(TAG, "salawat_nabi raw sound resource not found!");
                releaseWakeLock();
                return;
            }

            MediaPlayer player = new MediaPlayer();
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
            player.setAudioAttributes(attrs);

            AssetFileDescriptor afd = context.getResources().openRawResourceFd(soundResId);
            if (afd != null) {
                player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
            } else {
                Uri uri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/" + soundResId);
                player.setDataSource(context, uri);
            }

            player.setVolume(1.0f, 1.0f);

            final AtomicBoolean finished = new AtomicBoolean(false);
            Runnable cleanup = () -> {
                if (finished.compareAndSet(false, true)) {
                    stopActivePlayer();
                    releaseWakeLock();
                }
            };

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
            Log.i(TAG, "Unlock Salawat started playing successfully.");

        } catch (Exception e) {
            Log.e(TAG, "Failed to play unlock salawat: " + e.getMessage(), e);
            stopActivePlayer();
            releaseWakeLock();
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
