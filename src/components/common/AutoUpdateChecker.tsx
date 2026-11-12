'use client';

import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { downloadAndInstallNativeUpdate } from '@/lib/adhan-native-bridge';
import { forcePwaUpdate } from '@/components/PwaRegister';

export const CURRENT_APP_VERSION_CODE = 8;
export const CURRENT_APP_VERSION_NAME = '2.6.0';

interface RemoteVersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseDate?: string;
  title?: string;
  notes?: string;
}

/**
 * AutoUpdateChecker:
 * Handles automatic, seamless background update detection and downloading.
 * Per user instructions: Zero startup popup modals or disruptive confirmation dialogs!
 * Preserves user settings, bookmarks, and reading progress completely.
 */
export default function AutoUpdateChecker() {
  const performUpdate = useCallback(async (info: RemoteVersionInfo) => {
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('NoorAlQuran: Initiating seamless background update download for v' + info.versionName);
        await downloadAndInstallNativeUpdate(info.apkUrl);
      } else {
        // PWA / Browser mode: silent service worker refresh
        console.log('NoorAlQuran: Updating PWA service worker in background...');
        await forcePwaUpdate();
      }
    } catch (err) {
      console.warn('AutoUpdateChecker background update trigger:', err);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const checkUpdate = async () => {
      try {
        let res: Response | null = null;
        try {
          res = await fetch('https://awwad2030.vercel.app/api/app-version', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
          });
        } catch {
          res = await fetch('/api/app-version', { cache: 'no-store' });
        }

        if (!res || !res.ok) return;
        const data = (await res.json()) as RemoteVersionInfo;

        if (isCancelled || !data || !data.versionCode) return;

        const storedInstalledCode = typeof window !== 'undefined'
          ? parseInt(localStorage.getItem('noor_installed_version_code') || '0', 10)
          : 0;

        const effectiveCurrentCode = Math.max(CURRENT_APP_VERSION_CODE, storedInstalledCode);

        if (data.versionCode > effectiveCurrentCode) {
          // If update was not triggered in the last 20 minutes, perform automatic silent download
          const lastAutoPrompt = typeof window !== 'undefined'
            ? parseInt(localStorage.getItem('noor_last_auto_update_prompt') || '0', 10)
            : 0;

          const now = Date.now();
          if (now - lastAutoPrompt > 20 * 60 * 1000) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('noor_last_auto_update_prompt', String(now));
            }
            performUpdate(data);
          }
        } else {
          // Synchronize local installed version code
          if (typeof window !== 'undefined') {
            localStorage.setItem('noor_installed_version_code', String(CURRENT_APP_VERSION_CODE));
          }
        }
      } catch {
        // Silent fail for network-less scenarios
      }
    };

    const timer = setTimeout(() => {
      checkUpdate();
    }, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [performUpdate]);

  // Completely eliminate the popup modal - returns null so no disruptive startup window appears
  return null;
}
