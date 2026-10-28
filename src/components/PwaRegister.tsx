'use client';

import { useEffect } from 'react';

/**
 * Programmatically force an update of all registered Service Workers
 */
export async function forcePwaUpdate(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    let updated = false;
    for (const reg of registrations) {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        updated = true;
      }
      await reg.update();
      updated = true;
    }
    return updated;
  } catch (err) {
    console.warn('PWA manual update check failed:', err);
    return false;
  }
}

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    // When the new Service Worker takes control, silently notify listeners
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.dispatchEvent(new CustomEvent('noor-pwa-updated'));
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Check for updates immediately
        registration.update().catch(() => {});

        // Listen for new worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new version is available; tell it to activate immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Periodic update check every 20 minutes
        const intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 20 * 60 * 1000);

        // Check for update on visibility change (when user returns to app)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };

        // Check for update when coming back online
        const handleOnline = () => {
          registration.update().catch(() => {});
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('online', handleOnline);
        };
      } catch (err) {
        console.warn('ServiceWorker registration error:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
