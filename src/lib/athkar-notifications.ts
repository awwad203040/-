'use client';

import { Capacitor } from '@capacitor/core';
import type { AutoAthkarSettings, VoiceThikr } from '@/types/athkar';
import { VOICE_ATHKAR_LIST } from '@/lib/athkar-data';

const DEFAULT_ATHKAR_CHANNEL_ID = 'noor_athkar_v9_general';

/**
 * Get the channel ID for a specific thikr (version 9 ensures fresh high-importance channel with audio & sleep wakeup)
 */
export function getThikrChannelId(thikr: VoiceThikr): string {
  if (thikr.rawSound) {
    const base = thikr.rawSound.replace(/\.[^/.]+$/, '');
    return `noor_athkar_v9_${base}`;
  }
  return DEFAULT_ATHKAR_CHANNEL_ID;
}

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
 * Create dedicated Android Notification Channels for each Thikr sound.
 * This guarantees that Android plays the exact custom MP3 voice clip even when the app is completely closed.
 */
async function ensureNotificationChannels(pool: VoiceThikr[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // Default channel
    await LocalNotifications.createChannel({
      id: DEFAULT_ATHKAR_CHANNEL_ID,
      name: 'أذكار نور القرآن',
      description: 'تنبيهات الأذكار اليومية بصوت واضح',
      importance: 5, // IMPORTANCE_HIGH (displays heads-up and plays audio)
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
      lightColor: '#C8A85B',
    });

    // Create a high-priority channel for each thikr with its custom audio sound from res/raw
    for (const thikr of pool) {
      if (!thikr.rawSound) continue;
      const chId = getThikrChannelId(thikr);
      const soundBase = thikr.rawSound.replace(/\.[^/.]+$/, '');

      await LocalNotifications.createChannel({
        id: chId,
        name: `أذكار: ${thikr.categoryName} (${thikr.textDisplay.slice(0, 20)})`,
        description: `تنبيه صوتي للذكر: ${thikr.textDisplay}`,
        importance: 5, // IMPORTANCE_HIGH
        visibility: 1, // VISIBILITY_PUBLIC
        sound: soundBase, // Points to res/raw/<soundBase>.mp3
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
 * Schedule recurring background Athkar notifications that fire with sound even when app is closed.
 * Pre-schedules upcoming notifications rotating through the active Athkar list.
 */
export async function syncBackgroundAthkarNotifications(
  settings: AutoAthkarSettings
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Cancel all previous scheduled notifications first
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }

      // If user disabled auto athkar, stop here
      if (!settings.enabled) {
        return;
      }

      // Ensure permission is granted
      const hasPerm = await requestNotificationPermission();
      if (!hasPerm) return;

      // Determine active athkar
      const activeIds = Array.isArray(settings.activeThikrIds) && settings.activeThikrIds.length > 0
        ? settings.activeThikrIds
        : VOICE_ATHKAR_LIST.map((t) => t.id);

      const activeList = VOICE_ATHKAR_LIST.filter((t) => activeIds.includes(t.id));
      const pool = activeList.length > 0 ? activeList : VOICE_ATHKAR_LIST;

      // Create channels with custom sound for each active thikr
      await ensureNotificationChannels(pool);

      const intervalMs = Math.max(1, settings.intervalMinutes) * 60 * 1000;
      const notificationsToSchedule = [];

      // Pre-schedule up to 120 upcoming notifications covering long periods in sleep mode
      const count = Math.min(120, Math.floor((120 * 60) / Math.max(1, settings.intervalMinutes)));
      const now = Date.now();

      for (let i = 1; i <= count; i++) {
        const thikr = pool[(i - 1) % pool.length];
        const triggerTime = new Date(now + i * intervalMs);
        const channelId = getThikrChannelId(thikr);
        const soundBase = thikr.rawSound ? thikr.rawSound.replace(/\.[^/.]+$/, '') : undefined;

        notificationsToSchedule.push({
          id: 1000 + i,
          title: 'نور القرآن 📿',
          body: thikr.textDisplay,
          summaryText: thikr.categoryName,
          channelId: channelId,
          sound: soundBase,
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          iconColor: '#C8A85B',
          foreground: true,
          isExactNotification: true,
          autoCancel: true,
          ongoing: false,
          schedule: { at: triggerTime, allowWhileIdle: true },
          extra: {
            thikrId: thikr.id,
            audioUrl: thikr.audioUrl,
          },
        });
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });
      }
    } else {
      // For Web PWA: Check permission and show immediate or service worker notification
      if (settings.enabled && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Error syncing background athkar notifications:', err);
  }
}

/**
 * Display a test notification for a single Thikr after delay (used to test audio when closing app)
 */
export async function showSingleThikrNotification(
  thikr: VoiceThikr,
  delaySeconds = 3
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await ensureNotificationChannels([thikr]);
      const channelId = getThikrChannelId(thikr);
      const soundBase = thikr.rawSound ? thikr.rawSound.replace(/\.[^/.]+$/, '') : undefined;

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
            schedule: { at: new Date(Date.now() + delaySeconds * 1000), allowWhileIdle: true },
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
