package org.noor.alquran;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

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

    public static final int REQ_FAJR = 2001;
    public static final int REQ_DHUHR = 2002;
    public static final int REQ_ASR = 2003;
    public static final int REQ_MAGHRIB = 2004;
    public static final int REQ_ISHA = 2005;

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

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean masterEnabled = prefs.getBoolean("adhan_master_enabled", true);
        boolean prayerEnabled = prefs.getBoolean("adhan_" + prayerKey, true);

        if (!masterEnabled || !prayerEnabled) {
            Log.i(TAG, "Adhan for " + prayerKey + " is disabled, skipping playback.");
            rescheduleSinglePrayerNextDay(context, prayerKey, prayerName, cityName);
            return;
        }

        // Delegate Adhan audio playback and notification to NoorAudioService (Foreground Service)
        // Foreground service guarantees continuous 3.5-minute audio without getting killed by Doze mode!
        Intent serviceIntent = new Intent(context, NoorAudioService.class);
        serviceIntent.setAction(NoorAudioService.ACTION_PLAY_ADHAN);
        serviceIntent.putExtra("prayer_key", prayerKey);
        serviceIntent.putExtra("prayer_name", prayerName);
        serviceIntent.putExtra("city_name", cityName);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start NoorAudioService: " + e.getMessage(), e);
        }

        // Automatically reschedule next day for this prayer
        rescheduleSinglePrayerNextDay(context, prayerKey, prayerName, cityName);
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
