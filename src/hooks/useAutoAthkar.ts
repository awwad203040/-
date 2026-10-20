'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AutoAthkarSettings, VoiceThikr, ThikrCategory } from '@/types/athkar';
import { DEFAULT_ATHKAR_SETTINGS } from '@/types/athkar';
import { VOICE_ATHKAR_LIST } from '@/lib/athkar-data';
import { getAutoAthkarSettings, saveAutoAthkarSettings } from '@/lib/storage';
import { playSpiritualChime, speakThikr, isVoiceThikrSupported } from '@/lib/voice-athkar-engine';

export function useAutoAthkar() {
  const [settings, setSettings] = useState<AutoAthkarSettings>(DEFAULT_ATHKAR_SETTINGS);
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentToast, setCurrentToast] = useState<VoiceThikr | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastIndexRef = useRef<number>(0);

  // Load settings on mount
  useEffect(() => {
    setIsSupported(isVoiceThikrSupported());
    const stored = getAutoAthkarSettings();
    setSettings(stored);
  }, []);

  // Update settings handler
  const updateSettings = useCallback((newSettings: Partial<AutoAthkarSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveAutoAthkarSettings(updated);
      return updated;
    });
  }, []);

  // Dismiss visual toast notification
  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCurrentToast(null);
  }, []);

  // Execute a specific thikr pronunciation & notification
  const triggerThikr = useCallback(
    async (thikrToPlay?: VoiceThikr) => {
      // Pick available thikrs matching active categories
      const activeList = VOICE_ATHKAR_LIST.filter((t) =>
        settings.activeCategories.includes(t.category)
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

      // Auto dismiss toast after 8 seconds
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setCurrentToast(null);
      }, 8000);

      try {
        if (settings.playChime) {
          await playSpiritualChime(settings.volume);
        }
        await speakThikr(selected.textTashkeel, settings.volume);
      } catch (err) {
        console.warn('Voice Thikr play error:', err);
      } finally {
        setIsSpeaking(false);
      }
    },
    [settings.activeCategories, settings.playChime, settings.volume]
  );

  // Recurring background timer for automatic Athkar
  useEffect(() => {
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
