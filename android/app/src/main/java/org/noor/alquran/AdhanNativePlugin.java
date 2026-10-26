package org.noor.alquran;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AdhanNative")
public class AdhanNativePlugin extends Plugin {

    @PluginMethod
    public void scheduleAdhanAlarms(PluginCall call) {
        try {
            Context context = getContext();
            String fajr = call.getString("fajr");
            String dhuhr = call.getString("dhuhr");
            String asr = call.getString("asr");
            String maghrib = call.getString("maghrib");
            String isha = call.getString("isha");
            String cityName = call.getString("cityName", "موقعك");
            boolean masterEnabled = call.getBoolean("masterEnabled", true);

            JSObject prayersObj = call.getObject("enabledPrayers");

            SharedPreferences prefs = context.getSharedPreferences(AdhanAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor ed = prefs.edit();
            ed.putBoolean("adhan_master_enabled", masterEnabled);

            if (prayersObj != null) {
                ed.putBoolean("adhan_fajr", prayersObj.optBoolean("fajr", true));
                ed.putBoolean("adhan_dhuhr", prayersObj.optBoolean("dhuhr", true));
                ed.putBoolean("adhan_asr", prayersObj.optBoolean("asr", true));
                ed.putBoolean("adhan_maghrib", prayersObj.optBoolean("maghrib", true));
                ed.putBoolean("adhan_isha", prayersObj.optBoolean("isha", true));
            }
            ed.apply();

            if (masterEnabled) {
                AdhanAlarmReceiver.scheduleAllPrayers(context, fajr, dhuhr, asr, maghrib, isha, cityName);
            } else {
                AdhanAlarmReceiver.cancelAllAdhanAlarms(context);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to schedule Adhan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAdhanAlarms(PluginCall call) {
        try {
            AdhanAlarmReceiver.cancelAllAdhanAlarms(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to cancel Adhan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void playTestAdhan(PluginCall call) {
        try {
            AdhanAlarmReceiver.playTestAdhan(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to play test Adhan: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAdhan(PluginCall call) {
        try {
            AdhanAlarmReceiver.stopCurrentAdhan(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop Adhan: " + e.getMessage());
        }
    }
}
