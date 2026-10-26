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
  }): Promise<{ success: boolean }>;

  cancelAdhanAlarms(): Promise<{ success: boolean }>;
  playTestAdhan(): Promise<{ success: boolean }>;
  stopAdhan(): Promise<{ success: boolean }>;
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

export async function playTestAdhanSound() {
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
        await webAdhanAudio.play();
      } catch (e) {
        console.warn('Web Adhan playback failed:', e);
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
