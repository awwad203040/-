// TypeScript Bridge to Android Native Adhan Engine
import { registerPlugin } from '@capacitor/core';

export interface AdhanNativePluginInterface {
  scheduleAdhanAlarms(options: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    cityName: string;
    masterEnabled: boolean;
    enabledPrayers: {
      fajr: boolean;
      dhuhr: boolean;
      asr: boolean;
      maghrib: boolean;
      isha: boolean;
    };
    hijriDate?: string;
    fajr12?: string;
    dhuhr12?: string;
    asr12?: string;
    maghrib12?: string;
    isha12?: string;
  }): Promise<{ success: boolean }>;

  cancelAdhanAlarms(): Promise<{ success: boolean }>;
  playTestAdhan(): Promise<{ success: boolean }>;
  stopAdhan(): Promise<{ success: boolean }>;
  updatePrayerNotification(options: {
    prayerName: string;
    prayerTime12: string;
    cityName: string;
    hijriDate?: string;
    timerText: string;
    isAdhanAlert?: boolean;
  }): Promise<{ success: boolean }>;
  cancelPrayerNotification(): Promise<{ success: boolean }>;
  downloadAndInstallUpdate(options?: { apkUrl?: string }): Promise<{ success: boolean; method?: string }>;
  getDeviceLocation(): Promise<{
    success: boolean;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    cityName?: string;
    error?: string;
  }>;
}

const AdhanNative = registerPlugin<AdhanNativePluginInterface>('AdhanNative');

let webAdhanAudio: HTMLAudioElement | null = null;

export async function scheduleNativeAdhanAlarms(params: {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  cityName: string;
  masterEnabled: boolean;
  enabledPrayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
  hijriDate?: string;
  fajr12?: string;
  dhuhr12?: string;
  asr12?: string;
  maghrib12?: string;
  isha12?: string;
}) {
  try {
    return await AdhanNative.scheduleAdhanAlarms(params);
  } catch (err) {
    console.warn('Native Adhan scheduling not available in web mode, saving to localStorage:', err);
    return { success: false };
  }
}

export async function cancelNativeAdhanAlarms() {
  try {
    return await AdhanNative.cancelAdhanAlarms();
  } catch (err) {
    console.warn('Native Adhan cancel not available:', err);
    return { success: false };
  }
}

export async function playTestAdhanSound(onEnded?: () => void) {
  try {
    return await AdhanNative.playTestAdhan();
  } catch {
    // Web fallback
    if (typeof window !== 'undefined') {
      try {
        if (webAdhanAudio) {
          webAdhanAudio.pause();
          webAdhanAudio.currentTime = 0;
        }
        webAdhanAudio = new Audio('/audio/adhan.ogg?v=mohamed-jazi-v2');
        webAdhanAudio.volume = 1.0;
        if (onEnded) {
          webAdhanAudio.onended = onEnded;
        }
        await webAdhanAudio.play();
      } catch (e) {
        console.warn('Web Adhan playback with version failed, attempting clean url:', e);
        try {
          webAdhanAudio = new Audio('/audio/adhan.ogg');
          webAdhanAudio.volume = 1.0;
          if (onEnded) {
            webAdhanAudio.onended = onEnded;
          }
          await webAdhanAudio.play();
        } catch (err2) {
          console.error('All web adhan playback attempts failed:', err2);
        }
      }
    }
    return { success: true };
  }
}

export async function stopAdhanSound() {
  try {
    await AdhanNative.stopAdhan();
  } catch {}

  if (webAdhanAudio) {
    try {
      webAdhanAudio.pause();
      webAdhanAudio.currentTime = 0;
    } catch {}
  }
}

/**
 * Native GPS and Network Location Resolver
 * Returns device coordinates with reverse-geocoded Arabic city name
 */
export async function getNativeDeviceLocation(): Promise<{
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  cityName?: string;
  error?: string;
}> {
  try {
    const res = await AdhanNative.getDeviceLocation();
    return res;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Updates the Salatuk-style ongoing prayer notification card on Android mobile
 */
export async function updateNativePrayerNotification(options: {
  prayerName: string;
  prayerTime12: string;
  cityName: string;
  hijriDate?: string;
  timerText: string;
  isAdhanAlert?: boolean;
}) {
  try {
    return await AdhanNative.updatePrayerNotification(options);
  } catch {
    return { success: false };
  }
}

/**
 * Cancels the ongoing prayer notification card
 */
export async function cancelNativePrayerNotification() {
  try {
    return await AdhanNative.cancelPrayerNotification();
  } catch {
    return { success: false };
  }
}

/**
 * Automatically downloads and installs the latest APK update seamlessly
 */
export async function downloadAndInstallNativeUpdate(apkUrl?: string) {
  try {
    return await AdhanNative.downloadAndInstallUpdate({ apkUrl });
  } catch {
    if (typeof window !== 'undefined') {
      window.location.href = apkUrl || 'https://awwad2030.vercel.app/Noor-AlQuran.apk';
    }
    return { success: false };
  }
}
