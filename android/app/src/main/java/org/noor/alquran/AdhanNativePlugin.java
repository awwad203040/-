package org.noor.alquran;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.Locale;

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

    @PluginMethod
    public void getDeviceLocation(PluginCall call) {
        Context context = getContext();
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

            if (getActivity() != null) {
                ActivityCompat.requestPermissions(getActivity(), new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                }, 100);
            }

            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "PERMISSION_DENIED");
            call.resolve(ret);
            return;
        }

        try {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "LOCATION_SERVICE_UNAVAILABLE");
                call.resolve(ret);
                return;
            }

            Location bestLocation = null;
            List<String> providers = lm.getProviders(true);
            for (String provider : providers) {
                try {
                    Location l = lm.getLastKnownLocation(provider);
                    if (l == null) continue;
                    if (bestLocation == null || l.getAccuracy() < bestLocation.getAccuracy()) {
                        bestLocation = l;
                    }
                } catch (SecurityException ignored) {}
            }

            if (bestLocation != null) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("latitude", bestLocation.getLatitude());
                ret.put("longitude", bestLocation.getLongitude());
                ret.put("accuracy", (double) bestLocation.getAccuracy());

                try {
                    Geocoder geocoder = new Geocoder(context, new Locale("ar"));
                    List<Address> addresses = geocoder.getFromLocation(bestLocation.getLatitude(), bestLocation.getLongitude(), 1);
                    if (addresses != null && !addresses.isEmpty()) {
                        Address addr = addresses.get(0);
                        String city = addr.getLocality();
                        if (city == null) city = addr.getSubAdminArea();
                        if (city == null) city = addr.getAdminArea();
                        if (city != null) ret.put("cityName", city);
                    }
                } catch (Exception ignored) {}

                call.resolve(ret);
                return;
            }

            String providerToUse = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                    ? LocationManager.NETWORK_PROVIDER
                    : LocationManager.GPS_PROVIDER;

            LocationListener listener = new LocationListener() {
                @Override
                public void onLocationChanged(Location location) {
                    try {
                        lm.removeUpdates(this);
                    } catch (SecurityException ignored) {}

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("latitude", location.getLatitude());
                    ret.put("longitude", location.getLongitude());
                    ret.put("accuracy", (double) location.getAccuracy());

                    try {
                        Geocoder geocoder = new Geocoder(context, new Locale("ar"));
                        List<Address> addresses = geocoder.getFromLocation(location.getLatitude(), location.getLongitude(), 1);
                        if (addresses != null && !addresses.isEmpty()) {
                            Address addr = addresses.get(0);
                            String city = addr.getLocality();
                            if (city == null) city = addr.getSubAdminArea();
                            if (city == null) city = addr.getAdminArea();
                            if (city != null) ret.put("cityName", city);
                        }
                    } catch (Exception ignored) {}

                    call.resolve(ret);
                }

                @Override
                public void onStatusChanged(String provider, int status, Bundle extras) {}
                @Override
                public void onProviderEnabled(String provider) {}
                @Override
                public void onProviderDisabled(String provider) {}
            };

            lm.requestSingleUpdate(providerToUse, listener, Looper.getMainLooper());

            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    lm.removeUpdates(listener);
                } catch (SecurityException ignored) {}
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", "TIMEOUT");
                call.resolve(ret);
            }, 4000L);

        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }
}
