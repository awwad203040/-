'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PrayerTimesResult,
  UserPrayerSettings,
  getPrayerSettings,
  savePrayerSettings,
  getFullPrayerTimes,
  POPULAR_CITIES,
  CalculationMethod,
} from '@/lib/prayer-times';
import { triggerHaptic, speakAccessibility, announceToScreenReader } from '@/lib/accessibility';
import {
  scheduleNativeAdhanAlarms,
  cancelNativeAdhanAlarms,
  playTestAdhanSound,
  stopAdhanSound,
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

export function usePrayerTimes() {
  const [settings, setSettings] = useState<UserPrayerSettings>(getPrayerSettings);
  const [prayerData, setPrayerData] = useState<PrayerTimesResult>(DEFAULT_PRAYER_RESULT);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isTestAdhanPlaying, setIsTestAdhanPlaying] = useState(false);

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

  // Update prayer times every second for live countdown
  useEffect(() => {
    const update = () => {
      setPrayerData(getFullPrayerTimes(settings, new Date()));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  // Request GPS Location
  const requestGpsLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError('خاصية تحديد الموقع غير مدعومة في جهازك');
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);
    triggerHaptic('tap');
    speakAccessibility('جاري تحديد موقعك الجغرافي لحساب مواقيت الصلاة');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Try to find closest preset city or name it "موقعي الحالي"
        let closestName = 'موقعي الحالي (GPS)';
        let minDistance = Infinity;
        for (const city of POPULAR_CITIES) {
          const d = Math.hypot(city.lat - lat, city.lng - lng);
          if (d < minDistance) {
            minDistance = d;
            if (d < 0.4) {
              closestName = `${city.name} (GPS)`;
            }
          }
        }

        const updated = savePrayerSettings({
          useGps: true,
          customLat: lat,
          customLng: lng,
          customCityName: closestName,
        });

        setSettings(updated);
        setIsGpsLoading(false);
        triggerHaptic('success');
        speakAccessibility(`تم تحديد موقعك: ${closestName}`);
        announceToScreenReader(`تم تحديد موقعك: ${closestName}`);
      },
      (err) => {
        setIsGpsLoading(false);
        setGpsError('تعذر الحصول على إذن الموقع، يرجى اختيار المدينة يدوياً');
        triggerHaptic('alert');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

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

  // Change Calculation Method
  const setMethod = useCallback((method: CalculationMethod) => {
    const updated = savePrayerSettings({ method });
    setSettings(updated);
    triggerHaptic('tap');
  }, []);

  // Toggle Notification
  const toggleNotification = useCallback(() => {
    const updated = savePrayerSettings({
      notificationEnabled: !settings.notificationEnabled,
    });
    setSettings(updated);
    triggerHaptic('tap');
  }, [settings.notificationEnabled]);

  // Master Adhan Sound Toggle
  const toggleMasterAdhan = useCallback(() => {
    const newVal = !settings.adhanEnabled;
    const updated = savePrayerSettings({ adhanEnabled: newVal });
    setSettings(updated);
    triggerHaptic('tap');
    if (!newVal) {
      cancelNativeAdhanAlarms();
      stopAdhanSound();
      setIsTestAdhanPlaying(false);
    }
  }, [settings.adhanEnabled]);

  // Toggle individual prayer Adhan
  const togglePrayerAdhan = useCallback(
    (prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
      const current = settings.enabledPrayers;
      const updatedPrayers = {
        ...current,
        [prayerKey]: !current[prayerKey],
      };
      const updated = savePrayerSettings({ enabledPrayers: updatedPrayers });
      setSettings(updated);
      triggerHaptic('tap');
    },
    [settings.enabledPrayers]
  );

  // Play Test Adhan Sound
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

  // Initial GPS check if useGps is true and default location
  const initialGpsDone = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && settings.useGps && !initialGpsDone.current) {
      initialGpsDone.current = true;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            let closestName = 'موقعي الحالي (GPS)';
            let minDistance = Infinity;
            for (const city of POPULAR_CITIES) {
              const d = Math.hypot(city.lat - lat, city.lng - lng);
              if (d < minDistance) {
                minDistance = d;
                if (d < 0.4) closestName = `${city.name} (GPS)`;
              }
            }
            const updated = savePrayerSettings({
              useGps: true,
              customLat: lat,
              customLng: lng,
              customCityName: closestName,
            });
            setSettings(updated);
          },
          () => {},
          { timeout: 5000 }
        );
      }
    }
  }, [settings.useGps]);

  return {
    prayerData,
    settings,
    isGpsLoading,
    gpsError,
    isTestAdhanPlaying,
    requestGpsLocation,
    selectCity,
    setMethod,
    toggleNotification,
    toggleMasterAdhan,
    togglePrayerAdhan,
    testAdhan,
    stopTestAdhan,
  };
}
