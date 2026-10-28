package org.noor.alquran;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AthkarNative")
public class AthkarNativePlugin extends Plugin {
    private static final String TAG = "AthkarNativePlugin";
    private android.speech.tts.TextToSpeech nativeTts;
    private boolean isNativeTtsReady = false;

    @Override
    public void load() {
        super.load();
        initNativeTts();
    }

    private void initNativeTts() {
        try {
            Context ctx = getContext();
            if (ctx == null) return;
            nativeTts = new android.speech.tts.TextToSpeech(ctx.getApplicationContext(), status -> {
                if (status == android.speech.tts.TextToSpeech.SUCCESS && nativeTts != null) {
                    java.util.Locale arabic = new java.util.Locale("ar", "SA");
                    int res = nativeTts.setLanguage(arabic);
                    if (res == android.speech.tts.TextToSpeech.LANG_MISSING_DATA ||
                        res == android.speech.tts.TextToSpeech.LANG_NOT_SUPPORTED) {
                        nativeTts.setLanguage(new java.util.Locale("ar"));
                    }
                    isNativeTtsReady = true;
                    Log.i(TAG, "Native Arabic TextToSpeech engine initialized successfully.");
                } else {
                    Log.w(TAG, "Native TextToSpeech initialization failed: " + status);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to init native TTS: " + e.getMessage());
        }
    }

    @PluginMethod
    public void syncAthkar(PluginCall call) {
        try {
            boolean enabled = call.getBoolean("enabled", true);
            int intervalMinutes = call.getInt("intervalMinutes", 10);
            Double vol = call.getDouble("volume", 0.85);
            float volume = vol != null ? vol.floatValue() : 0.85f;
            JSArray activeAthkar = call.getArray("activeAthkar");

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(AthkarAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putBoolean("enabled", enabled);
            editor.putInt("interval_minutes", intervalMinutes);
            editor.putFloat("volume", volume);
            if (activeAthkar != null) {
                editor.putString("active_athkar", activeAthkar.toString());
            }
            editor.apply();

            Log.i(TAG, "Synced Athkar settings: enabled=" + enabled + ", interval=" + intervalMinutes + "m, volume=" + volume);

            if (enabled) {
                AthkarAlarmReceiver.scheduleNextAlarm(context, intervalMinutes);
            } else {
                AthkarAlarmReceiver.cancelAlarm(context);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to sync native athkar: " + e.getMessage(), e);
            call.reject("Failed to sync native athkar: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testTrigger(PluginCall call) {
        try {
            int delaySeconds = call.getInt("delaySeconds", 5);
            Context context = getContext();
            AthkarAlarmReceiver.scheduleAlarmAfterSeconds(context, delaySeconds);
            Log.i(TAG, "Scheduled test Athkar alarm after " + delaySeconds + " seconds.");

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error triggering test: " + e.getMessage(), e);
            call.reject("Error triggering test: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).openAppSettingsDirectly();
            } else if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getActivity().startActivity(intent);
                    } catch (Exception ignored) {}
                });
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).requestBatteryExemptionDirectly();
            } else if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getActivity().startActivity(intent);
                    } catch (Exception ignored) {}
                });
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open battery settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestAllPermissions(PluginCall call) {
        try {
            if (getActivity() instanceof MainActivity) {
                getActivity().runOnUiThread(() -> {
                    ((MainActivity) getActivity()).requestAllNecessaryPermissions();
                });
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestDirectBatteryExemption(PluginCall call) {
        try {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).requestBatteryExemptionDirectly();
            } else if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getActivity().startActivity(intent);
                    } catch (Exception ignored) {}
                });
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request battery exemption: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAutoStartSettings(PluginCall call) {
        try {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).openAutoStartDirectly();
            } else if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getActivity().startActivity(intent);
                    } catch (Exception ignored) {}
                });
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open auto-start settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openVoiceMatchSettings(PluginCall call) {
        try {
            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    Intent[] voiceIntents = new Intent[] {
                        // 1. Direct Google Voice Match Enrollment
                        new Intent("com.google.android.apps.gsa.smartsearch.VOICE_MATCH_ENROLLMENT")
                            .setPackage("com.google.android.googlequicksearchbox"),
                        // 2. Google Voice Search Settings
                        new Intent("com.google.android.googlequicksearchbox.action.VOICE_SEARCH_SETTINGS")
                            .setPackage("com.google.android.googlequicksearchbox"),
                        // 3. Android Voice Input Settings
                        new Intent(Settings.ACTION_VOICE_INPUT_SETTINGS),
                        // 4. Google Assistant / Voice Command
                        new Intent(Intent.ACTION_VOICE_COMMAND)
                    };

                    for (Intent intent : voiceIntents) {
                        try {
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            getActivity().startActivity(intent);
                            return;
                        } catch (Exception ignored) {}
                    }
                });
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open voice match settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        try {
            Context context = getContext();
            boolean notifications = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                notifications = androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            boolean exactAlarms = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                android.app.AlarmManager am = (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    exactAlarms = am.canScheduleExactAlarms();
                }
            }

            boolean batteryIgnored = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    batteryIgnored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
                }
            }

            JSObject ret = new JSObject();
            ret.put("notifications", notifications);
            ret.put("exactAlarms", exactAlarms);
            ret.put("batteryIgnored", batteryIgnored);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void speakNativeText(PluginCall call) {
        String text = call.getString("text", "");
        Double r = call.getDouble("rate", 1.0);
        Double p = call.getDouble("pitch", 1.0);
        float rate = r != null ? r.floatValue() : 1.0f;
        float pitch = p != null ? p.floatValue() : 1.0f;

        if (text == null || text.trim().isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            return;
        }

        if (nativeTts != null && isNativeTtsReady) {
            try {
                nativeTts.setSpeechRate(rate);
                nativeTts.setPitch(pitch);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    nativeTts.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null, "noor_tts_" + System.currentTimeMillis());
                } else {
                    nativeTts.speak(text, android.speech.tts.TextToSpeech.QUEUE_FLUSH, null);
                }
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                Log.e(TAG, "Failed native TTS speak: " + e.getMessage());
            }
        }

        JSObject ret = new JSObject();
        ret.put("success", false);
        ret.put("reason", "TTS not initialized yet");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopNativeSpeech(PluginCall call) {
        try {
            if (nativeTts != null) {
                nativeTts.stop();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop TTS: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (nativeTts != null) {
            try {
                nativeTts.stop();
                nativeTts.shutdown();
            } catch (Exception ignored) {}
            nativeTts = null;
        }
        super.handleOnDestroy();
    }
}
