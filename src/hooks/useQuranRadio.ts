'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QURAN_RADIO_STATIONS, type QuranRadioStation } from '@/lib/quran-radios';
import Hls from 'hls.js';
import { updateNativeMediaNotification, dismissNativeMediaNotification } from '@/lib/adhan-native-bridge';

interface UseQuranRadioState {
  currentStation: QuranRadioStation | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  error: string | null;
}

// Global audio element and HLS instance so streaming can persist across modals and page navigation
let globalRadioAudio: HTMLAudioElement | null = null;
let globalActiveStation: QuranRadioStation | null = null;
let globalHlsInstance: Hls | null = null;

function isHlsStream(url?: string): boolean {
  if (!url) return false;
  return url.toLowerCase().includes('.m3u8');
}

function destroyGlobalHls() {
  if (globalHlsInstance) {
    try {
      globalHlsInstance.stopLoad();
      globalHlsInstance.detachMedia();
      globalHlsInstance.destroy();
    } catch (e) {
      console.warn('Error destroying HLS instance:', e);
    }
    globalHlsInstance = null;
  }
}

function startPlayback(
  url: string,
  backupUrl: string | undefined,
  audio: HTMLAudioElement,
  onFail: () => void
) {
  destroyGlobalHls();

  if (isHlsStream(url)) {
    if (typeof window !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      globalHlsInstance = hls;

      hls.loadSource(url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch((err) => {
          console.warn('HLS play rejected:', err);
          if (backupUrl && backupUrl !== url) {
            startPlayback(backupUrl, undefined, audio, onFail);
          } else {
            onFail();
          }
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('Fatal HLS error encountered:', data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Trying to recover HLS network error...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Trying to recover HLS media error...');
              hls.recoverMediaError();
              break;
            default:
              destroyGlobalHls();
              if (backupUrl && backupUrl !== url) {
                console.warn('HLS failed unrecoverably, switching to backup stream...');
                startPlayback(backupUrl, undefined, audio, onFail);
              } else {
                onFail();
              }
              break;
          }
        }
      });
      return;
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari / iOS)
      audio.src = url;
      audio.play().catch((err) => {
        console.warn('Native HLS play rejected:', err);
        if (backupUrl && backupUrl !== url) {
          startPlayback(backupUrl, undefined, audio, onFail);
        } else {
          onFail();
        }
      });
      return;
    }
  }

  // Standard MP3 / AAC stream (e.g. Palestine, Cairo, Saudi, Sharjah, Kuwait)
  audio.src = url;
  audio.play().catch((err) => {
    console.warn('Standard stream play rejected:', err);
    if (backupUrl && backupUrl !== url) {
      console.warn('Primary stream failed, attempting backup URL...');
      startPlayback(backupUrl, undefined, audio, onFail);
    } else {
      onFail();
    }
  });
}

export function useQuranRadio() {
  const [state, setState] = useState<UseQuranRadioState>({
    currentStation: globalActiveStation,
    isPlaying: globalRadioAudio ? !globalRadioAudio.paused : false,
    isLoading: false,
    error: null,
    volume: globalRadioAudio ? globalRadioAudio.volume : 1.0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!globalRadioAudio) {
      globalRadioAudio = new Audio();
      globalRadioAudio.preload = 'auto';
    }

    const audio = globalRadioAudio;

    const onPlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
    };

    const onPause = () => {
      setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
    };

    const onWaiting = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const onPlaying = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
    };

    const onCanPlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
    };

    const onError = () => {
      if (globalHlsInstance) return; // Hls handles its own errors
      console.warn('Radio stream playback error, checking backup url...');
      const current = globalActiveStation;
      if (current && current.backupUrl && audio.src !== current.backupUrl) {
        startPlayback(current.backupUrl, undefined, audio, () => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isLoading: false,
            error: 'تعذر الاتصال بالبث المباشر لهذه الإذاعة حالياً. يُرجى تجربة إذاعة أخرى.',
          }));
        });
      } else {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isLoading: false,
          error: 'تعذر الاتصال بالبث المباشر لهذه الإذاعة حالياً.',
        }));
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!globalRadioAudio || !globalActiveStation) return;
    if (globalRadioAudio.paused) {
      if (globalHlsInstance) {
        globalHlsInstance.startLoad();
      }
      globalRadioAudio.play().catch(() => {});
    } else {
      globalRadioAudio.pause();
      if (globalHlsInstance) {
        globalHlsInstance.stopLoad();
      }
    }
  }, []);

  const playStation = useCallback((station: QuranRadioStation) => {
    if (typeof window === 'undefined') return;
    if (!globalRadioAudio) {
      globalRadioAudio = new Audio();
      globalRadioAudio.preload = 'auto';
    }
    const audio = globalRadioAudio;

    // If same station is already playing, toggle pause
    if (globalActiveStation?.id === station.id && !audio.paused) {
      togglePlayPause();
      return;
    }

    globalActiveStation = station;
    setState((prev) => ({
      ...prev,
      currentStation: station,
      isLoading: true,
      error: null,
    }));

    if (!audio.paused) {
      audio.pause();
    }

    startPlayback(station.streamUrl, station.backupUrl, audio, () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: 'تعذر بدء البث المباشر لهذه الإذاعة. تأكد من اتصال الإنترنت.',
      }));
    });
  }, [togglePlayPause]);

  const stopRadio = useCallback(() => {
    destroyGlobalHls();
    if (globalRadioAudio) {
      globalRadioAudio.pause();
      globalRadioAudio.removeAttribute('src');
      globalRadioAudio.load();
    }
    dismissNativeMediaNotification();
    globalActiveStation = null;
    setState((prev) => ({
      ...prev,
      currentStation: null,
      isPlaying: false,
      isLoading: false,
      error: null,
    }));
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    if (globalRadioAudio) {
      globalRadioAudio.volume = clamped;
    }
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  // Synchronize with Web Standard MediaSession & Android Native Media Controls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (state.currentStation) {
      const title = state.currentStation.name;
      const artist = state.currentStation.description || 'بث مباشر • نور القرآن';

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist,
            album: 'إذاعة القرآن الكريم',
            artwork: [
              { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
          });
          navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
          navigator.mediaSession.setActionHandler('play', () => {
            togglePlayPause();
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            togglePlayPause();
          });
          navigator.mediaSession.setActionHandler('stop', () => {
            stopRadio();
          });
        } catch {}
      }

      updateNativeMediaNotification({
        title,
        artist,
        isPlaying: state.isPlaying,
      });
    } else if (!state.isPlaying && !state.currentStation) {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'none';
        } catch {}
      }
      dismissNativeMediaNotification();
    }
  }, [state.currentStation, state.isPlaying, togglePlayPause, stopRadio]);

  // Handle native notification actions (Play/Pause, Stop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMediaAction = (event: Event) => {
      if (!globalActiveStation) return;
      const customEvent = event as CustomEvent<{ action?: string }>;
      const action = customEvent.detail?.action;
      if (!action) return;

      if (action === 'play') {
        if (globalRadioAudio?.paused) togglePlayPause();
      } else if (action === 'pause') {
        if (!globalRadioAudio?.paused) togglePlayPause();
      } else if (action === 'toggle') {
        togglePlayPause();
      } else if (action === 'stop') {
        stopRadio();
      }
    };

    window.addEventListener('noor-media-action', handleMediaAction);
    return () => {
      window.removeEventListener('noor-media-action', handleMediaAction);
    };
  }, [togglePlayPause, stopRadio]);

  return {
    ...state,
    stations: QURAN_RADIO_STATIONS,
    playStation,
    togglePlayPause,
    stopRadio,
    setVolume,
  };
}
