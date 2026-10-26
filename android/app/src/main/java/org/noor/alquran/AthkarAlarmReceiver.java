package org.noor.alquran;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * High-reliability Native Alarm Receiver for Noor AlQuran Athkar.
 * Guarantees voice playback and notifications even when:
 * 1. App is completely closed / swiped away from Recents
 * 2. Device is in deep sleep / Doze mode
 * 3. Device has rebooted (BOOT_COMPLETED)
 */
public class AthkarAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AthkarAlarmReceiver";
    public static final String PREFS_NAME = "noor_athkar_prefs";
    public static final String ACTION_ATHKAR_ALARM = "org.noor.alquran.ATHKAR_ALARM";
    public static final String CHANNEL_ID = "noor_athkar_channel_v9";
    public static final int NOTIFICATION_ID = 777;
    public static final int ALARM_REQ_CODE = 1001;

    public static class ThikrItem {
        public String id;
        public String sound;
        public String title;
        public String body;

        public ThikrItem(String id, String sound, String title, String body) {
            this.id = id;
            this.sound = sound;
            this.title = title;
            this.body = body;
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "onReceive triggered with action: " + action);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("enabled", true);

        if (!enabled) {
            Log.i(TAG, "Athkar is disabled by user, skipping.");
            return;
        }

        int intervalMinutes = prefs.getInt("interval_minutes", 10);
        if (intervalMinutes <= 0) intervalMinutes = 10;

        // On reboot or app update, reschedule the first alarm and exit
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            Log.i(TAG, "Device booted or package replaced, rescheduling Athkar.");
            scheduleNextAlarm(context, intervalMinutes);
            return;
        }

        // Handle alarm execution with WakeLock & goAsync
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NoorAlQuran:AthkarWakeLock");
            wakeLock.acquire(15000L); // 15 seconds max safety timeout
        }

        final PendingResult pendingResult = goAsync();
        final PowerManager.WakeLock finalWakeLock = wakeLock;
        final AtomicBoolean finished = new AtomicBoolean(false);

        Runnable cleanup = () -> {
            if (finished.compareAndSet(false, true)) {
                try {
                    if (finalWakeLock != null && finalWakeLock.isHeld()) {
                        finalWakeLock.release();
                    }
                } catch (Exception ignored) {}
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        };

        // Watchdog to prevent receiver freeze
        new Handler(Looper.getMainLooper()).postDelayed(cleanup, 12000L);

        try {
            List<ThikrItem> items = loadThikrItems(prefs);
            if (items.isEmpty()) {
                items = getDefaultThikrItems();
            }

            int currentIndex = prefs.getInt("current_index", 0);
            ThikrItem currentItem = items.get(Math.abs(currentIndex) % items.size());

            // Advance index for next time
            prefs.edit().putInt("current_index", (currentIndex + 1) % items.size()).apply();

            float volume = prefs.getFloat("volume", 0.9f);

            // 1. Show Heads-Up Notification with Dhikr text
            showNotification(context, currentItem);

            // 2. Play Authentic Voice Audio
            playVoiceAudio(context, currentItem.sound, volume, cleanup);

            // 3. Schedule NEXT alarm in the chain
            scheduleNextAlarm(context, intervalMinutes);

        } catch (Exception e) {
            Log.e(TAG, "Error executing Athkar alarm: " + e.getMessage(), e);
            cleanup.run();
        }
    }

    private void showNotification(Context context, ThikrItem item) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            String rawName = item.sound != null ? item.sound.replaceAll("\\.[^.]+$", "") : "tasbeeh_azeem";
            if (rawName.contains("/")) rawName = rawName.substring(rawName.lastIndexOf('/') + 1);
            String channelId = "noor_athkar_ch_" + rawName;

            Uri soundUri = null;
            int soundResId = context.getResources().getIdentifier(rawName, "raw", context.getPackageName());
            if (soundResId != 0) {
                soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + context.getPackageName() + "/raw/" + rawName);
            }

            // Create high-importance channel on Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = nm.getNotificationChannel(channelId);
                if (channel == null) {
                    channel = new NotificationChannel(
                            channelId,
                            "أذكار: " + (item.title != null ? item.title : "نور القرآن"),
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("تنبيهات صوتية للأذكار اليومية حتى مع إغلاق التطبيق");
                    channel.enableLights(true);
                    channel.setLightColor(Color.parseColor("#C8A85B"));
                    channel.enableVibration(true);
                    channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                    if (soundUri != null) {
                        AudioAttributes aa = new AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .build();
                        channel.setSound(soundUri, aa);
                    }
                    nm.createNotificationChannel(channel);
                }
            }

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent contentIntent = PendingIntent.getActivity(
                    context,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("نور القرآن 📿")
                    .setContentText(item.body != null && !item.body.isEmpty() ? item.body : item.title)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(item.body != null ? item.body : item.title))
                    .setColor(Color.parseColor("#C8A85B"))
                    .setContentIntent(contentIntent)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            if (soundUri != null) {
                builder.setSound(soundUri);
            }

            nm.notify(NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.w(TAG, "Failed to display notification: " + e.getMessage());
        }
    }

    private void playVoiceAudio(Context context, String soundName, float volume, Runnable onDone) {
        if (soundName == null || soundName.trim().isEmpty()) {
            onDone.run();
            return;
        }

        // Clean sound name (e.g. "tasbeeh_azeem.mp3" -> "tasbeeh_azeem")
        String rawName = soundName;
        if (rawName.contains("/")) rawName = rawName.substring(rawName.lastIndexOf('/') + 1);
        if (rawName.contains(".")) rawName = rawName.substring(0, rawName.lastIndexOf('.'));

        int soundResId = context.getResources().getIdentifier(rawName, "raw", context.getPackageName());
        if (soundResId == 0) {
            Log.w(TAG, "Audio resource not found in res/raw: " + rawName);
            onDone.run();
            return;
        }

        try {
            MediaPlayer mp = MediaPlayer.create(context, soundResId);
            if (mp == null) {
                Log.w(TAG, "MediaPlayer create returned null for: " + rawName);
                onDone.run();
                return;
            }

            AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
            mp.setAudioAttributes(aa);
            mp.setVolume(volume, volume);

            mp.setOnCompletionListener(mediaPlayer -> {
                try {
                    mediaPlayer.release();
                } catch (Exception ignored) {}
                onDone.run();
            });

            mp.setOnErrorListener((mediaPlayer, what, extra) -> {
                try {
                    mediaPlayer.release();
                } catch (Exception ignored) {}
                onDone.run();
                return true;
            });

            mp.start();
        } catch (Exception e) {
            Log.e(TAG, "Error playing thikr audio: " + e.getMessage(), e);
            onDone.run();
        }
    }

    public static void scheduleNextAlarm(Context context, int intervalMinutes) {
        if (intervalMinutes <= 0) intervalMinutes = 10;
        long triggerAtMillis = System.currentTimeMillis() + (long) intervalMinutes * 60 * 1000L;
        scheduleAlarmAt(context, triggerAtMillis);
    }

    public static void scheduleAlarmAfterSeconds(Context context, int seconds) {
        long triggerAtMillis = System.currentTimeMillis() + (long) seconds * 1000L;
        scheduleAlarmAt(context, triggerAtMillis);
    }

    private static void scheduleAlarmAt(Context context, long triggerAtMillis) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent intent = new Intent(context, AthkarAlarmReceiver.class);
        intent.setAction(ACTION_ATHKAR_ALARM);
        PendingIntent pi = PendingIntent.getBroadcast(
                context,
                ALARM_REQ_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent showIntent = new Intent(context, MainActivity.class);
                PendingIntent showPi = PendingIntent.getActivity(
                        context,
                        0,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPi);
                am.setAlarmClock(clockInfo, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
            Log.i(TAG, "Scheduled next Athkar alarm at: " + triggerAtMillis);
        } catch (SecurityException se) {
            Log.w(TAG, "setAlarmClock security exception, falling back to setAndAllowWhileIdle: " + se.getMessage());
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to schedule alarm fallback: " + e.getMessage());
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm: " + e.getMessage());
        }
    }

    public static void cancelAlarm(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, AthkarAlarmReceiver.class);
            intent.setAction(ACTION_ATHKAR_ALARM);
            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    ALARM_REQ_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            am.cancel(pi);
            Log.i(TAG, "Cancelled Athkar alarms.");
        } catch (Exception e) {
            Log.w(TAG, "Error cancelling alarm: " + e.getMessage());
        }
    }

    public static void ensureScheduledOnStartup(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("enabled", true);
        if (enabled) {
            int intervalMinutes = prefs.getInt("interval_minutes", 10);
            scheduleNextAlarm(context, intervalMinutes);
        }
    }

    private List<ThikrItem> loadThikrItems(SharedPreferences prefs) {
        List<ThikrItem> list = new ArrayList<>();
        String json = prefs.getString("active_athkar", null);
        if (json != null && !json.trim().isEmpty()) {
            try {
                JSONArray arr = new JSONArray(json);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    list.add(new ThikrItem(
                            obj.optString("id"),
                            obj.optString("sound"),
                            obj.optString("title"),
                            obj.optString("body")
                    ));
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to parse active_athkar JSON: " + e.getMessage());
            }
        }
        return list;
    }

    public static List<ThikrItem> getDefaultThikrItems() {
        List<ThikrItem> list = new ArrayList<>();
        list.add(new ThikrItem("tasbeeh-azeem", "tasbeeh_azeem", "التسبيح", "سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ."));
        list.add(new ThikrItem("tawheed-1", "tawheed", "التهليل والتوحيد", "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ."));
        list.add(new ThikrItem("hawqala-1", "hawqala", "الحوقلة", "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ."));
        list.add(new ThikrItem("salawat-nabi", "salawat_nabi", "الصلاة على النبي ﷺ", "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۝ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا."));
        list.add(new ThikrItem("tasbeeh-quddoos", "tasbeeh_quddoos", "التسبيح والتقديس", "سُبْحَانَ الْمَلِكِ الْقُدُّوسِ."));
        list.add(new ThikrItem("baqiyat-1", "baqiyat", "الباقيات الصالحات", "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ."));
        list.add(new ThikrItem("istighfar-custom", "istighfar", "الاستغفار", "أَسْتَغْفِرُ اللَّهَ."));
        return list;
    }
}
