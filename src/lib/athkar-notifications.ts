'use client';

import { Capacitor } from '@capacitor/core';
import type { AutoAthkarSettings, VoiceThikr } from '@/types/athkar';
import { VOICE_ATHKAR_LIST } from '@/lib/athkar-data';

const ATHKAR_CHANNEL_ID = 'noor_athkar_channel';

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
 * Create Android Notification Channel for Athkar (Sound, Vibration & High Priority)
 */
async function ensureNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: ATHKAR_CHANNEL_ID,
      name: 'أذكار نور القرآن',
      description: 'تنبيهات الأذكار الدورية بصوت وقور وتذكير روحي',
      importance: 4, // High importance (displays heads-up and in status bar)
      visibility: 1, // Public
      vibration: true,
      lights: true,
      lightColor: '#C8A85B',
    });
  } catch {
    // Channel creation fallback
  }
}

/**
 * Schedule recurring background Athkar notifications that fire even when app is closed.
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

      await ensureNotificationChannel();

      // Determine active athkar
      const activeIds = Array.isArray(settings.activeThikrIds) && settings.activeThikrIds.length > 0
        ? settings.activeThikrIds
        : VOICE_ATHKAR_LIST.map((t) => t.id);

      const activeList = VOICE_ATHKAR_LIST.filter((t) => activeIds.includes(t.id));
      const pool = activeList.length > 0 ? activeList : VOICE_ATHKAR_LIST;

      const intervalMs = Math.max(1, settings.intervalMinutes) * 60 * 1000;
      const notificationsToSchedule = [];

      // Pre-schedule up to 48 upcoming notifications covering several days
      const count = Math.min(48, Math.floor((24 * 60) / Math.max(1, settings.intervalMinutes)));
      const now = Date.now();

      for (let i = 1; i <= count; i++) {
        const thikr = pool[(i - 1) % pool.length];
        const triggerTime = new Date(now + i * intervalMs);

        notificationsToSchedule.push({
          id: 1000 + i,
          title: 'نور القرآن 📿',
          body: thikr.textDisplay,
          summaryText: thikr.categoryName,
          channelId: ATHKAR_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          iconColor: '#C8A85B',
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
 * Display an immediate notification for a single Thikr (used for test or when in background)
 */
export async function showSingleThikrNotification(thikr: VoiceThikr): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await ensureNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: 'نور القرآن 📿',
            body: thikr.textDisplay,
            channelId: ATHKAR_CHANNEL_ID,
            smallIcon: 'ic_launcher',
            iconColor: '#C8A85B',
            schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
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
          tag: 'noor-thikr-toast',
        });
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
