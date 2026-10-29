'use client';

import { Capacitor } from '@capacitor/core';
import type { AutoAthkarSettings, VoiceThikr } from '@/types/athkar';
import { VOICE_ATHKAR_LIST } from '@/lib/athkar-data';

const SILENT_ATHKAR_CHANNEL_ID = 'noor_athkar_v10_silent';
const AUDIO_ATHKAR_CHANNEL_ID = 'noor_athkar_v10_audio';

/**
 * Request notification permissions across Native Capacitor and Web browsers
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Capacitor Native Android / iOS
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return true;
      }
      const requestResult = await LocalNotifications.requestPermissions();
      return requestResult.display === 'granted';
    }

    // 2. Web / PWA browser environment
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
  }

  return false;
}

/**
 * Ensure silent and audio notification channels exist on Android
 */
async function ensureNotificationChannels(soundBase?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // 1. Silent Channel for visual-only notifications (avoids overlapping with in-app audio or MediaPlayer)
    await LocalNotifications.createChannel({
      id: SILENT_ATHKAR_CHANNEL_ID,
      name: 'أذكار نور القرآن (إشعارات هادئة)',
      description: 'عرض نص الذكر المبارك دون تشغيل صوت مكرر',
      importance: 4, // High importance (heads-up banner) without sound
      visibility: 1, // Public on lockscreen
      vibration: true,
      lights: true,
      lightColor: '#C8A85B',
      sound: undefined,
    });

    // 2. Audio Channel when standalone notification sound is explicitly required
    if (soundBase) {
      await LocalNotifications.createChannel({
        id: `${AUDIO_ATHKAR_CHANNEL_ID}_${soundBase}`,
        name: 'أذكار نور القرآن الصوتية',
        description: 'تنبيهات صوتية للأذكار اليومية',
        importance: 5, // High importance with sound
        visibility: 1,
        sound: soundBase,
        vibration: true,
        lights: true,
        lightColor: '#C8A85B',
      });
    }
  } catch (e) {
    console.warn('Channel creation error:', e);
  }
}

/**
 * Synchronize background Athkar notifications:
 * - On Native Android: AthkarAlarmReceiver via native AlarmManager is the single source of truth.
 *   We purge and cancel any LocalNotifications to completely prevent duplicate concurrent playback!
 * - On Web / PWA: Manages browser Notification permissions.
 */
export async function syncBackgroundAthkarNotifications(
  settings: AutoAthkarSettings
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // CRITICAL FIX: On native Android, background alarms and authentic voice playback
      // are handled with 100% reliability by AthkarAlarmReceiver (AlarmManager + WakeLock + MediaPlayer).
      // If LocalNotifications were also scheduled, both would trigger at the exact same minute
      // and play TWO DIFFERENT THIKRS AT THE SAME TIME.
      // We therefore cancel all pending LocalNotifications to ensure only ONE thikr plays.
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
      return;
    } else {
      // For Web PWA: Check permission
      if (settings.enabled && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Error syncing background athkar notifications:', err);
  }
}

/**
 * Display a single Thikr notification.
 * @param thikr The Thikr item to display
 * @param delaySeconds Delay in seconds (0 = immediate)
 * @param playSound If false, notification is silent (since playThikrVoice or MediaPlayer already plays audio)
 */
export async function showSingleThikrNotification(
  thikr: VoiceThikr,
  delaySeconds = 0,
  playSound = false
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const soundBase = playSound && thikr.rawSound ? thikr.rawSound.replace(/\.[^/.]+$/, '') : undefined;
      await ensureNotificationChannels(soundBase);

      const channelId = soundBase ? `${AUDIO_ATHKAR_CHANNEL_ID}_${soundBase}` : SILENT_ATHKAR_CHANNEL_ID;

      // Cancel previous single test notification if any
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
      } catch {}

      const scheduleConfig = delaySeconds > 0
        ? { at: new Date(Date.now() + delaySeconds * 1000), allowWhileIdle: true }
        : undefined;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: 'نور القرآن 📿',
            body: thikr.textDisplay,
            channelId: channelId,
            sound: soundBase,
            smallIcon: 'ic_launcher',
            iconColor: '#C8A85B',
            foreground: true,
            isExactNotification: true,
            autoCancel: true,
            schedule: scheduleConfig,
          },
        ],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('نور القرآن 📿', {
          body: thikr.textDisplay,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'noor-thikr-toast',
          renotify: true,
          data: { url: '/', thikrId: thikr.id, audioUrl: thikr.audioUrl },
        } as unknown as NotificationOptions);
      } else {
        new Notification('نور القرآن 📿', {
          body: thikr.textDisplay,
          icon: '/icon-192.png',
        });
      }
    }
  } catch {
    // Non-critical fallback
  }
}
