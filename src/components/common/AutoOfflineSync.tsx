'use client';

import { useEffect } from 'react';
import { startAutomaticOfflineSync, stopAutomaticOfflineSync } from '@/lib/auto-offline-sync';
import { cleanUpInvalidRifatOfflineAudio } from '@/lib/offline-audio-manager';

/**
 * AutoOfflineSync Component:
 * Automatically downloads and caches the full readable Mushaf (604 pages)
 * and Sheikh Mohamed Siddiq Al-Minshawi's recitation in IndexedDB for 100% offline access.
 * Initiates after a 5-second graceful startup delay so the app opens instantly with zero lag.
 */
export default function AutoOfflineSync() {
  useEffect(() => {
    // Clean up any stale invalid Rifat cache (prevents Minshawi redirects from lingering)
    cleanUpInvalidRifatOfflineAudio().catch(() => {});

    const timer = setTimeout(() => {
      startAutomaticOfflineSync().catch((err) => {
        console.warn('AutoOfflineSync startup notice:', err);
      });
    }, 5000);

    const handleOnline = () => {
      startAutomaticOfflineSync().catch(() => {});
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      stopAutomaticOfflineSync();
    };
  }, []);

  return null;
}
