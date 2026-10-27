package org.noor.alquran;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * NoorAudioService: Guaranteed Foreground Service for background Athkar and Adhan playback.
 * Runs with FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK to prevent Android OS from killing
 * the audio playback even when:
 * 1. App is swiped away / killed from Recents
 * 2. Phone is in deep sleep / Doze mode
 * 3. Screen is locked
 */
public class NoorAudioService extends Service {
    private static final String TAG = "NoorAudioService";

    public static final String ACTION_PLAY_ADHAN = "org.noor.alquran.action.PLAY_ADHAN";
    public static final String ACTION_PLAY_THIKR = "org.noor.alquran.action.PLAY_THIKR";
    public static final String ACTION_STOP_AUDIO = "org.noor.alquran.action.STOP_AUDIO";

    public static final String CHANNEL_ADHAN_ID = "noor_adhan_fg_channel_v1";
    public static final String CHANNEL_ATHKAR_ID = "noor_athkar_fg_channel_v1";

    public static final int NOTIFICATION_ID_ADHAN = 8881;
    public static final int NOTIFICATION_ID_ATHKAR = 7771;

    private static MediaPlayer activePlayer = null;
    private PowerManager.WakeLock wakeLock = null;
    private AudioManager audioManager = null;
    private AudioFocusRequest audioFocusRequest = null;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable timeoutRunnable = null;

    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.i(TAG, "onStartCommand received action: " + action);

        if (ACTION_STOP_AUDIO.equals(action)) {
            stopPlaybackAndService();
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY_ADHAN.equals(action)) {
            handlePlayAdhan(intent);
            return START_NOT_STICKY;
        }

        if (ACTION_PLAY_THIKR.equals(action)) {
            handlePlayThikr(intent);
            return START_NOT_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void handlePlayAdhan(Intent intent) {
        String prayerName = intent.getStringExtra("prayer_name");
        String cityName = intent.getStringExtra("city_name");
        if (prayerName == null || prayerName.isEmpty()) prayerName = "الصلاة";
        if (cityName == null || cityName.isEmpty()) cityName = "موقعك";

        // Acquire WakeLock for up to 4 minutes (Azan length is ~3.5 min)
        acquireWakeLock(240000L);

        // Build notification
        Notification notification = buildAdhanNotification(prayerName, cityName);
        startForegroundCompat(NOTIFICATION_ID_ADHAN, notification);

        // Request audio focus
        requestAudioFocus();

        // Cancel previous timeout
        cancelTimeout();

        // Timeout watchdog (220 seconds) in case of unexpected lock
        timeoutRunnable = this::stopPlaybackAndService;
        handler.postDelayed(timeoutRunnable, 220000L);

        // Play Mohamed Jazi Azan audio
        int soundResId = getResources().getIdentifier("adhan", "raw", getPackageName());
        if (soundResId == 0) {
            Log.w(TAG, "adhan.ogg not found in raw resources!");
            stopPlaybackAndService();
            return;
        }

        startAudioPlayback(soundResId, 1.0f, true, () -> {
            Log.i(TAG, "Adhan audio completed naturally.");
            stopPlaybackAndService();
        });
    }

    private void handlePlayThikr(Intent intent) {
        String soundName = intent.getStringExtra("thikr_sound");
        String title = intent.getStringExtra("thikr_title");
        String body = intent.getStringExtra("thikr_body");
        float volume = intent.getFloatExtra("volume", 0.9f);

        if (title == null || title.isEmpty()) title = "التسبيح والذكر";
        if (body == null || body.isEmpty()) body = "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ";

        // Clean sound name
        if (soundName != null) {
            if (soundName.contains("/")) soundName = soundName.substring(soundName.lastIndexOf('/') + 1);
            if (soundName.contains(".")) soundName = soundName.substring(0, soundName.lastIndexOf('.'));
        } else {
            soundName = "tasbeeh_azeem";
        }

        // Acquire WakeLock for 20 seconds max
        acquireWakeLock(20000L);

        // Build Athkar notification
        Notification notification = buildAthkarNotification(title, body);
        startForegroundCompat(NOTIFICATION_ID_ATHKAR, notification);

        requestAudioFocus();

        cancelTimeout();
        timeoutRunnable = this::finishAthkar;
        handler.postDelayed(timeoutRunnable, 15000L);

        int soundResId = getResources().getIdentifier(soundName, "raw", getPackageName());
        if (soundResId == 0) {
            Log.w(TAG, "Thikr sound not found: " + soundName + ", trying tasbeeh_azeem fallback");
            soundResId = getResources().getIdentifier("tasbeeh_azeem", "raw", getPackageName());
        }

        if (soundResId == 0) {
            Log.w(TAG, "No sound resource available, finishing athkar.");
            finishAthkar();
            return;
        }

        startAudioPlayback(soundResId, volume, false, () -> {
            Log.i(TAG, "Thikr audio completed naturally.");
            finishAthkar();
        });
    }

    private void startForegroundCompat(int notificationId, Notification notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(notificationId, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(notificationId, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in startForegroundCompat: " + e.getMessage(), e);
            try {
                startForeground(notificationId, notification);
            } catch (Exception ignored) {}
        }
    }

    private synchronized void startAudioPlayback(int soundResId, float volume, boolean isMusic, Runnable onDone) {
        stopActivePlayerOnly();

        try {
            MediaPlayer player = new MediaPlayer();
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(isMusic ? AudioAttributes.CONTENT_TYPE_MUSIC : AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
            player.setAudioAttributes(attrs);

            AssetFileDescriptor afd = getResources().openRawResourceFd(soundResId);
            if (afd != null) {
                player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                afd.close();
            } else {
                Uri uri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/" + soundResId);
                player.setDataSource(this, uri);
            }

            player.setVolume(volume, volume);

            player.setOnCompletionListener(mp -> {
                stopActivePlayerOnly();
                if (onDone != null) onDone.run();
            });

            player.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
                stopActivePlayerOnly();
                if (onDone != null) onDone.run();
                return true;
            });

            player.prepare();
            player.start();
            activePlayer = player;
            Log.i(TAG, "MediaPlayer started successfully with USAGE_ALARM, volume: " + volume);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start MediaPlayer: " + e.getMessage(), e);
            stopActivePlayerOnly();
            if (onDone != null) onDone.run();
        }
    }

    private Notification buildAdhanNotification(String prayerName, String cityName) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
                this,
                910,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, NoorAudioService.class);
        stopIntent.setAction(ACTION_STOP_AUDIO);
        PendingIntent stopPi = PendingIntent.getService(
                this,
                911,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = "🕌 حان الآن موعد أذان " + prayerName;
        String body = "حيّ على الصلاة، حيّ على الفلاح • بتوقيت " + cityName + " (بصوت محمد جازي)";

        return new NotificationCompat.Builder(this, CHANNEL_ADHAN_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(Color.parseColor("#C8A85B"))
                .setOngoing(true)
                .setContentIntent(openPi)
                .setFullScreenIntent(openPi, true)
                .addAction(android.R.drawable.ic_media_pause, "إيقاف صوت الأذان", stopPi)
                .build();
    }

    private Notification buildAthkarNotification(String title, String body) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
                this,
                920,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ATHKAR_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("نور القرآن 📿 • " + title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(Color.parseColor("#C8A85B"))
                .setAutoCancel(true)
                .setContentIntent(openPi)
                .build();
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // Adhan Channel: High importance, sound managed by foreground MediaPlayer
        NotificationChannel adhanChannel = new NotificationChannel(
                CHANNEL_ADHAN_ID,
                "أذان الصلوات (صوتي مباشر)",
                NotificationManager.IMPORTANCE_HIGH
        );
        adhanChannel.setDescription("تنبيه صوتي بأذان الصلوات في موعدها بدقة متناهية");
        adhanChannel.enableLights(true);
        adhanChannel.setLightColor(Color.parseColor("#C8A85B"));
        adhanChannel.enableVibration(true);
        adhanChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(adhanChannel);

        // Athkar Channel
        NotificationChannel athkarChannel = new NotificationChannel(
                CHANNEL_ATHKAR_ID,
                "أذكار نور القرآن (صوتي)",
                NotificationManager.IMPORTANCE_HIGH
        );
        athkarChannel.setDescription("تنبيهات الأذكار والتسبيحات الصوتية الدورية");
        athkarChannel.enableLights(true);
        athkarChannel.setLightColor(Color.parseColor("#C8A85B"));
        athkarChannel.enableVibration(true);
        athkarChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(athkarChannel);
    }

    private void requestAudioFocus() {
        try {
            if (audioManager == null) return;
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(attrs)
                        .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
            }
        } catch (Exception e) {
            Log.w(TAG, "Audio focus request failed: " + e.getMessage());
        }
    }

    private void abandonAudioFocus() {
        try {
            if (audioManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            }
        } catch (Exception ignored) {}
    }

    private void acquireWakeLock(long timeoutMillis) {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                releaseWakeLock();
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NoorAlQuran:AudioServiceWakeLock");
                wakeLock.acquire(timeoutMillis);
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock acquire error: " + e.getMessage());
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {}
        wakeLock = null;
    }

    private void cancelTimeout() {
        if (timeoutRunnable != null) {
            handler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }
    }

    private synchronized void stopActivePlayerOnly() {
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

    private void finishAthkar() {
        cancelTimeout();
        stopActivePlayerOnly();
        abandonAudioFocus();
        releaseWakeLock();

        // Detach foreground so notification remains visible for user to read
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_DETACH);
            } else {
                stopForeground(false);
            }
        } catch (Exception ignored) {}

        stopSelf();
    }

    private void stopPlaybackAndService() {
        cancelTimeout();
        stopActivePlayerOnly();
        abandonAudioFocus();
        releaseWakeLock();

        try {
            stopForeground(true);
        } catch (Exception ignored) {}

        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID_ADHAN);
            }
        } catch (Exception ignored) {}

        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopPlaybackAndService();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
