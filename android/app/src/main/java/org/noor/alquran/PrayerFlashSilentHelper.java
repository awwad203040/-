package org.noor.alquran;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.os.Build;
import android.util.Log;

/**
 * Helper to handle:
 * 1. Camera Flashlight Strobe Alert on Adhan
 * 2. Automatic Phone Silent Mode for 20 minutes after Adhan, with auto-restore
 */
public class PrayerFlashSilentHelper {
    private static final String TAG = "PrayerFlashSilentHelper";
    public static final String ACTION_RESTORE_RINGER = "org.noor.alquran.ACTION_RESTORE_RINGER";
    public static final int REQ_CODE_RESTORE_RINGER = 9920;
    private static volatile boolean isFlashing = false;

    /**
     * Strobe flashes the camera LED torch when Adhan starts
     */
    public static void flashCameraTorch(Context context, int pulseCount, long pulseDurationMs) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        if (context == null || isFlashing) return;

        new Thread(() -> {
            isFlashing = true;
            try {
                CameraManager cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                if (cameraManager == null) {
                    isFlashing = false;
                    return;
                }
                String cameraId = null;
                for (String id : cameraManager.getCameraIdList()) {
                    CameraCharacteristics c = cameraManager.getCameraCharacteristics(id);
                    Boolean flashAvailable = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                    Integer facing = c.get(CameraCharacteristics.LENS_FACING);
                    if (Boolean.TRUE.equals(flashAvailable) && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                        cameraId = id;
                        break;
                    }
                }
                if (cameraId == null) {
                    isFlashing = false;
                    return;
                }

                for (int i = 0; i < pulseCount; i++) {
                    try {
                        cameraManager.setTorchMode(cameraId, true);
                        Thread.sleep(pulseDurationMs);
                        cameraManager.setTorchMode(cameraId, false);
                        Thread.sleep(pulseDurationMs);
                    } catch (Exception ignored) {
                        break;
                    }
                }
                try {
                    cameraManager.setTorchMode(cameraId, false);
                } catch (Exception ignored) {}
            } catch (Exception e) {
                Log.w(TAG, "Camera flash strobe failed: " + e.getMessage());
            } finally {
                isFlashing = false;
            }
        }).start();
    }

    /**
     * Puts phone into silent / vibrate mode for 20 minutes during Salah,
     * and automatically restores original ringer mode after 20 minutes.
     */
    public static void setSilentModeForPrayer(Context context, int durationMinutes) {
        if (context == null) return;
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;

            int originalMode = am.getRingerMode();
            // Save original mode in prefs
            context.getSharedPreferences("NoorSilentPrefs", Context.MODE_PRIVATE)
                    .edit()
                    .putInt("original_ringer_mode", originalMode)
                    .putLong("silent_start_time", System.currentTimeMillis())
                    .apply();

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null && nm.isNotificationPolicyAccessGranted()) {
                        am.setRingerMode(AudioManager.RINGER_MODE_SILENT);
                    } else {
                        am.setRingerMode(AudioManager.RINGER_MODE_VIBRATE);
                    }
                } else {
                    am.setRingerMode(AudioManager.RINGER_MODE_SILENT);
                }
                Log.i(TAG, "Phone put on silent/vibrate for 20 minutes of prayer.");
            } catch (SecurityException se) {
                try {
                    am.setRingerMode(AudioManager.RINGER_MODE_VIBRATE);
                } catch (Exception ignored) {}
            }

            // Schedule restore in 20 minutes
            scheduleRingerRestoreAlarm(context, durationMinutes * 60 * 1000L);
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable prayer silent mode: " + e.getMessage());
        }
    }

    /**
     * Restores phone to its original ringer mode prior to prayer
     */
    public static void restoreRingerMode(Context context) {
        if (context == null) return;
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;

            int originalMode = context.getSharedPreferences("NoorSilentPrefs", Context.MODE_PRIVATE)
                    .getInt("original_ringer_mode", AudioManager.RINGER_MODE_NORMAL);

            try {
                am.setRingerMode(originalMode);
                Log.i(TAG, "Phone ringer mode successfully restored to: " + originalMode);
            } catch (Exception e) {
                Log.w(TAG, "Failed to restore ringer mode: " + e.getMessage());
            }
        } catch (Exception ignored) {}
    }

    public static void scheduleRingerRestoreAlarm(Context context, long delayMs) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, AdhanAlarmReceiver.class);
            intent.setAction(ACTION_RESTORE_RINGER);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    REQ_CODE_RESTORE_RINGER,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            long triggerTime = System.currentTimeMillis() + delayMs;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pi);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not schedule exact alarm for ringer restore: " + e.getMessage());
        }
    }
}
