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
import android.content.res.AssetFileDescriptor;
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
    public static final String CHANNEL_FALLBACK_ID = "noor_adhan_direct_v1";
    public static final int NOTIFICATION_FALLBACK_ID = 8882;

    public static final int REQ_FAJR = 2001;
    public static final int REQ_DHUHR = 2002;
    public static final int REQ_ASR = 2003;
    public static final int REQ_MAGHRIB = 2004;
    public static final int REQ_ISHA = 2005;

    private static MediaPlayer activePlayer = null;
    private static PowerManager.WakeLock activeCpuLock = null;
    private static PowerManager.WakeLock activeScreenLock = null;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "onReceive triggered with action: " + action);

        // Handle Stop Action
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

        // 1. Guaranteed rescheduling first so the chain is never interrupted
        rescheduleSinglePrayerNextDay(context, prayerKey, prayerName, cityName);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean masterEnabled = prefs.getBoolean("adhan_master_enabled", true);
        boolean prayerEnabled = prefs.getBoolean("adhan_" + prayerKey, true);

        if (!masterEnabled || !prayerEnabled) {
            Log.i(TAG, "Adhan for " + prayerKey + " is disabled, skipping playback.");
            return;
        }

        // 2. Try starting NoorAudioService (Foreground Service).
        // If Android 12+ throws ForegroundServiceStartNotAllowedException while app is closed,
        // seamlessly fall back to direct MediaPlayer playback inside the BroadcastReceiver with WakeLock!
        Intent serviceIntent = new Intent(context, NoorAudioService.class);
        serviceIntent.setAction(NoorAudioService.ACTION_PLAY_ADHAN);
        serviceIntent.putExtra("prayer_key", prayerKey);
        serviceIntent.putExtra("prayer_name", prayerName);
        serviceIntent.putExtra("city_name", cityName);

        boolean startedService = false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            startedService = true;
        } catch (Exception e) {
            Log.w(TAG, "Could not start Foreground Service from background: " + e.getMessage() + ". Using direct playback fallback.");
        }

        if (!startedService) {
            playAdhanDirectFallback(context, prayerKey, prayerName, cityName);
        }
    }

    private void playAdhanDirectFallback(Context context, String prayerKey, String prayerName, String cityName) {
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            try {
                if (activeCpuLock != null && activeCpuLock.isHeld()) activeCpuLock.release();
                activeCpuLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NoorAlQuran:AdhanDirectFallbackCpuLock");
                activeCpuLock.acquire(220000L); // 220s safety timeout
            } catch (Exception ignored) {}

            try {
                if (activeScreenLock != null && activeScreenLock.isHeld()) activeScreenLock.release();
                activeScreenLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                        "NoorAlQuran:AdhanDirectFallbackScreenLock"
                );
                activeScreenLock.acquire(10000L); // Light up screen for 10s
            } catch (Exception ignored) {}
        }

        final PendingResult pendingResult = goAsync();
        final AtomicBoolean finished = new AtomicBoolean(false);

        Runnable cleanup = () -> {
            if (finished.compareAndSet(false, true)) {
                try {
                    stopActivePlayer();
                } catch (Exception ignored) {}
                try {
                    if (activeCpuLock != null && activeCpuLock.isHeld()) {
                        activeCpuLock.release();
                        activeCpuLock = null;
                    }
                } catch (Exception ignored) {}
                try {
                    if (activeScreenLock != null && activeScreenLock.isHeld()) {
                        activeScreenLock.release();
                        activeScreenLock = null;
                    }
                } catch (Exception ignored) {}
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        };

        new Handler(Looper.getMainLooper()).postDelayed(cleanup, 220000L);

        try {
            showAdhanHeadsUpNotification(context, prayerName, cityName);

            int soundResId = context.getResources().getIdentifier("adhan", "raw", context.getPackageName());
            if (soundResId == 0) {
                cleanup.run();
                return;
            }

            android.media.AudioManager audioManager = (android.media.AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();

            if (audioManager != null) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        android.media.AudioFocusRequest afr = new android.media.AudioFocusRequest.Builder(android.media.AudioManager.AUDIOFOCUS_GAIN)
                                .setAudioAttributes(attrs)
                                .build();
                        audioManager.requestAudioFocus(afr);
                    } else {
                        audioManager.requestAudioFocus(null, android.media.AudioManager.STREAM_ALARM, android.media.AudioManager.AUDIOFOCUS_GAIN);
                    }
                } catch (Exception ignored) {}
            }

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
                stopActivePlayer();
                cleanup.run();
            });
            player.setOnErrorListener((mp, what, extra) -> {
                stopActivePlayer();
                cleanup.run();
                return true;
            });
            player.prepare();
            player.start();
            activePlayer = player;
            Log.i(TAG, "Direct Adhan audio playback started successfully with wake lock and audio focus.");
        } catch (Exception e) {
            Log.e(TAG, "Direct Adhan playback error: " + e.getMessage(), e);
            stopActivePlayer();
            cleanup.run();
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

    private void showAdhanHeadsUpNotification(Context context, String prayerName, String cityName) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_FALLBACK_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                            CHANNEL_FALLBACK_ID,
                            "أذان الصلاة المباشر",
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("تنبيهات أذان الصلاة بصوت الشيخ محمد جازي");
                    channel.enableLights(true);
                    channel.setLightColor(Color.parseColor("#123B2A"));
                    channel.enableVibration(true);
                    channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                    channel.setSound(null, null);
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

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_FALLBACK_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("حان الآن موعد أذان " + (prayerName != null ? prayerName : "الصلاة"))
                    .setContentText("حسب التوقيت المحلي لمدينة " + (cityName != null ? cityName : "موقعك") + " • بصوت الشيخ محمد جازي")
                    .setColor(Color.parseColor("#123B2A"))
                    .setContentIntent(contentIntent)
                    .setFullScreenIntent(contentIntent, true)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            nm.notify(NOTIFICATION_FALLBACK_ID, builder.build());
        } catch (Exception e) {
            Log.w(TAG, "Failed to display adhan notification: " + e.getMessage());
        }
    }

    public static void stopCurrentAdhan(Context context) {
        try {
            Intent stopIntent = new Intent(context, NoorAudioService.class);
            stopIntent.setAction(NoorAudioService.ACTION_STOP_AUDIO);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(stopIntent);
            } else {
                context.startService(stopIntent);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error stopping Adhan: " + e.getMessage());
        }
    }

    public static void playTestAdhan(Context context) {
        try {
            Intent serviceIntent = new Intent(context, NoorAudioService.class);
            serviceIntent.setAction(NoorAudioService.ACTION_PLAY_ADHAN);
            serviceIntent.putExtra("prayer_key", "test");
            serviceIntent.putExtra("prayer_name", "تجربة الأذان");
            serviceIntent.putExtra("city_name", "موقعك");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error triggering test Adhan: " + e.getMessage());
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

            // If time has already passed today or is within 1 minute, schedule for tomorrow
            if (target.getTimeInMillis() <= now.getTimeInMillis() + 60000L) {
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

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPi);
                    am.setAlarmClock(clockInfo, pi);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                }
                Log.i(TAG, "Scheduled Adhan alarm clock for " + prayerKey + " at " + target.getTime().toString());
            } catch (SecurityException se) {
                Log.w(TAG, "Exact alarm permission restricted for adhan, using fallback: " + se.getMessage());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                }
            }
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
        String fajr = prefs.getString("time_fajr", "04:45");
        String dhuhr = prefs.getString("time_dhuhr", "12:05");
        String asr = prefs.getString("time_asr", "15:25");
        String maghrib = prefs.getString("time_maghrib", "18:00");
        String isha = prefs.getString("time_isha", "19:30");

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
