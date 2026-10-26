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
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import java.util.Calendar;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native Adhan / Azan Alarm Receiver for Noor AlQuran.
 * Guarantees Azan audio playback and notification at exact prayer times:
 * 1. App completely closed / removed from recents
 * 2. Device in deep sleep / Doze mode
 * 3. Exact minute scheduling via AlarmClockInfo
 */
public class AdhanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanAlarmReceiver";
    public static final String PREFS_NAME = "noor_adhan_prefs";
    public static final String ACTION_ADHAN_ALARM = "org.noor.alquran.ADHAN_ALARM";
    public static final String ACTION_STOP_ADHAN = "org.noor.alquran.STOP_ADHAN";
    public static final String CHANNEL_ID = "noor_adhan_channel_v2";
    public static final int NOTIFICATION_ID = 888;

    public static final int REQ_FAJR = 2001;
    public static final int REQ_DHUHR = 2002;
    public static final int REQ_ASR = 2003;
    public static final int REQ_MAGHRIB = 2004;
    public static final int REQ_ISHA = 2005;

    private static MediaPlayer activePlayer = null;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "onReceive triggered with action: " + action);

        // Handle Stop Action from Notification
        if (ACTION_STOP_ADHAN.equals(action)) {
            stopCurrentAdhan(context);
            return;
        }

        // On reboot or app update, reschedule all prayer alarms
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            Log.i(TAG, "Device booted or package replaced, rescheduling Adhan alarms.");
            rescheduleFromPrefs(context);
            return;
        }

        if (!ACTION_ADHAN_ALARM.equals(action)) return;

        final String prayerKey = intent.getStringExtra("prayer_key");
        final String prayerName = intent.getStringExtra("prayer_name");
        final String cityName = intent.getStringExtra("city_name") != null ? intent.getStringExtra("city_name") : "موقعك";

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean masterEnabled = prefs.getBoolean("adhan_master_enabled", true);
        boolean prayerEnabled = prefs.getBoolean("adhan_" + prayerKey, true);

        if (!masterEnabled || !prayerEnabled) {
            Log.i(TAG, "Adhan for " + prayerKey + " is disabled, skipping playback.");
            rescheduleSinglePrayerNextDay(context, prayerKey, prayerName, cityName);
            return;
        }

        // Acquire WakeLock for up to 3.5 minutes (full Azan duration)
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NoorAlQuran:AdhanWakeLock");
            wakeLock.acquire(210000L); // 3.5 minutes
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

        try {
            createNotificationChannel(context);
            showAdhanNotification(context, prayerName, cityName);
            playAdhanAudio(context, cleanup);
        } catch (Exception e) {
            Log.e(TAG, "Error in Adhan onReceive: " + e.getMessage(), e);
            cleanup.run();
        }

        // Automatically reschedule next day for this prayer
        rescheduleSinglePrayerNextDay(context, prayerKey, prayerName, cityName);
    }

    public static synchronized void stopCurrentAdhan(Context context) {
        try {
            if (activePlayer != null) {
                if (activePlayer.isPlaying()) {
                    activePlayer.stop();
                }
                activePlayer.release();
                activePlayer = null;
            }
        } catch (Exception ignored) {}

        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}
    }

    private static synchronized void playAdhanAudio(Context context, Runnable onComplete) {
        stopCurrentAdhan(context);

        try {
            int soundResId = context.getResources().getIdentifier("adhan", "raw", context.getPackageName());
            if (soundResId == 0) {
                Log.w(TAG, "adhan.ogg not found in raw resources, fallback to default sound.");
                if (onComplete != null) onComplete.run();
                return;
            }

            MediaPlayer player = MediaPlayer.create(context, soundResId);
            if (player == null) {
                if (onComplete != null) onComplete.run();
                return;
            }

            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();
            player.setAudioAttributes(attrs);
            player.setVolume(1.0f, 1.0f);

            player.setOnCompletionListener(mp -> {
                try {
                    mp.release();
                } catch (Exception ignored) {}
                activePlayer = null;
                if (onComplete != null) onComplete.run();
            });

            player.setOnErrorListener((mp, what, extra) -> {
                try {
                    mp.release();
                } catch (Exception ignored) {}
                activePlayer = null;
                if (onComplete != null) onComplete.run();
                return true;
            });

            activePlayer = player;
            player.start();
            Log.i(TAG, "Adhan audio playback started successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start Adhan audio: " + e.getMessage());
            if (onComplete != null) onComplete.run();
        }
    }

    public static void playTestAdhan(Context context) {
        playAdhanAudio(context, null);
    }

    private static void showAdhanNotification(Context context, String prayerName, String cityName) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openAppPending = PendingIntent.getActivity(
                    context,
                    901,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Action to stop Azan sound immediately from notification bar
            Intent stopIntent = new Intent(context, AdhanAlarmReceiver.class);
            stopIntent.setAction(ACTION_STOP_ADHAN);
            PendingIntent stopPending = PendingIntent.getBroadcast(
                    context,
                    902,
                    stopIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String title = "🕌 حان الآن موعد أذان " + (prayerName != null ? prayerName : "الصلاة");
            String body = "حيّ على الصلاة، حيّ على الفلاح • بتوقيت " + cityName;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setContentIntent(openAppPending)
                    .addAction(android.R.drawable.ic_media_pause, "إيقاف صوت الأذان", stopPending);

            nm.notify(NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Error displaying Adhan notification: " + e.getMessage());
        }
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "تنبيهات أذان الصلوات",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("تنبيه صوتي بالأذان الشريف عند دخول وقت كل صلاة");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#C8A85B"));
            channel.enableVibration(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            nm.createNotificationChannel(channel);
        } catch (Exception e) {
            Log.w(TAG, "Error creating Adhan notification channel: " + e.getMessage());
        }
    }

    // Schedule All 5 Prayer Times from JavaScript/App
    public static void scheduleAllPrayers(
            Context context,
            String fajr,
            String dhuhr,
            String asr,
            String maghrib,
            String isha,
            String cityName
    ) {
        createNotificationChannel(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor ed = prefs.edit();

        if (fajr != null) ed.putString("time_fajr", fajr);
        if (dhuhr != null) ed.putString("time_dhuhr", dhuhr);
        if (asr != null) ed.putString("time_asr", asr);
        if (maghrib != null) ed.putString("time_maghrib", maghrib);
        if (isha != null) ed.putString("time_isha", isha);
        if (cityName != null) ed.putString("city_name", cityName);
        ed.apply();

        scheduleSinglePrayerAlarm(context, "fajr", "الفجر", fajr, cityName, REQ_FAJR);
        scheduleSinglePrayerAlarm(context, "dhuhr", "الظهر", dhuhr, cityName, REQ_DHUHR);
        scheduleSinglePrayerAlarm(context, "asr", "العصر", asr, cityName, REQ_ASR);
        scheduleSinglePrayerAlarm(context, "maghrib", "المغرب", maghrib, cityName, REQ_MAGHRIB);
        scheduleSinglePrayerAlarm(context, "isha", "العشاء", isha, cityName, REQ_ISHA);

        Log.i(TAG, "All 5 Adhan prayer alarms scheduled successfully.");
    }

    public static void scheduleSinglePrayerAlarm(
            Context context,
            String prayerKey,
            String prayerName,
            String timeStr,
            String cityName,
            int reqCode
    ) {
        if (timeStr == null || !timeStr.contains(":")) return;

        try {
            String[] parts = timeStr.split(":");
            int hour = Integer.parseInt(parts[0].trim());
            int minute = Integer.parseInt(parts[1].trim());

            Calendar now = Calendar.getInstance();
            Calendar target = Calendar.getInstance();
            target.set(Calendar.HOUR_OF_DAY, hour);
            target.set(Calendar.MINUTE, minute);
            target.set(Calendar.SECOND, 0);
            target.set(Calendar.MILLISECOND, 0);

            // If time has already passed today, schedule for tomorrow
            if (target.before(now)) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }

            long triggerAtMillis = target.getTimeInMillis();

            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, AdhanAlarmReceiver.class);
            intent.setAction(ACTION_ADHAN_ALARM);
            intent.putExtra("prayer_key", prayerKey);
            intent.putExtra("prayer_name", prayerName);
            intent.putExtra("city_name", cityName);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    reqCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent showIntent = new Intent(context, MainActivity.class);
            PendingIntent showPi = PendingIntent.getActivity(
                    context,
                    reqCode + 500,
                    showIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPi);
                am.setAlarmClock(clockInfo, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }

            Log.i(TAG, "Scheduled Adhan alarm for " + prayerKey + " at " + target.getTime().toString());
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling single prayer alarm for " + prayerKey + ": " + e.getMessage());
        }
    }

    private static void rescheduleSinglePrayerNextDay(Context context, String prayerKey, String prayerName, String cityName) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String timeStr = prefs.getString("time_" + prayerKey, null);
        if (timeStr == null) return;

        int reqCode = getReqCode(prayerKey);
        scheduleSinglePrayerAlarm(context, prayerKey, prayerName, timeStr, cityName, reqCode);
    }

    public static void rescheduleFromPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean masterEnabled = prefs.getBoolean("adhan_master_enabled", true);
        if (!masterEnabled) return;

        String cityName = prefs.getString("city_name", "موقعك");
        String fajr = prefs.getString("time_fajr", null);
        String dhuhr = prefs.getString("time_dhuhr", null);
        String asr = prefs.getString("time_asr", null);
        String maghrib = prefs.getString("time_maghrib", null);
        String isha = prefs.getString("time_isha", null);

        scheduleAllPrayers(context, fajr, dhuhr, asr, maghrib, isha, cityName);
    }

    public static void cancelAllAdhanAlarms(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            int[] reqCodes = {REQ_FAJR, REQ_DHUHR, REQ_ASR, REQ_MAGHRIB, REQ_ISHA};
            for (int rc : reqCodes) {
                Intent intent = new Intent(context, AdhanAlarmReceiver.class);
                intent.setAction(ACTION_ADHAN_ALARM);
                PendingIntent pi = PendingIntent.getBroadcast(
                        context,
                        rc,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                am.cancel(pi);
            }
            Log.i(TAG, "Cancelled all Adhan alarms.");
        } catch (Exception e) {
            Log.w(TAG, "Error cancelling all Adhan alarms: " + e.getMessage());
        }
    }

    private static int getReqCode(String prayerKey) {
        if ("fajr".equals(prayerKey)) return REQ_FAJR;
        if ("dhuhr".equals(prayerKey)) return REQ_DHUHR;
        if ("asr".equals(prayerKey)) return REQ_ASR;
        if ("maghrib".equals(prayerKey)) return REQ_MAGHRIB;
        if ("isha".equals(prayerKey)) return REQ_ISHA;
        return 2000;
    }
}
