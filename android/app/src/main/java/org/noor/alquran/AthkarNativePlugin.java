package org.noor.alquran;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.app.Activity;
import android.content.ComponentName;
import android.content.pm.ResolveInfo;
import android.os.Handler;
import android.os.Looper;
import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "AthkarNative",
    permissions = {
        @Permission(
            alias = "recordAudio",
            strings = { android.Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class AthkarNativePlugin extends Plugin {
    private static final String TAG = "AthkarNativePlugin";
    public static volatile boolean pendingVoiceLaunch = false;
    public static volatile String pendingVoiceQuery = "";

    private TextToSpeech nativeTts;
    private boolean isNativeTtsReady = false;
    private String pendingSpeechText = null;
    private float pendingRate = 1.0f;
    private float pendingPitch = 1.0f;

    private SpeechRecognizer speechRecognizer;
    private boolean isSpeechListening = false;
    private Handler speechWatchdogHandler = null;
    private Runnable speechWatchdogRunnable = null;
    private boolean hasReceivedSpeechAudio = false;

    @PluginMethod
    public void consumeVoiceLaunch(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isVoiceLaunch", pendingVoiceLaunch);
        ret.put("query", pendingVoiceQuery != null ? pendingVoiceQuery : "");
        Log.i(TAG, "consumeVoiceLaunch called. Returning isVoiceLaunch=" + pendingVoiceLaunch + ", query=" + pendingVoiceQuery);
        pendingVoiceLaunch = false;
        pendingVoiceQuery = "";
        call.resolve(ret);
    }

    @Override
    public void load() {
        super.load();
        initNativeTts();
    }

    private void initNativeTts() {
        try {
            Context ctx = getContext();
            if (ctx == null) return;

            String preferredEngine = null;
            try {
                android.content.pm.PackageManager pm = ctx.getPackageManager();
                pm.getPackageInfo("com.google.android.tts", 0);
                preferredEngine = "com.google.android.tts";
            } catch (Exception ignored) {}

            TextToSpeech.OnInitListener initListener = status -> {
                if (status == TextToSpeech.SUCCESS && nativeTts != null) {
                    Locale saudi = new Locale("ar", "SA");
                    int res = nativeTts.isLanguageAvailable(saudi);
                    if (res >= TextToSpeech.LANG_AVAILABLE) {
                        nativeTts.setLanguage(saudi);
                    } else {
                        Locale generalArabic = new Locale("ar");
                        if (nativeTts.isLanguageAvailable(generalArabic) >= TextToSpeech.LANG_AVAILABLE) {
                            nativeTts.setLanguage(generalArabic);
                        } else {
                            nativeTts.setLanguage(Locale.getDefault());
                        }
                    }
                    isNativeTtsReady = true;
                    Log.i(TAG, "Native Arabic TextToSpeech engine initialized successfully.");

                    if (pendingSpeechText != null && !pendingSpeechText.isEmpty()) {
                        final String toSpeak = pendingSpeechText;
                        final float rate = pendingRate;
                        final float pitch = pendingPitch;
                        pendingSpeechText = null;
                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> doNativeSpeak(toSpeak, rate, pitch));
                        }
                    }
                } else {
                    Log.w(TAG, "Native TextToSpeech initialization failed: " + status);
                }
            };

            if (preferredEngine != null) {
                nativeTts = new TextToSpeech(ctx.getApplicationContext(), initListener, preferredEngine);
            } else {
                nativeTts = new TextToSpeech(ctx.getApplicationContext(), initListener);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to init native TTS: " + e.getMessage());
        }
    }

    private boolean doNativeSpeak(String text, float rate, float pitch) {
        if (nativeTts == null || !isNativeTtsReady) return false;
        try {
            nativeTts.setSpeechRate(rate);
            nativeTts.setPitch(pitch);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                nativeTts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "noor_tts_" + System.currentTimeMillis());
            } else {
                nativeTts.speak(text, TextToSpeech.QUEUE_FLUSH, null);
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "doNativeSpeak error: " + e.getMessage());
            return false;
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
                    Intent launchGoogleApp = null;
                    try {
                        if (getContext() != null) {
                            launchGoogleApp = getContext().getPackageManager().getLaunchIntentForPackage("com.google.android.googlequicksearchbox");
                        }
                    } catch (Exception ignored) {}

                    Intent[] voiceIntents = new Intent[] {
                        // 1. Direct Google Assistant Deep Link
                        new Intent(Intent.ACTION_VIEW, Uri.parse("googleapp://assistant/settings")),
                        // 2. Direct Google Voice Match Enrollment
                        new Intent("com.google.android.apps.gsa.smartsearch.VOICE_MATCH_ENROLLMENT")
                            .setPackage("com.google.android.googlequicksearchbox"),
                        // 3. Google Assistant Settings Component
                        new Intent().setComponent(new android.content.ComponentName("com.google.android.googlequicksearchbox", "com.google.android.apps.gsa.assistant.settings.AssistantSettingsActivity")),
                        // 4. Google Voice Search Settings
                        new Intent("com.google.android.googlequicksearchbox.action.VOICE_SEARCH_SETTINGS")
                            .setPackage("com.google.android.googlequicksearchbox"),
                        // 5. Open Google App directly
                        launchGoogleApp,
                        // 6. Android Voice Input Settings
                        new Intent(Settings.ACTION_VOICE_INPUT_SETTINGS),
                        // 7. Google Assistant / Voice Command
                        new Intent(Intent.ACTION_VOICE_COMMAND)
                    };

                    for (Intent intent : voiceIntents) {
                        if (intent == null) continue;
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

        if (nativeTts == null) {
            initNativeTts();
        }

        if (nativeTts != null && isNativeTtsReady) {
            boolean ok = doNativeSpeak(text, rate, pitch);
            JSObject ret = new JSObject();
            ret.put("success", ok);
            call.resolve(ret);
            return;
        }

        // Queue pending text if TTS is still initializing, so user speech is never missed
        pendingSpeechText = text;
        pendingRate = rate;
        pendingPitch = pitch;

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("queued", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopNativeSpeech(PluginCall call) {
        pendingSpeechText = null;
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

    @PluginMethod
    public void checkAudioPermission(PluginCall call) {
        Context context = getContext();
        if (context == null && getActivity() != null) {
            context = getActivity().getApplicationContext();
        }
        boolean granted = context != null && ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED;

        Log.i(TAG, "checkAudioPermission evaluated: " + granted);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        Context context = getContext();
        if (context == null && getActivity() != null) {
            context = getActivity().getApplicationContext();
        }
        if (context != null && ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias("recordAudio", call, "audioPermissionCallback");
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        Context context = getContext();
        if (context == null && getActivity() != null) {
            context = getActivity().getApplicationContext();
        }
        boolean granted = context != null && ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED;

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void startSpeechRecognition(final PluginCall call) {
        final Context context = getContext();
        if (context == null) {
            call.reject("Context is null");
            return;
        }

        // 1. Check RECORD_AUDIO permission
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.RECORD_AUDIO)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("recordAudio", call, "audioPermissionCallbackForStart");
            return;
        }

        executeSpeechRecognition(call);
    }

    @PermissionCallback
    private void audioPermissionCallbackForStart(PluginCall call) {
        Context context = getContext();
        if (context != null && ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            executeSpeechRecognition(call);
        } else {
            JSObject errObj = new JSObject();
            errObj.put("error", "permission_denied");
            errObj.put("message", "يرجى السماح بصلاحية الميكروفون لاستخدام المساعد الصوتي");
            notifyListeners("onSpeechError", errObj);

            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", "permission_denied");
            call.resolve(ret);
        }
    }

    private void executeSpeechRecognition(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.reject("Activity is not available");
            return;
        }

        // Stop any active TTS so the microphone doesn't capture the app's own voice
        try {
            if (nativeTts != null) {
                nativeTts.stop();
            }
        } catch (Exception ignored) {}

        final String lang = call.getString("language", "ar-SA");
        final boolean forceDialog = call.getBoolean("forceDialog", false);

        // If explicitly requested, use Google system dialog directly
        if (forceDialog) {
            Log.i(TAG, "forceDialog requested. Launching native Google speech dialog directly.");
            launchSpeechIntentFallback(call, lang);
            return;
        }

        boolean isServiceAvailable = false;
        try {
            isServiceAvailable = SpeechRecognizer.isRecognitionAvailable(activity);
        } catch (Exception ignored) {}

        if (!isServiceAvailable) {
            Log.i(TAG, "SpeechRecognizer service not available, launching system speech intent fallback.");
            launchSpeechIntentFallback(call, lang);
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                    speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                }

                if (speechRecognizer != null) {
                    try {
                        speechRecognizer.destroy();
                    } catch (Exception ignored) {}
                    speechRecognizer = null;
                }

                hasReceivedSpeechAudio = false;

                // Priority: Google's dedicated Speech Recognition Service
                ComponentName googleService = new ComponentName(
                    "com.google.android.googlequicksearchbox",
                    "com.google.android.voicesearch.serviceapi.GoogleRecognitionService"
                );
                boolean hasGoogle = false;
                try {
                    Intent testIntent = new Intent("android.speech.RecognitionService");
                    testIntent.setComponent(googleService);
                    List<ResolveInfo> list = activity.getPackageManager().queryIntentServices(testIntent, 0);
                    hasGoogle = (list != null && !list.isEmpty());
                } catch (Exception ignored) {}

                if (hasGoogle) {
                    try {
                        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(activity, googleService);
                        Log.i(TAG, "SpeechRecognizer bound to Google RecognitionService");
                    } catch (Exception e) {
                        Log.w(TAG, "Binding to Google service failed, using default Activity recognizer", e);
                        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(activity);
                    }
                } else {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(activity);
                }

                if (speechRecognizer == null) {
                    Log.i(TAG, "SpeechRecognizer is null, falling back to intent dialog.");
                    launchSpeechIntentFallback(call, lang);
                    return;
                }

                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        isSpeechListening = true;
                        Log.i(TAG, "SpeechRecognizer: onReadyForSpeech");
                        JSObject data = new JSObject();
                        data.put("status", "ready");
                        notifyListeners("onSpeechStart", data);

                        // Start 3.8s watchdog: if no speech is detected, automatically switch to Google dialog!
                        if (speechWatchdogHandler == null) {
                            speechWatchdogHandler = new Handler(Looper.getMainLooper());
                        }
                        speechWatchdogRunnable = () -> {
                            if (isSpeechListening && !hasReceivedSpeechAudio) {
                                Log.i(TAG, "SpeechRecognizer watchdog: silence detected. Switching to Google speech dialog fallback.");
                                try {
                                    if (speechRecognizer != null) {
                                        speechRecognizer.destroy();
                                        speechRecognizer = null;
                                    }
                                } catch (Exception ignored) {}
                                isSpeechListening = false;
                                launchSpeechIntentFallback(call, lang);
                            }
                        };
                        speechWatchdogHandler.postDelayed(speechWatchdogRunnable, 3800);
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                        hasReceivedSpeechAudio = true;
                        Log.i(TAG, "SpeechRecognizer: onBeginningOfSpeech");
                        if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                            speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                        }
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {
                        if (rmsdB > 2.0f) {
                            hasReceivedSpeechAudio = true;
                            if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                                speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                            }
                        }
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {
                        Log.i(TAG, "SpeechRecognizer: onEndOfSpeech");
                        isSpeechListening = false;
                        if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                            speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                        }
                        JSObject data = new JSObject();
                        data.put("status", "processing");
                        notifyListeners("onSpeechEnd", data);
                    }

                    @Override
                    public void onError(int error) {
                        isSpeechListening = false;
                        Log.w(TAG, "SpeechRecognizer onError: " + error);
                        if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                            speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                        }

                        // On recognition error (e.g. no match, timeout, recognizer busy), smoothly trigger system speech dialog!
                        if (error == SpeechRecognizer.ERROR_NO_MATCH ||
                            error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ||
                            error == SpeechRecognizer.ERROR_CLIENT ||
                            error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ||
                            error == SpeechRecognizer.ERROR_AUDIO) {
                            Log.i(TAG, "Auto-recovering via speech intent dialog after error " + error);
                            try {
                                if (speechRecognizer != null) {
                                    speechRecognizer.destroy();
                                    speechRecognizer = null;
                                }
                            } catch (Exception ignored) {}
                            launchSpeechIntentFallback(call, lang);
                            return;
                        }

                        String errorMsg = "حدث خطأ أثناء الاستماع";
                        switch (error) {
                            case SpeechRecognizer.ERROR_NETWORK:
                            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                                errorMsg = "يرجى التحقق من اتصال الإنترنت لاستخدام المساعد الصوتي";
                                break;
                            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                                errorMsg = "يرجى السماح بصلاحية الميكروفون لتشغيل المساعد الصوتي";
                                break;
                        }

                        JSObject errObj = new JSObject();
                        errObj.put("error", "code_" + error);
                        errObj.put("code", error);
                        errObj.put("message", errorMsg);
                        notifyListeners("onSpeechError", errObj);
                    }

                    @Override
                    public void onResults(Bundle results) {
                        isSpeechListening = false;
                        if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                            speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                        }

                        ArrayList<String> matches = results != null ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
                        String text = "";
                        JSArray matchesArray = new JSArray();
                        if (matches != null && !matches.isEmpty()) {
                            text = matches.get(0);
                            for (String m : matches) {
                                matchesArray.put(m);
                            }
                        }
                        Log.i(TAG, "SpeechRecognizer onResults: " + text);

                        if (text.trim().isEmpty()) {
                            Log.i(TAG, "Empty results, launching speech dialog fallback");
                            launchSpeechIntentFallback(call, lang);
                            return;
                        }

                        JSObject ret = new JSObject();
                        ret.put("text", text);
                        ret.put("matches", matchesArray);
                        notifyListeners("onSpeechResult", ret);
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults != null ? partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
                        if (matches != null && !matches.isEmpty()) {
                            String partialText = matches.get(0);
                            JSObject ret = new JSObject();
                            ret.put("text", partialText);
                            notifyListeners("onSpeechPartial", ret);
                        }
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
                intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, false);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 5000L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L);

                speechRecognizer.startListening(intent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Failed in-app SpeechRecognizer, falling back to intent dialog: " + e.getMessage());
                launchSpeechIntentFallback(call, lang);
            }
        });
    }

    private void launchSpeechIntentFallback(final PluginCall call, final String lang) {
        final Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            if (call != null) call.reject("Activity is null");
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
                    speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
                }

                if (speechRecognizer != null) {
                    try {
                        speechRecognizer.destroy();
                    } catch (Exception ignored) {}
                    speechRecognizer = null;
                }
                isSpeechListening = false;

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang != null ? lang : "ar-SA");
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang != null ? lang : "ar-SA");
                intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "انطق اسم السورة (مثل: سورة الكهف)");
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);

                startActivityForResult(call, intent, "speechIntentResult");

                JSObject data = new JSObject();
                data.put("status", "ready");
                notifyListeners("onSpeechStart", data);
            } catch (Exception ex) {
                Log.e(TAG, "Failed to launch speech intent fallback: " + ex.getMessage(), ex);
                JSObject errObj = new JSObject();
                errObj.put("error", "not_supported");
                errObj.put("message", "تعذر تشغيل المساعد الصوتي، يرجى تفعيل تطبيق Google بهاتفك");
                notifyListeners("onSpeechError", errObj);

                if (call != null) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("reason", ex.getMessage());
                    call.resolve(ret);
                }
            }
        });
    }

    @ActivityCallback
    private void speechIntentResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            String text = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
            JSArray matchesArray = new JSArray();
            if (matches != null) {
                for (String m : matches) {
                    matchesArray.put(m);
                }
            }
            Log.i(TAG, "speechIntentResult success: " + text);

            JSObject ret = new JSObject();
            ret.put("text", text);
            ret.put("matches", matchesArray);
            notifyListeners("onSpeechResult", ret);

            if (call != null) {
                call.resolve(ret);
            }
        } else {
            Log.i(TAG, "speechIntentResult cancelled or no result");
            JSObject ret = new JSObject();
            ret.put("message", "تم إيقاف الاستماع");
            notifyListeners("onSpeechEnd", ret);
            if (call != null) {
                JSObject cancelObj = new JSObject();
                cancelObj.put("success", false);
                cancelObj.put("cancelled", true);
                call.resolve(cancelObj);
            }
        }
    }

    @PluginMethod
    public void stopSpeechRecognition(final PluginCall call) {
        if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
            speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
        }
        if (getActivity() != null) {
            getActivity().runOnUiThread(() -> {
                try {
                    if (speechRecognizer != null) {
                        speechRecognizer.stopListening();
                        speechRecognizer.destroy();
                        speechRecognizer = null;
                    }
                    isSpeechListening = false;
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Failed to stop SpeechRecognizer: " + e.getMessage());
                }
            });
        } else {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (speechWatchdogHandler != null && speechWatchdogRunnable != null) {
            speechWatchdogHandler.removeCallbacks(speechWatchdogRunnable);
        }
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {}
            speechRecognizer = null;
        }
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
