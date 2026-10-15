'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  playbackRate: number;
  isRepeat: boolean;
  currentSurah: number;
  currentVerseKey: string | null;
  currentReciter: number;
  surahName: string;
  reciterName: string;
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
    playbackRate: 1,
    isRepeat: false,
    currentSurah: 0,
    currentVerseKey: null,
    currentReciter: 7,
    surahName: '',
    reciterName: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    };

    const onLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration, isLoading: false }));
    };

    const onEnded = () => {
      if (state.isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      }
    };

    const onError = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: 'تعذر تشغيل الصوت',
      }));
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [state.isRepeat]);

  const loadAndPlay = useCallback(async (
    surahNumber: number,
    reciterId: number,
    surahName: string,
    reciterName: string,
    verseKey?: string
  ) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      currentSurah: surahNumber,
      currentVerseKey: verseKey || null,
      currentReciter: reciterId,
      surahName: verseKey ? `${surahName} (آية ${verseKey.split(':')[1]})` : surahName,
      reciterName,
    }));

    try {
      const endpoint = verseKey
        ? `/api/quran/audio?reciter=${reciterId}&verse_key=${verseKey}`
        : `/api/quran/audio?reciter=${reciterId}&chapter=${surahNumber}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to load audio');
      const data = await res.json() as { audio_file?: { audio_url?: string; url?: string } };
      const audioUrl = data.audio_file?.audio_url || data.audio_file?.url;
      if (!audioUrl) throw new Error('No audio URL');

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = state.playbackRate;
        await audioRef.current.play();
        setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({ ...prev, isLoading: false, error: msg }));
    }
  }, [state.playbackRate]);

  const play = useCallback(() => {
    audioRef.current?.play().then(() => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    }).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) pause(); else play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => ({ ...prev, isRepeat: !prev.isRepeat }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentSurah: 0,
      currentVerseKey: null,
      surahName: '',
      reciterName: '',
    }));
  }, []);

  return {
    ...state,
    loadAndPlay,
    play,
    pause,
    togglePlayPause,
    seek,
    setPlaybackRate,
    toggleRepeat,
    stop,
  };
}
