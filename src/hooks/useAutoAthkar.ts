'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AutoAthkarSettings, VoiceThikr, ThikrCategory } from '@/types/athkar';
import { DEFAULT_ATHKAR_SETTINGS } from '@/types/athkar';
import { VOICE_ATHKAR_LIST } from '@/lib/athkar-data';
import { getAutoAthkarSettings, saveAutoAthkarSettings } from '@/lib/storage';
import {
  playSpiritualChime,
  playThikrVoice,
  stopThikrPlayback,
  isVoiceThikrSupported,
} from '@/lib/voice-athkar-engine';
import {
  syncBackgroundAthkarNotifications,
  showSingleThikrNotification,
  requestNotificationPermission,
} from '@/lib/athkar-notifications';
import { syncNativeAthkar } from '@/lib/athkar-native-bridge';
import { Capacitor } from '@capacitor/core';

export function useAutoAthkar() {
  const [settings, setSettings] = useState<AutoAthkarSettings>(DEFAULT_ATHKAR_SETTINGS);
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentToast, setCurrentToast] = useState<VoiceThikr | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastIndexRef = useRef<number>(0);

  // Load settings on mount and sync background notifications for phone
  useEffect(() => {
    setIsSupported(isVoiceThikrSupported());
    const stored = getAutoAthkarSettings();
    setSettings(stored);
    syncNativeAthkar(stored).catch(() => {});
    syncBackgroundAthkarNotifications(stored).catch(() => {});

    // Automatically request notification permissions on first launch and sync
    requestNotificationPermission().then((granted: boolean) => {
      if (granted) {
        syncNativeAthkar(stored).catch(() => {});
        syncBackgroundAthkarNotifications(stored).catch(() => {});
      }
    }).catch(() => {});

    // Sync notifications whenever app is minimized or closed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const current = getAutoAthkarSettings();
        syncNativeAthkar(current).catch(() => {});
        syncBackgroundAthkarNotifications(current).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
    };
  }, []);

  // Update settings handler and sync background notifications
  const updateSettings = useCallback((newSettings: Partial<AutoAthkarSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveAutoAthkarSettings(updated);
      syncNativeAthkar(updated).catch(() => {});
      syncBackgroundAthkarNotifications(updated).catch(() => {});
      return updated;
    });
  }, []);

  // Dismiss visual toast notification and silence audio
  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCurrentToast(null);
    stopThikrPlayback();
    setIsSpeaking(false);
  }, []);

  // Execute a specific thikr pronunciation & notification
  const triggerThikr = useCallback(
    async (thikrToPlay?: VoiceThikr) => {
      // Pick available thikrs matching active ids or active categories
      const activeIds = Array.isArray(settings?.activeThikrIds) && settings.activeThikrIds.length > 0
        ? settings.activeThikrIds
        : null;

      const activeList = activeIds
        ? VOICE_ATHKAR_LIST.filter((t) => activeIds.includes(t.id))
        : VOICE_ATHKAR_LIST.filter((t) =>
            (settings?.activeCategories || ['istighfar', 'tasbeeh', 'hawqala', 'tahmeed', 'salawat']).includes(t.category)
          );

      const candidateList = activeList.length > 0 ? activeList : VOICE_ATHKAR_LIST;

      let selected: VoiceThikr;
      if (thikrToPlay) {
        selected = thikrToPlay;
      } else {
        // Sequentially rotate to ensure variety
        lastIndexRef.current = (lastIndexRef.current + 1) % candidateList.length;
        selected = candidateList[lastIndexRef.current] || candidateList[0];
      }

      setIsSpeaking(true);
      setCurrentToast(selected);
      showSingleThikrNotification(selected).catch(() => {});

      // Auto dismiss toast after 9 seconds
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setCurrentToast(null);
      }, 9000);

      try {
        if (settings.playChime) {
          await playSpiritualChime(settings.volume);
        }
        await playThikrVoice(selected.audioUrl, selected.textTashkeel, settings.volume);
      } catch (err) {
        console.warn('Voice Thikr play error:', err);
      } finally {
        setIsSpeaking(false);
      }
    },
    [settings.activeCategories, settings.playChime, settings.volume]
  );

  // Recurring background timer for automatic Athkar (web / PWA only; native Android uses Native AlarmManager)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    if (!settings.enabled || settings.intervalMinutes <= 0) {
      return;
    }

    const intervalMs = Math.max(1, settings.intervalMinutes) * 60 * 1000;
    const timer = setInterval(() => {
      triggerThikr();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [settings.enabled, settings.intervalMinutes, triggerThikr]);

  return {
    settings,
    updateSettings,
    isSupported,
    isSpeaking,
    triggerThikr,
    currentToast,
    dismissToast,
  };
}
