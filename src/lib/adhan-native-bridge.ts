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
  updateMediaNotification(options: {
    title: string;
    artist: string;
    isPlaying: boolean;
  }): Promise<{ success: boolean }>;
  dismissMediaNotification(): Promise<{ success: boolean }>;
  openBatterySettings(): Promise<{ success: boolean }>;
  openAutoStartSettings(): Promise<{ success: boolean }>;
  playTestUnlockSalawat(): Promise<{ success: boolean }>;
  startUnlockService(): Promise<{ success: boolean }>;
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
        webAdhanAudio = new Audio('/audio/adhan.ogg?v=mohamed-jazi-v3');
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

/**
 * Updates the native Android persistent media playback notification (MediaSession / MediaStyle)
 */
export async function updateNativeMediaNotification(options: {
  title: string;
  artist?: string;
  isPlaying: boolean;
}) {
  try {
    return await AdhanNative.updateMediaNotification({
      title: options.title,
      artist: options.artist || 'نور القرآن',
      isPlaying: options.isPlaying,
    });
  } catch {
    return { success: false };
  }
}

/**
 * Dismisses the native media notification
 */
export async function dismissNativeMediaNotification() {
  try {
    return await AdhanNative.dismissMediaNotification();
  } catch {
    return { success: false };
  }
}

/**
 * Open Android system battery optimization exemption settings ("غير مقيد / No restrictions")
 */
export async function openNativeBatterySettings() {
  try {
    return await AdhanNative.openBatterySettings();
  } catch {
    return { success: false };
  }
}

/**
 * Open phone OEM auto-start manager (Xiaomi, Huawei, Samsung, Oppo, Vivo, etc.)
 */
export async function openNativeAutoStartSettings() {
  try {
    return await AdhanNative.openAutoStartSettings();
  } catch {
    return { success: false };
  }
}

/**
 * Play the "صلي على النبي محمد" voice directly for testing
 */
export async function playTestNativeUnlockSalawat() {
  try {
    return await AdhanNative.playTestUnlockSalawat();
  } catch {
    // web fallback
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio('/audio/salawat_nabi.mp3');
        await audio.play();
      } catch (e) {
        console.warn('Web salawat audio fallback error:', e);
      }
    }
    return { success: false };
  }
}

/**
 * Ensures the permanent background unlock service is running
 */
export async function startNativeUnlockService() {
  try {
    return await AdhanNative.startUnlockService();
  } catch {
    return { success: false };
  }
}


