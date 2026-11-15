'use client';

import { useEffect } from 'react';
import { dismissNativeMediaNotification } from '@/lib/adhan-native-bridge';

export default function GlobalMediaController() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stopAll = () => {
      try {
        if (typeof (window as any).__stopQuran === 'function') {
          (window as any).__stopQuran();
        }
        if (typeof (window as any).__stopRadio === 'function') {
          (window as any).__stopRadio();
        }
        if (typeof (window as any).__stopAudio === 'function') {
          (window as any).__stopAudio();
        }
        if ((window as any).__noorQuranAudio) {
          try {
            (window as any).__noorQuranAudio.pause();
            (window as any).__noorQuranAudio.currentTime = 0;
            (window as any).__noorQuranAudio.removeAttribute('src');
          } catch {}
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
        if (typeof (window as any).__pauseQuran === 'function') {
          (window as any).__pauseQuran();
        }
        if (typeof (window as any).__pauseAudio === 'function') {
          (window as any).__pauseAudio();
        }
        if (typeof (window as any).__pauseRadio === 'function') {
          (window as any).__pauseRadio();
        }
        if ((window as any).__noorQuranAudio) {
          try {
            (window as any).__noorQuranAudio.pause();
          } catch {}
        }
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

    const playAll = () => {
      try {
        if (typeof (window as any).__playQuran === 'function') {
          (window as any).__playQuran();
        } else if (typeof (window as any).__playAudio === 'function') {
          (window as any).__playAudio();
        } else if (typeof (window as any).__playRadio === 'function') {
          (window as any).__playRadio();
        } else if ((window as any).__noorQuranAudio && (window as any).__noorQuranAudio.src) {
          (window as any).__noorQuranAudio.play().catch(() => {});
        }
      } catch {}
    };

    const toggleAll = () => {
      try {
        if (typeof (window as any).__toggleQuran === 'function') {
          (window as any).__toggleQuran();
        } else if (typeof (window as any).__toggleAudio === 'function') {
          (window as any).__toggleAudio();
        } else if (typeof (window as any).__toggleRadio === 'function') {
          (window as any).__toggleRadio();
        } else {
          pauseAll();
        }
      } catch {}
    };

    (window as any).__stopAllAudio = stopAll;
    (window as any).__pauseAllAudio = pauseAll;
    (window as any).__playAllAudio = playAll;
    (window as any).__toggleAllAudio = toggleAll;

    const handleMediaAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      const action = customEvent.detail?.action;
      if (!action) return;

      if (action === 'stop' || action === 'close') {
        stopAll();
      } else if (action === 'pause') {
        pauseAll();
      } else if (action === 'play') {
        playAll();
      } else if (action === 'toggle') {
        toggleAll();
      } else if (action === 'next' || action === 'skip_to_next') {
        if (typeof (window as any).__nextQuran === 'function') {
          (window as any).__nextQuran();
        } else if (typeof (window as any).__nextAudio === 'function') {
          (window as any).__nextAudio();
        }
      } else if (action === 'previous' || action === 'prev' || action === 'skip_to_previous') {
        if (typeof (window as any).__prevQuran === 'function') {
          (window as any).__prevQuran();
        } else if (typeof (window as any).__prevAudio === 'function') {
          (window as any).__prevAudio();
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
