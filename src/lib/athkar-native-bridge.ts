'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AutoAthkarSettings } from '@/types/athkar';
import { VOICE_ATHKAR_LIST } from '@/lib/athkar-data';

interface NativeThikrPayload {
  id: string;
  sound: string;
  title: string;
  body: string;
}

interface AthkarNativePlugin {
  syncAthkar(options: {
    enabled: boolean;
    intervalMinutes: number;
    volume: number;
    activeAthkar: NativeThikrPayload[];
  }): Promise<{ success: boolean }>;

  testTrigger(options: { delaySeconds: number }): Promise<{ success: boolean }>;

  openAppSettings(): Promise<{ success: boolean }>;

  openBatterySettings(): Promise<{ success: boolean }>;

  requestAllPermissions(): Promise<{ success: boolean }>;

  requestDirectBatteryExemption(): Promise<{ success: boolean }>;

  openAutoStartSettings(): Promise<{ success: boolean }>;

  openVoiceMatchSettings(): Promise<{ success: boolean }>;

  speakNativeText(options: { text: string; rate?: number; pitch?: number }): Promise<{ success: boolean; reason?: string }>;

  stopNativeSpeech(): Promise<{ success: boolean }>;

  checkAudioPermission(): Promise<{ granted: boolean }>;

  requestAudioPermission(): Promise<{ granted: boolean }>;

  startSpeechRecognition(options?: { language?: string }): Promise<{ success: boolean; reason?: string }>;

  stopSpeechRecognition(): Promise<{ success: boolean }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addListener?(eventName: string, listenerFunc: (data: any) => void): any;

  consumeVoiceLaunch(): Promise<{ isVoiceLaunch: boolean; query?: string }>;

  getPermissionStatus(): Promise<{
    notifications: boolean;
    exactAlarms: boolean;
    batteryIgnored: boolean;
  }>;
}

const AthkarNative = registerPlugin<AthkarNativePlugin>('AthkarNative');

/**
 * Check and consume any pending voice launch (e.g. opened by Google Assistant / Voice Match).
 */
export async function consumeNativeVoiceLaunch(): Promise<{ isVoiceLaunch: boolean; query?: string }> {
  if (!Capacitor.isNativePlatform()) return { isVoiceLaunch: false };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (AthkarNative as any).consumeVoiceLaunch?.();
    return res || { isVoiceLaunch: false };
  } catch (err) {
    console.warn('consumeNativeVoiceLaunch error:', err);
    return { isVoiceLaunch: false };
  }
}

/**
 * Open Google Assistant Voice Match settings directly on Android with 1 click.
 */
export async function openNativeVoiceMatchSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.openVoiceMatchSettings();
    return res.success;
  } catch (err) {
    console.warn('Failed to open voice match settings:', err);
    return false;
  }
}

/**
 * High-quality Native Arabic Speech Synthesis (Google TTS Engine on Android).
 * Completely immune to Chromium WebView garbage collection or voice lag.
 */
export async function speakNativeVoice(text: string, rate = 1.0, pitch = 1.0): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.speakNativeText({ text, rate, pitch });
    return res.success;
  } catch (err) {
    console.warn('Native speak failed, falling back to Web Speech:', err);
    return false;
  }
}

/**
 * Stop any ongoing native speech.
 */
export async function stopNativeVoice(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.stopNativeSpeech();
    return res.success;
  } catch {
    return false;
  }
}

/**
 * Check if Android RECORD_AUDIO permission is granted.
 */
export async function checkNativeAudioPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    // 1. Try custom plugin check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (AthkarNative as any).checkAudioPermission?.();
    if (res && typeof res.granted === 'boolean') {
      return res.granted;
    }
  } catch {}

  try {
    // 2. Try standard Capacitor permission status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perm = await (AthkarNative as any).checkPermissions?.();
    if (perm && typeof perm.recordAudio === 'string') {
      return perm.recordAudio === 'granted';
    }
  } catch {}

  // 3. Fallback: return true optimistically to never block the user falsely
  return true;
}

/**
 * Prompt user for Android RECORD_AUDIO permission.
 */
export async function requestNativeAudioPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    // 1. Try custom plugin request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (AthkarNative as any).requestAudioPermission?.();
    if (res && typeof res.granted === 'boolean') {
      return res.granted;
    }
  } catch {}

  try {
    // 2. Try standard Capacitor permission request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perm = await (AthkarNative as any).requestPermissions?.({ permissions: ['recordAudio'] });
    if (perm && typeof perm.recordAudio === 'string') {
      return perm.recordAudio === 'granted';
    }
  } catch {}

  return true;
}

/**
 * Start native Android Speech Recognition in Arabic.
 */
export async function startNativeSpeechRecognition(options?: { language?: string }): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.startSpeechRecognition({ language: options?.language || 'ar-SA' });
    return res?.success ?? true;
  } catch (err) {
    console.warn('Native speech recognition start failed:', err);
    return false;
  }
}

/**
 * Stop native Android Speech Recognition.
 */
export async function stopNativeSpeechRecognition(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.stopSpeechRecognition();
    return res?.success ?? true;
  } catch {
    return false;
  }
}

/**
 * Add event listener for native speech events.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addNativeSpeechListener(eventName: string, callback: (data: any) => void) {
  if (!Capacitor.isNativePlatform()) return { remove: () => {} };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (AthkarNative as any).addListener(eventName, callback);
}

/**
 * Synchronize user athkar preferences directly into native Android AlarmManager and SharedPreferences.
 * Ensures the alarm chain continues running even when the app is completely closed or phone sleeps.
 */
export async function syncNativeAthkar(settings: AutoAthkarSettings): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const activeIds = Array.isArray(settings?.activeThikrIds) && settings.activeThikrIds.length > 0
      ? settings.activeThikrIds
      : null;

    const activeList = activeIds
      ? VOICE_ATHKAR_LIST.filter((t) => activeIds.includes(t.id))
      : VOICE_ATHKAR_LIST.filter((t) =>
          (settings?.activeCategories || ['istighfar', 'tasbeeh', 'hawqala', 'tahmeed', 'salawat']).includes(t.category)
        );

    const pool = activeList.length > 0 ? activeList : VOICE_ATHKAR_LIST;

    const payload: NativeThikrPayload[] = pool.map((t) => ({
      id: t.id,
      sound: t.rawSound ? t.rawSound.replace(/\.[^/.]+$/, '') : 'tasbeeh_azeem',
      title: t.categoryName,
      body: t.textDisplay,
    }));

    const res = await AthkarNative.syncAthkar({
      enabled: Boolean(settings.enabled),
      intervalMinutes: Math.max(1, settings.intervalMinutes || 10),
      volume: typeof settings.volume === 'number' ? settings.volume : 0.85,
      activeAthkar: payload,
    });

    return res?.success ?? true;
  } catch (err) {
    console.warn('Native athkar sync skipped or failed:', err);
    return false;
  }
}

/**
 * Schedule a quick test thikr in a few seconds to verify closed-app playback
 */
export async function testNativeAthkar(delaySeconds = 5): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const res = await AthkarNative.testTrigger({ delaySeconds });
    return res?.success ?? true;
  } catch (err) {
    console.warn('Native athkar test trigger failed:', err);
    return false;
  }
}

/**
 * Open the device App Info page for Noor AlQuran so the user can easily toggle Unrestricted Battery
 */
export async function openNativeAppSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.openAppSettings();
    return res?.success ?? true;
  } catch (err) {
    console.warn('Failed to open app settings:', err);
    return false;
  }
}

/**
 * Open the device Battery Optimization page
 */
export async function openNativeBatterySettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.openBatterySettings();
    return res?.success ?? true;
  } catch (err) {
    console.warn('Failed to open battery settings:', err);
    return false;
  }
}

/**
 * Trigger Android runtime permissions flow (notifications, exact alarms, battery optimizations)
 */
export async function requestNativePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await AthkarNative.requestAllPermissions();
    return res?.success ?? true;
  } catch (err) {
    console.warn('Failed to request native permissions:', err);
    return false;
  }
}

/**
 * Direct Battery Exemption dialog (Action: REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
 */
export async function requestDirectBatteryExemption(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await AthkarNative.requestDirectBatteryExemption();
      return res?.success ?? true;
    } catch (err) {
      console.warn('Failed to request direct battery exemption:', err);
      try {
        await AthkarNative.openBatterySettings();
      } catch (ignored) {}
      return false;
    }
  } else {
    alert('هذا الخيار يعمل داخل تطبيق أندرويد (APK) لفتح نافذة استثناء البطارية مباشرة.');
    return false;
  }
}

/**
 * Open OEM Auto-Start settings (Xiaomi, Huawei, Samsung, Oppo, Vivo, OnePlus)
 */
export async function openAutoStartSettings(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await AthkarNative.openAutoStartSettings();
      return res?.success ?? true;
    } catch (err) {
      console.warn('Failed to open auto-start settings:', err);
      try {
        await AthkarNative.openAppSettings();
      } catch (ignored) {}
      return false;
    }
  } else {
    alert('هذا الخيار يعمل داخل تطبيق أندرويد (APK) لفتح إدارة التشغيل التلقائي في الهاتف.');
    return false;
  }
}

/**
 * Check native permission status
 */
export async function getNativePermissionStatus(): Promise<{
  notifications: boolean;
  exactAlarms: boolean;
  batteryIgnored: boolean;
} | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await AthkarNative.getPermissionStatus();
  } catch (err) {
    console.warn('Failed to get native permission status:', err);
    return null;
  }
}
