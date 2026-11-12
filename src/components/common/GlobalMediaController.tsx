'use client';

import { useEffect } from 'react';
import { dismissNativeMediaNotification } from '@/lib/adhan-native-bridge';

export default function GlobalMediaController() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stopAll = () => {
      try {
        if (typeof (window as any).__stopRadio === 'function') {
          (window as any).__stopRadio();
        }
        if (typeof (window as any).__stopQuran === 'function') {
          (window as any).__stopQuran();
        }
      } catch (e) {
        console.warn('Error calling stop functions:', e);
      }

      try {
        document.querySelectorAll('audio, video').forEach((el) => {
          try {
            const media = el as HTMLMediaElement;
            media.pause();
            media.currentTime = 0;
            media.removeAttribute('src');
            media.load();
          } catch {}
        });
      } catch {}

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'none';
        } catch {}
      }

      dismissNativeMediaNotification().catch(() => {});
    };

    const pauseAll = () => {
      try {
        document.querySelectorAll('audio, video').forEach((el) => {
          try {
            (el as HTMLMediaElement).pause();
          } catch {}
        });
      } catch {}

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch {}
      }
    };

    (window as any).__stopAllAudio = stopAll;
    (window as any).__pauseAllAudio = pauseAll;

    const handleMediaAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      const action = customEvent.detail?.action;
      if (!action) return;

      if (action === 'stop') {
        stopAll();
      } else if (action === 'pause') {
        // If live radio is running, pause is equivalent to stop
        if ((window as any).__stopRadio) {
          stopAll();
        } else {
          pauseAll();
        }
      }
    };

    window.addEventListener('noor-media-action', handleMediaAction);
    return () => {
      window.removeEventListener('noor-media-action', handleMediaAction);
    };
  }, []);

  return null;
}
