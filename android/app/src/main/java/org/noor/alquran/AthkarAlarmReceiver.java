package org.noor.alquran;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

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

            // Delegate notification and audio playback to NoorAudioService (Foreground Service)
            // This guarantees Android never terminates audio mid-speech even when app is killed!
            Intent serviceIntent = new Intent(context, NoorAudioService.class);
            serviceIntent.setAction(NoorAudioService.ACTION_PLAY_THIKR);
            serviceIntent.putExtra("thikr_id", currentItem.id);
            serviceIntent.putExtra("thikr_sound", currentItem.sound);
            serviceIntent.putExtra("thikr_title", currentItem.title);
            serviceIntent.putExtra("thikr_body", currentItem.body);
            serviceIntent.putExtra("volume", volume);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            // Schedule NEXT alarm in the exact chain
            scheduleNextAlarm(context, intervalMinutes);

        } catch (Exception e) {
            Log.e(TAG, "Error executing Athkar alarm: " + e.getMessage(), e);
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

        Intent showIntent = new Intent(context, MainActivity.class);
        PendingIntent showPi = PendingIntent.getActivity(
                context,
                0,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPi);
                am.setAlarmClock(clockInfo, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
            Log.i(TAG, "Scheduled next Athkar alarm clock at: " + triggerAtMillis);
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm permission restricted, using setAndAllowWhileIdle fallback: " + se.getMessage());
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
