package org.noor.alquran;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

/**
 * Perpetual Background Receiver for Salatuk Prayer Notification.
 * Guarantees that the notification:
 * 1. Stays permanently in the notification shade 24/7 like Salatuk
 * 2. Reappears instantly if swiped away (via DeleteIntent)
 * 3. Updates prayer status, time and red elapsed counter every minute automatically
 * 4. Starts automatically on device boot and app launch
 */
public class PrayerNotificationReceiver extends BroadcastReceiver {
    private static final String TAG = "PrayerNotifReceiver";

    public static final String ACTION_MINUTE_UPDATE_PRAYER_NOTIFICATION = "org.noor.alquran.ACTION_MINUTE_UPDATE_PRAYER";
    public static final String ACTION_RECREATE_PRAYER_NOTIFICATION = "org.noor.alquran.ACTION_RECREATE_PRAYER";
    public static final int REQ_CODE_TICKER = 8890;
    public static final int REQ_CODE_DELETE = 8889;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "PrayerNotificationReceiver received: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            startPerpetualPrayerNotification(context);
            return;
        }

        if (ACTION_RECREATE_PRAYER_NOTIFICATION.equals(action)) {
            // Re-post immediately if user swiped notification
            PrayerNotificationHelper.updateAndShowSalatukNotification(context);
            scheduleNextMinuteUpdate(context);
            return;
        }

        if (ACTION_MINUTE_UPDATE_PRAYER_NOTIFICATION.equals(action)) {
            PrayerNotificationHelper.updateAndShowSalatukNotification(context);
            scheduleNextMinuteUpdate(context);
        }
    }

    public static void startPerpetualPrayerNotification(Context context) {
        try {
            ScreenUnlockReceiver.ensureRegistered(context);
            PrayerNotificationHelper.updateAndShowSalatukNotification(context);
            scheduleNextMinuteUpdate(context);
        } catch (Exception e) {
            Log.e(TAG, "Error starting perpetual prayer notification: " + e.getMessage());
        }
    }

    public static void scheduleNextMinuteUpdate(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Calendar nextMin = Calendar.getInstance();
            nextMin.add(Calendar.MINUTE, 1);
            nextMin.set(Calendar.SECOND, 0);
            nextMin.set(Calendar.MILLISECOND, 0);

            long triggerAtMillis = nextMin.getTimeInMillis();

            Intent intent = new Intent(context, PrayerNotificationReceiver.class);
            intent.setAction(ACTION_MINUTE_UPDATE_PRAYER_NOTIFICATION);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    REQ_CODE_TICKER,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC, triggerAtMillis, pi);
            } else {
                am.setExact(AlarmManager.RTC, triggerAtMillis, pi);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm permission restricted for minute ticker: " + se.getMessage());
            try {
                AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Calendar nextMin = Calendar.getInstance();
                    nextMin.add(Calendar.MINUTE, 1);
                    Intent intent = new Intent(context, PrayerNotificationReceiver.class);
                    intent.setAction(ACTION_MINUTE_UPDATE_PRAYER_NOTIFICATION);
                    PendingIntent pi = PendingIntent.getBroadcast(
                            context,
                            REQ_CODE_TICKER,
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    am.set(AlarmManager.RTC, nextMin.getTimeInMillis(), pi);
                }
            } catch (Exception ignored) {}
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule next minute update: " + e.getMessage());
        }
    }
}
