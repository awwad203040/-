package org.noor.alquran;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * ScreenUnlockService:
 * Guaranteed Permanent Foreground Service (مثل تطبيق الشفيع تماماً).
 * Keeps process active in the background 24/7 so:
 * 1. Screen OFF, Screen ON, and USER_PRESENT are caught instantly even when app is closed / killed from Recents
 * 2. "صلي على النبي محمد" plays immediately when phone is opened/unlocked
 * 3. Anchors the ongoing Salatuk prayer notification card smoothly
 * 4. Resurrects itself automatically if killed by Android (START_STICKY + onTaskRemoved Alarm)
 */
public class ScreenUnlockService extends Service {
    private static final String TAG = "ScreenUnlockService";
    public static final String ACTION_START = "org.noor.alquran.action.START_UNLOCK_SERVICE";
    public static final String ACTION_STOP = "org.noor.alquran.action.STOP_UNLOCK_SERVICE";
    public static final String ACTION_REFRESH_NOTIF = "org.noor.alquran.action.REFRESH_UNLOCK_NOTIF";

    public static final String CHANNEL_UNLOCK_ID = "noor_unlock_salawat_service_channel_v1";
    public static final int NOTIFICATION_ID_SERVICE = 8881; // Shares the ongoing Salatuk prayer notification slot

    private static volatile boolean isServiceRunning = false;
    private static volatile boolean wasScreenOff = true;
    private static long lastTriggerTime = 0L;
    private static final long COOLDOWN_MS = 5000L; // 5 seconds cooldown

    private BroadcastReceiver screenStateReceiver = null;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable tickerRunnable = null;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "ScreenUnlockService onCreate initialized.");
        isServiceRunning = true;
        createNotificationChannel();
        startInForeground();
        registerScreenStateReceiver();
        startMinuteTicker();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        isServiceRunning = true;
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopForegroundService();
                return START_NOT_STICKY;
            }
            if (ACTION_REFRESH_NOTIF.equals(action)) {
                updateForegroundNotification();
            }
        }

        startInForeground();
        registerScreenStateReceiver();
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel channel = nm.getNotificationChannel(CHANNEL_UNLOCK_ID);
        if (channel == null) {
            channel = new NotificationChannel(
                    CHANNEL_UNLOCK_ID,
                    "خدمة نور القرآن الدائمة (الصلاة على النبي ومواقيت الصلاة)",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("تشغيل صوت الصلاة على النبي عند فتح الجوال وعرض مواقيت الصلاة الدائمة في شريط الإشعارات");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }

    private void startInForeground() {
        try {
            Notification notif = buildServiceNotification();
            startForeground(NOTIFICATION_ID_SERVICE, notif);
        } catch (Exception e) {
            Log.e(TAG, "startForeground error: " + e.getMessage(), e);
        }
    }

    private void updateForegroundNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID_SERVICE, buildServiceNotification());
            }
        } catch (Exception ignored) {}
    }

    private Notification buildServiceNotification() {
        try {
            // First check if we can display the beautiful Salatuk prayer notification card
            PrayerNotificationHelper.ensureChannels(this);
            PrayerNotificationHelper.ActivePrayerInfo info = PrayerNotificationHelper.calculateCurrentActivePrayer(this);
            if (info != null) {
                return PrayerNotificationHelper.buildSalatukNotification(
                        this,
                        info.prayerName,
                        info.prayerTime12,
                        info.cityName,
                        info.hijriDate,
                        info.timerText,
                        info.nextPrayerName,
                        info.nextPrayerTime12,
                        false
                );
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not build Salatuk card for service: " + e.getMessage());
        }

        // Fallback elegant notification for the unlock service
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
                this,
                940,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_UNLOCK_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("نور القرآن 📿 • الصلاة على النبي محمد")
                .setContentText("الصوت نشط تلقائياً عند فتح وتشغيل شاشة الجوال (مثل الشفيع)")
                .setColor(Color.parseColor("#123B2A"))
                .setContentIntent(openPi)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setShowWhen(false);

        android.graphics.Bitmap icon = PrayerNotificationHelper.getSalatukMosqueIcon(this);
        if (icon != null) {
            builder.setLargeIcon(icon);
        }

        return builder.build();
    }

    private synchronized void registerScreenStateReceiver() {
        if (screenStateReceiver != null) return;
        try {
            screenStateReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    String action = intent.getAction();
                    Log.i(TAG, "Screen event received in ScreenUnlockService: " + action);

                    // 1. Phone was locked / closed / screen off
                    if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                        wasScreenOff = true;
                        Log.d(TAG, "Screen turned OFF. Ready for unlock trigger.");
                        return;
                    }

                    // 2. Phone was opened / turned on / unlocked
                    if (Intent.ACTION_USER_PRESENT.equals(action) || Intent.ACTION_SCREEN_ON.equals(action)) {
                        long now = System.currentTimeMillis();
                        if (now - lastTriggerTime < COOLDOWN_MS) {
                            Log.d(TAG, "Unlock Salawat skipped due to cooldown (" + (now - lastTriggerTime) + "ms)");
                            return;
                        }

                        // Trigger if screen was actually closed/off or on USER_PRESENT
                        if (wasScreenOff || Intent.ACTION_USER_PRESENT.equals(action)) {
                            wasScreenOff = false;
                            lastTriggerTime = now;
                            Log.i(TAG, "Executing 'صلي على النبي محمد' via ScreenUnlockService!");
                            ScreenUnlockReceiver.playSalawatDirect(getApplicationContext());
                        }
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            registerReceiver(screenStateReceiver, filter);
            Log.i(TAG, "Dynamic screenStateReceiver successfully registered inside ScreenUnlockService.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register screenStateReceiver: " + e.getMessage(), e);
        }
    }

    private synchronized void unregisterScreenStateReceiver() {
        if (screenStateReceiver != null) {
            try {
                unregisterReceiver(screenStateReceiver);
            } catch (Exception ignored) {}
            screenStateReceiver = null;
        }
    }

    private void startMinuteTicker() {
        stopMinuteTicker();
        tickerRunnable = new Runnable() {
            @Override
            public void run() {
                updateForegroundNotification();
                handler.postDelayed(this, 60000L); // Update prayer bar every 60s
            }
        };
        handler.postDelayed(tickerRunnable, 60000L);
    }

    private void stopMinuteTicker() {
        if (tickerRunnable != null) {
            handler.removeCallbacks(tickerRunnable);
            tickerRunnable = null;
        }
    }

    private void stopForegroundService() {
        isServiceRunning = false;
        stopMinuteTicker();
        unregisterScreenStateReceiver();
        try {
            stopForeground(true);
        } catch (Exception ignored) {}
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.i(TAG, "App task removed (swiped from Recents). Resurrecting ScreenUnlockService...");
        // Auto-resurrect service via AlarmManager so background unlock audio never stops
        try {
            Intent restartIntent = new Intent(getApplicationContext(), ScreenUnlockService.class);
            restartIntent.setAction(ACTION_START);
            restartIntent.setPackage(getPackageName());
            PendingIntent pi = PendingIntent.getService(
                    getApplicationContext(),
                    991,
                    restartIntent,
                    PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );
            AlarmManager am = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                long triggerAt = SystemClock.elapsedRealtime() + 1000L;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                } else {
                    am.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "onTaskRemoved restart schedule failed: " + e.getMessage());
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "ScreenUnlockService onDestroy called.");
        isServiceRunning = false;
        stopMinuteTicker();
        unregisterScreenStateReceiver();

        // If unlock salawat is enabled in preferences, auto-restart service
        if (ScreenUnlockReceiver.isEnabled(this)) {
            try {
                Intent restartIntent = new Intent(getApplicationContext(), ScreenUnlockService.class);
                restartIntent.setAction(ACTION_START);
                restartIntent.setPackage(getPackageName());
                PendingIntent pi = PendingIntent.getService(
                        getApplicationContext(),
                        992,
                        restartIntent,
                        PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
                );
                AlarmManager am = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + 1500L, pi);
                }
            } catch (Exception ignored) {}
        }

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static void startService(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, ScreenUnlockService.class);
            intent.setAction(ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "ScreenUnlockService started successfully.");
        } catch (Exception e) {
            Log.w(TAG, "Could not start ScreenUnlockService: " + e.getMessage());
        }
    }

    public static void stopService(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, ScreenUnlockService.class);
            intent.setAction(ACTION_STOP);
            context.startService(intent);
        } catch (Exception ignored) {}
    }

    public static void refreshNotification(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, ScreenUnlockService.class);
            intent.setAction(ACTION_REFRESH_NOTIF);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception ignored) {}
    }

    public static boolean isRunning() {
        return isServiceRunning;
    }
}
