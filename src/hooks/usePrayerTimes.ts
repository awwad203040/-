'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PrayerTimesResult,
  UserPrayerSettings,
  getPrayerSettings,
  savePrayerSettings,
  getFullPrayerTimes,
  POPULAR_CITIES,
  CalculationMethod,
  getAutoCalculationMethod,
} from '@/lib/prayer-times';
import { triggerHaptic, speakAccessibility, announceToScreenReader } from '@/lib/accessibility';
import {
  scheduleNativeAdhanAlarms,
  cancelNativeAdhanAlarms,
  playTestAdhanSound,
  stopAdhanSound,
  getNativeDeviceLocation,
} from '@/lib/adhan-native-bridge';

const DEFAULT_PRAYER_RESULT: PrayerTimesResult = {
  fajr: '04:55',
  sunrise: '06:15',
  dhuhr: '12:05',
  asr: '15:25',
  maghrib: '17:55',
  isha: '19:25',
  fajr12: '4:55 ص',
  sunrise12: '6:15 ص',
  dhuhr12: '12:05 م',
  asr12: '3:25 م',
  maghrib12: '5:55 م',
  isha12: '7:25 م',
  nextPrayer: {
    key: 'fajr',
    name: 'الفجر',
    time12: '4:55 ص',
    remainingMinutes: 0,
    remainingSeconds: 0,
    remainingFormatted: '--',
  },
  hijriDate: '',
  gregorianDate: '',
  cityName: 'مكة المكرمة',
  isGps: true,
};

// Fallback IP Geolocation to ensure 100% automatic city detection even if GPS is off
async function fetchIpLocation(): Promise<{ lat: number; lng: number; cityName: string } | null> {
  const endpoints = [
    'https://ipapi.co/json/',
    'https://freeipapi.com/api/json',
    'https://ipwhois.app/json/'
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        const lat = parseFloat(data.latitude ?? data.lat);
        const lng = parseFloat(data.longitude ?? data.lon ?? data.lng);
        const city = data.city || data.region_name || data.country_name || '';
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, cityName: city };
        }
      }
    } catch {}
  }
  return null;
}

function matchLocationToCity(lat: number, lng: number, nativeCityName?: string): string {
  let closest = POPULAR_CITIES[0];
  let minDistance = Infinity;
  for (const city of POPULAR_CITIES) {
    const d = Math.hypot(city.lat - lat, city.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      closest = city;
    }
  }

  // If within ~70 km of a major preset city, use the clean Arabic name
  if (minDistance < 0.7) {
    return closest.name;
  }

  if (nativeCityName && nativeCityName.trim().length > 1) {
    return nativeCityName.trim();
  }

  return `${closest.name} (موقعي)`;
}

export function usePrayerTimes() {
  const [settings, setSettings] = useState<UserPrayerSettings>(getPrayerSettings);
  const [prayerData, setPrayerData] = useState<PrayerTimesResult>(DEFAULT_PRAYER_RESULT);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isTestAdhanPlaying, setIsTestAdhanPlaying] = useState(false);
  const lastAdhanTriggerRef = useRef<string>('');

  // Synchronize scheduled native alarms whenever prayer times or settings change
  useEffect(() => {
    if (typeof window !== 'undefined' && prayerData.fajr && prayerData.dhuhr) {
      scheduleNativeAdhanAlarms({
        fajr: prayerData.fajr,
        dhuhr: prayerData.dhuhr,
        asr: prayerData.asr,
        maghrib: prayerData.maghrib,
        isha: prayerData.isha,
        cityName: prayerData.cityName,
        masterEnabled: settings.adhanEnabled,
        enabledPrayers: settings.enabledPrayers,
      });
    }
  }, [
    prayerData.fajr,
    prayerData.dhuhr,
    prayerData.asr,
    prayerData.maghrib,
    prayerData.isha,
    prayerData.cityName,
    settings.adhanEnabled,
    settings.enabledPrayers,
  ]);

  // Update prayer times every second for live countdown & check for prayer arrival on Web / PWA
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const updatedData = getFullPrayerTimes(settings, now);
      setPrayerData(updatedData);

      // On Web / PWA: Check if current minute matches any enabled prayer to sound the Adhan
      if (!Capacitor.isNativePlatform() && settings.adhanEnabled) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentHHMM = `${hours}:${minutes}`;
        const todayKey = now.toISOString().slice(0, 10);

        const prayers: Array<{
          key: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
          name: string;
          time: string;
          time12: string;
        }> = [
          { key: 'fajr', name: 'الفجر', time: updatedData.fajr, time12: updatedData.fajr12 },
          { key: 'dhuhr', name: 'الظهر', time: updatedData.dhuhr, time12: updatedData.dhuhr12 },
          { key: 'asr', name: 'العصر', time: updatedData.asr, time12: updatedData.asr12 },
          { key: 'maghrib', name: 'المغرب', time: updatedData.maghrib, time12: updatedData.maghrib12 },
          { key: 'isha', name: 'العشاء', time: updatedData.isha, time12: updatedData.isha12 },
        ];

        for (const prayer of prayers) {
          if (settings.enabledPrayers[prayer.key] && currentHHMM === prayer.time) {
            const triggerKey = `${todayKey}_${prayer.key}`;
            if (lastAdhanTriggerRef.current !== triggerKey) {
              lastAdhanTriggerRef.current = triggerKey;

              // Play Adhan Audio (Sheikh Mohamed Jazi Azan)
              playTestAdhanSound().catch(() => {});

              // Show Web / Service Worker Notification if permitted
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.ready
                    .then((reg) => {
                      reg.showNotification('الله أكبر - حان موعد الأذان 🕌', {
                        body: `حان الآن موعد أذان صلاة ${prayer.name} (${prayer.time12}) حسب توقيت ${updatedData.cityName}`,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        vibrate: [300, 150, 300, 150, 600],
                        tag: `noor-adhan-${prayer.key}`,
                        renotify: true,
                        data: { url: '/' },
                      } as unknown as NotificationOptions);
                    })
                    .catch(() => {});
                } else {
                  try {
                    new Notification('الله أكبر - حان موعد الأذان 🕌', {
                      body: `حان الآن موعد أذان صلاة ${prayer.name} (${prayer.time12}) حسب توقيت ${updatedData.cityName}`,
                      icon: '/icon-192.png',
                    });
                  } catch {}
                }
              }

              announceToScreenReader(`حان الآن موعد أذان صلاة ${prayer.name}`);
            }
            break;
          }
        }
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  // Unified Intelligent & Automatic Location Resolver
  const requestGpsLocation = useCallback(async (isInteractive = true) => {
    if (isInteractive) {
      setIsGpsLoading(true);
      setGpsError(null);
      triggerHaptic('tap');
      speakAccessibility('جاري تحديد موقعك الجغرافي لحساب مواقيت الصلاة بدقة');
    }

    const applyLocation = (lat: number, lng: number, rawCityName?: string, isAutoIp = false) => {
      const resolvedName = matchLocationToCity(lat, lng, rawCityName);
      const displayLabel = isAutoIp ? `${resolvedName} (تحديد تلقائي)` : resolvedName;
      const autoMethod = getAutoCalculationMethod(undefined, resolvedName);

      const updated = savePrayerSettings({
        useGps: true,
        customLat: lat,
        customLng: lng,
        customCityName: displayLabel,
        method: autoMethod,
      });

      setSettings(updated);
      setIsGpsLoading(false);
      setGpsError(null);

      if (isInteractive) {
        triggerHaptic('success');
        speakAccessibility(`تم تحديد موقعك: ${resolvedName}`);
        announceToScreenReader(`تم تحديد موقعك: ${resolvedName}`);
      }
    };

    // 1. Try Native Android Location Manager (High Accuracy & Instant Cached GPS)
    try {
      const nativeLoc = await getNativeDeviceLocation();
      if (nativeLoc.success && typeof nativeLoc.latitude === 'number' && typeof nativeLoc.longitude === 'number') {
        applyLocation(nativeLoc.latitude, nativeLoc.longitude, nativeLoc.cityName, false);
        return;
      }
    } catch {}

    // 2. Try HTML5 Geolocation API (Browser / WebView)
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 6000,
            enableHighAccuracy: true,
          });
        });

        applyLocation(pos.coords.latitude, pos.coords.longitude, undefined, false);
        return;
      } catch (geoErr) {
        // Continue to IP fallback
      }
    }

    // 3. Fallback: Automatic Network IP Geolocation (Zero-touch fallback)
    try {
      const ipLoc = await fetchIpLocation();
      if (ipLoc) {
        applyLocation(ipLoc.lat, ipLoc.lng, ipLoc.cityName, true);
        return;
      }
    } catch {}

    // 4. If all fail (e.g. airplane mode / completely offline)
    setIsGpsLoading(false);
    if (isInteractive) {
      setGpsError(`تم الاعتماد على توقيت ${settings.customCityName || 'موقعك الحالي'} لعدم توفر شبكة`);
      triggerHaptic('alert');
      setTimeout(() => setGpsError(null), 5000);
    }
  }, [settings.customCityName]);

  // Select City Manually
  const selectCity = useCallback((cityId: string) => {
    const city = POPULAR_CITIES.find((c) => c.id === cityId);
    if (!city) return;

    const updated = savePrayerSettings({
      useGps: false,
      cityId: city.id,
      customLat: city.lat,
      customLng: city.lng,
      customCityName: city.name,
    });

    setSettings(updated);
    setGpsError(null);
    triggerHaptic('tap');
    speakAccessibility(`تم اختيار مدينة ${city.name}`);
    announceToScreenReader(`تم اختيار مدينة ${city.name}`);
  }, []);

  // Update Calculation Method
  const setMethod = useCallback((method: CalculationMethod) => {
    const updated = savePrayerSettings({ method });
    setSettings(updated);
    triggerHaptic('tap');
  }, []);

  // Toggle Notifications
  const toggleNotification = useCallback(() => {
    const newVal = !settings.notificationEnabled;
    const updated = savePrayerSettings({ notificationEnabled: newVal });
    setSettings(updated);
    triggerHaptic('tap');
    if (newVal && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.notificationEnabled]);

  // Master Adhan Switch
  const toggleMasterAdhan = useCallback(() => {
    const newVal = !settings.adhanEnabled;
    const updated = savePrayerSettings({ adhanEnabled: newVal });
    setSettings(updated);
    triggerHaptic('tap');

    if (newVal && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (!newVal) {
      cancelNativeAdhanAlarms();
      stopAdhanSound();
    }
  }, [settings.adhanEnabled]);

  // Toggle specific prayer adhan
  const togglePrayerAdhan = useCallback((prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
    const newPrayers = {
      ...settings.enabledPrayers,
      [prayerKey]: !settings.enabledPrayers[prayerKey],
    };
    const updated = savePrayerSettings({ enabledPrayers: newPrayers });
    setSettings(updated);
    triggerHaptic('tap');
  }, [settings.enabledPrayers]);

  // Test Adhan Sound
  const testAdhan = useCallback(async () => {
    setIsTestAdhanPlaying(true);
    triggerHaptic('tap');
    await playTestAdhanSound();
  }, []);

  // Stop Adhan Sound
  const stopTestAdhan = useCallback(async () => {
    setIsTestAdhanPlaying(false);
    triggerHaptic('tap');
    await stopAdhanSound();
  }, []);

  // Automatic Background Location Determination on Launch
  const initialGpsDone = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialGpsDone.current) {
      initialGpsDone.current = true;
      // Automatically detect and update user location silently in the background
      requestGpsLocation(false);
    }
  }, [requestGpsLocation]);

  return {
    prayerData,
    settings,
    isGpsLoading,
    gpsError,
    isTestAdhanPlaying,
    requestGpsLocation: () => requestGpsLocation(true),
    selectCity,
    setMethod,
    toggleNotification,
    toggleMasterAdhan,
    togglePrayerAdhan,
    testAdhan,
    stopTestAdhan,
  };
}
