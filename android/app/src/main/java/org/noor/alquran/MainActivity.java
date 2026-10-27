package org.noor.alquran;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int PERMISSION_REQ_CORE = 100;
    private static final String PREFS_PERMS = "noor_permissions_prefs";

    private boolean requestedExactAlarmThisSession = false;
    private boolean requestedBatteryExemptionThisSession = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AthkarNativePlugin.class);
        registerPlugin(AdhanNativePlugin.class);
        super.onCreate(savedInstanceState);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(
                        android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                        android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                );
            }
        } catch (Exception ignored) {}

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                android.webkit.WebSettings ws = getBridge().getWebView().getSettings();
                ws.setGeolocationEnabled(true);
                ws.setTextZoom(100);
                ws.setUseWideViewPort(true);
                ws.setLoadWithOverviewMode(true);
                ws.setSupportZoom(false);
            }
        } catch (Exception ignored) {}

        // Pre-arm alarms immediately on startup so closed-app alerts work from first launch
        AthkarAlarmReceiver.ensureScheduledOnStartup(this);
        AdhanAlarmReceiver.rescheduleFromPrefs(this);

        // Automatically initiate permissions onboarding flow (Notifications + GPS Location)
        requestAllNecessaryPermissions();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Continue permissions flow if user just returned from system settings
        checkAndPromptNextPermission();
    }

    public void requestAllNecessaryPermissions() {
        java.util.List<String> neededPermissions = new java.util.ArrayList<>();

        // 1. Notification Permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                neededPermissions.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }

        // 2. Location Permissions for Automatic GPS Prayer Times
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            neededPermissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
            neededPermissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }

        if (!neededPermissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, neededPermissions.toArray(new String[0]), PERMISSION_REQ_CORE);
            return;
        }

        // If core permissions already granted, check exact alarms and battery
        checkAndPromptNextPermission();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQ_CORE) {
            Log.i(TAG, "Core permissions result received.");
            checkAndPromptNextPermission();
        }
    }

    private void checkAndPromptNextPermission() {
        // Step 2: Exact Alarm Permission (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !requestedExactAlarmThisSession) {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am != null && !am.canScheduleExactAlarms()) {
                requestedExactAlarmThisSession = true;
                try {
                    Toast.makeText(this, "يرجى تفعيل صلاحية (المنبهات الدقيقة) لضمان انطلاق الأذان والأذكار في موعدها", Toast.LENGTH_LONG).show();
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return;
                } catch (Exception e) {
                    Log.w(TAG, "Failed to launch ACTION_REQUEST_SCHEDULE_EXACT_ALARM: " + e.getMessage());
                }
            }
        }

        // Step 3: Battery Optimization Exemption (Android 6.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !requestedBatteryExemptionThisSession) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                requestedBatteryExemptionThisSession = true;
                requestBatteryExemptionDirectly();
            }
        }
    }

    public void requestBatteryExemptionDirectly() {
        runOnUiThread(() -> {
            try {
                Toast.makeText(this, "جاري فتح نافذة استثناء البطارية...", Toast.LENGTH_SHORT).show();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    boolean isIgnoring = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
                    if (!isIgnoring) {
                        try {
                            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return;
                        } catch (Exception e1) {
                            Log.w(TAG, "Direct ignore battery prompt failed: " + e1.getMessage());
                        }
                    }
                    try {
                        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return;
                    } catch (Exception e2) {
                        Log.w(TAG, "Battery settings list failed: " + e2.getMessage());
                    }
                }
                openAppSettingsDirectly();
            } catch (Exception e) {
                Log.e(TAG, "Error opening battery settings: " + e.getMessage());
            }
        });
    }

    public void openAutoStartDirectly() {
        runOnUiThread(() -> {
            try {
                Toast.makeText(this, "جاري فتح إدارة التشغيل التلقائي بالجوال...", Toast.LENGTH_SHORT).show();
                String pkg = getPackageName();

                Intent[] autoStartIntents = new Intent[] {
                    // Xiaomi / Redmi / POCO (MIUI / HyperOS)
                    new Intent().setComponent(new android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")),
                    // Huawei / Honor
                    new Intent().setComponent(new android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")),
                    // Samsung (Device Care / Smart Manager / Battery)
                    new Intent().setComponent(new android.content.ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.samsung.android.sm_cn", "com.samsung.android.sm.ui.battery.BatteryActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")),
                    // Oppo / Realme (ColorOS)
                    new Intent().setComponent(new android.content.ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")),
                    // Vivo / iQOO
                    new Intent().setComponent(new android.content.ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")),
                    new Intent().setComponent(new android.content.ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")),
                    new Intent().setComponent(new android.content.ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
                    // OnePlus
                    new Intent().setComponent(new android.content.ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity")),
                    // Transsion / Tecno / Infinix
                    new Intent().setComponent(new android.content.ComponentName("com.transsion.phonemanager", "com.transsion.phonemanager.settings.AutoBootManageActivity")),
                    // ASUS
                    new Intent().setComponent(new android.content.ComponentName("com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity"))
                };

                for (Intent intent : autoStartIntents) {
                    try {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return;
                    } catch (Exception ignored) {}
                }

                openAppSettingsDirectly();
            } catch (Exception e) {
                Log.e(TAG, "Error opening autostart settings: " + e.getMessage());
            }
        });
    }

    public void openAppSettingsDirectly() {
        runOnUiThread(() -> {
            try {
                Toast.makeText(this, "جاري فتح معلومات التطبيق في إعدادات الجوال...", Toast.LENGTH_SHORT).show();
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception ignored) {}
            }
        });
    }
}
