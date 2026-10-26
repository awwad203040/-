package org.noor.alquran;

import android.content.Context;
import android.content.SharedPreferences;
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
            int delaySeconds = call.getInt("delaySeconds", 3);
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
}
