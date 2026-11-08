'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QURAN_RADIO_STATIONS, type QuranRadioStation } from '@/lib/quran-radios';

interface UseQuranRadioState {
  currentStation: QuranRadioStation | null;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  error: string | null;
}

// Global audio element so streaming can persist across modals and page navigation
let globalRadioAudio: HTMLAudioElement | null = null;
let globalActiveStation: QuranRadioStation | null = null;

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
      console.warn('Radio stream playback error, checking backup url...');
      const current = globalActiveStation;
      if (current && current.backupUrl && audio.src !== current.backupUrl) {
        audio.src = current.backupUrl;
        audio.play().catch(() => {
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

  const playStation = useCallback((station: QuranRadioStation) => {
    if (typeof window === 'undefined') return;
    if (!globalRadioAudio) {
      globalRadioAudio = new Audio();
      globalRadioAudio.preload = 'auto';
    }
    const audio = globalRadioAudio;

    // If same station is already playing, toggle pause
    if (globalActiveStation?.id === station.id && !audio.paused) {
      audio.pause();
      return;
    }

    globalActiveStation = station;
    setState((prev) => ({
      ...prev,
      currentStation: station,
      isLoading: true,
      error: null,
    }));

    try {
      if (!audio.paused) {
        audio.pause();
      }
      audio.src = station.streamUrl;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setState((prev) => ({
              ...prev,
              isPlaying: true,
              isLoading: false,
              error: null,
            }));
          })
          .catch((err) => {
            console.warn('Primary stream play rejected, switching to backup:', err);
            if (station.backupUrl && audio.src !== station.backupUrl) {
              audio.src = station.backupUrl;
              audio.play().catch((err2) => {
                console.error('Backup stream also rejected:', err2);
                setState((prev) => ({
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  error: 'تعذر بدء البث المباشر لهذه الإذاعة. تأكد من اتصال الإنترنت.',
                }));
              });
            } else {
              setState((prev) => ({
                ...prev,
                isPlaying: false,
                isLoading: false,
                error: 'تعذر بدء البث المباشر لهذه الإذاعة.',
              }));
            }
          });
      }
    } catch (err) {
      console.warn('Primary stream failed synchronously:', err);
      if (station.backupUrl) {
        audio.src = station.backupUrl;
        audio.play().catch(() => {});
      }
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!globalRadioAudio || !globalActiveStation) return;
    if (globalRadioAudio.paused) {
      globalRadioAudio.play().catch(() => {});
    } else {
      globalRadioAudio.pause();
    }
  }, []);

  const stopRadio = useCallback(() => {
    if (globalRadioAudio) {
      globalRadioAudio.pause();
      globalRadioAudio.src = '';
    }
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

  return {
    ...state,
    stations: QURAN_RADIO_STATIONS,
    playStation,
    togglePlayPause,
    stopRadio,
    setVolume,
  };
}
