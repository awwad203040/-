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
 * 1. Camera Flashlight Strobe Alert on Adhan (Zero vibration, stops immediately on Adhan completion/cancellation)
 * 2. Automatic Phone Silent Mode for 20 minutes after Adhan, with auto-restore
 */
public class PrayerFlashSilentHelper {
    private static final String TAG = "PrayerFlashSilentHelper";
    public static final String ACTION_RESTORE_RINGER = "org.noor.alquran.ACTION_RESTORE_RINGER";
    public static final int REQ_CODE_RESTORE_RINGER = 9920;

    private static volatile boolean isFlashing = false;
    private static Thread flashThread = null;

    /**
     * Continuous camera flashlight strobe for the full duration of Adhan.
     * Flashlight only - ZERO vibration.
     * Stops automatically when Adhan finishes or when stopCameraTorch is called.
     */
    public static synchronized void startAdhanFlashlight(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || context == null) return;
        if (isFlashing) return;

        isFlashing = true;
        final Context appContext = context.getApplicationContext();

        flashThread = new Thread(() -> {
            CameraManager cameraManager = null;
            String cameraId = null;
            try {
                cameraManager = (CameraManager) appContext.getSystemService(Context.CAMERA_SERVICE);
                if (cameraManager == null) {
                    isFlashing = false;
                    return;
                }

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
                    // Try any camera with flash if back-facing was not found
                    for (String id : cameraManager.getCameraIdList()) {
                        CameraCharacteristics c = cameraManager.getCameraCharacteristics(id);
                        Boolean flashAvailable = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                        if (Boolean.TRUE.equals(flashAvailable)) {
                            cameraId = id;
                            break;
                        }
                    }
                }

                if (cameraId == null) {
                    isFlashing = false;
                    return;
                }

                Log.i(TAG, "Adhan camera flashlight strobe started on camera " + cameraId);
                long startTime = System.currentTimeMillis();

                // Loop while isFlashing is true (safety timeout 255s matching Adhan duration ~245s)
                while (isFlashing && (System.currentTimeMillis() - startTime < 255000L)) {
                    try {
                        cameraManager.setTorchMode(cameraId, true);
                        Thread.sleep(450L);
                        cameraManager.setTorchMode(cameraId, false);
                        Thread.sleep(550L);
                    } catch (InterruptedException ie) {
                        break;
                    } catch (Exception e) {
                        Log.w(TAG, "Error toggling torch: " + e.getMessage());
                        break;
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Adhan flashlight execution failed: " + e.getMessage());
            } finally {
                isFlashing = false;
                if (cameraManager != null && cameraId != null) {
                    try {
                        cameraManager.setTorchMode(cameraId, false);
                    } catch (Exception ignored) {}
                }
                Log.i(TAG, "Adhan camera flashlight strobe ended.");
            }
        });
        flashThread.setName("NoorAdhanFlashThread");
        flashThread.start();
    }

    /**
     * Immediately stops camera torch strobe and turns off flashlight.
     */
    public static synchronized void stopCameraTorch(Context context) {
        isFlashing = false;
        if (flashThread != null) {
            try {
                flashThread.interrupt();
            } catch (Exception ignored) {}
            flashThread = null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && context != null) {
            try {
                CameraManager cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                if (cameraManager != null) {
                    for (String id : cameraManager.getCameraIdList()) {
                        try {
                            cameraManager.setTorchMode(id, false);
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception ignored) {}
        }
    }

    /**
     * Legacy compat strobe for short alerts
     */
    public static void flashCameraTorch(Context context, int pulseCount, long pulseDurationMs) {
        startAdhanFlashlight(context);
    }

    /**
     * Puts phone into silent mode for 20 minutes during Salah,
     * Strictly SILENT - NEVER VIBRATE.
     * Automatically restores original ringer mode after 20 minutes.
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
                        Log.i(TAG, "Phone put on silent (no vibration) for prayer.");
                    }
                } else {
                    am.setRingerMode(AudioManager.RINGER_MODE_SILENT);
                    Log.i(TAG, "Phone put on silent (no vibration) for prayer.");
                }
            } catch (SecurityException se) {
                // Policy not granted, do not alter to vibrate
                Log.w(TAG, "Notification policy access not granted, skipping ringer mode change.");
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
