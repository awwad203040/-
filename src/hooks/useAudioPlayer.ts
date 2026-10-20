'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  playbackRate: number;
  isRepeat: boolean;
  repeatCount: number; // 1 (normal once), 3, 5, 7, 10, 999 (infinite loop)
  remainingRepeats: number;
  segmentA: number | null; // Segment start time in seconds
  segmentB: number | null; // Segment end time in seconds
  isSegmentLooping: boolean;
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
    repeatCount: 1,
    remainingRepeats: 1,
    segmentA: null,
    segmentB: null,
    isSegmentLooping: false,
    currentSurah: 0,
    currentVerseKey: null,
    currentReciter: 7,
    surahName: '',
    reciterName: '',
  });

  // Reference for real-time loop logic inside audio event listeners
  const loopRef = useRef({
    isSegmentLooping: false,
    segmentA: null as number | null,
    segmentB: null as number | null,
    repeatCount: 1,
    remainingRepeats: 1,
    isRepeat: false,
  });

  // Keep ref synchronized with state
  useEffect(() => {
    loopRef.current = {
      isSegmentLooping: state.isSegmentLooping,
      segmentA: state.segmentA,
      segmentB: state.segmentB,
      repeatCount: state.repeatCount,
      remainingRepeats: state.remainingRepeats,
      isRepeat: state.isRepeat,
    };
  }, [
    state.isSegmentLooping,
    state.segmentA,
    state.segmentB,
    state.repeatCount,
    state.remainingRepeats,
    state.isRepeat,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const curTime = audio.currentTime;
      setState((prev) => ({ ...prev, currentTime: curTime }));

      // Handle Segment A-B Repeat Loop
      const { isSegmentLooping, segmentA, segmentB, repeatCount, remainingRepeats } = loopRef.current;
      if (isSegmentLooping && segmentB !== null && segmentB > (segmentA || 0)) {
        if (curTime >= segmentB) {
          if (repeatCount === 999 || remainingRepeats > 1) {
            const nextRemaining = repeatCount === 999 ? 999 : remainingRepeats - 1;
            loopRef.current.remainingRepeats = nextRemaining;
            setState((prev) => ({ ...prev, remainingRepeats: nextRemaining }));
            audio.currentTime = segmentA ?? 0;
            audio.play().catch(() => {});
          } else {
            // Finished repetitions of segment
            loopRef.current.isSegmentLooping = false;
            setState((prev) => ({ ...prev, isSegmentLooping: false, remainingRepeats: 1 }));
          }
        }
      }
    };

    const onLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration, isLoading: false }));
    };

    const onEnded = () => {
      const { isRepeat, repeatCount, remainingRepeats } = loopRef.current;
      if (isRepeat || repeatCount === 999) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (remainingRepeats > 1) {
        const nextRemaining = remainingRepeats - 1;
        loopRef.current.remainingRepeats = nextRemaining;
        setState((prev) => ({ ...prev, remainingRepeats: nextRemaining }));
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0, remainingRepeats: 1 }));
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
  }, []);

  const loadAndPlay = useCallback(
    async (
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
        const data = (await res.json()) as { audio_file?: { audio_url?: string; url?: string } };
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
    },
    [state.playbackRate]
  );

  const play = useCallback(() => {
    audioRef.current
      ?.play()
      .then(() => {
        setState((prev) => ({ ...prev, isPlaying: true }));
      })
      .catch(() => {});
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const skipTime = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.duration || 9999, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setState((prev) => ({ ...prev, currentTime: newTime }));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  // Multi-count repeat setter (1 = once, 3, 5, 7, 10, 999 = infinite)
  const setRepeatCount = useCallback((count: number) => {
    const isRep = count > 1;
    loopRef.current.repeatCount = count;
    loopRef.current.remainingRepeats = count;
    loopRef.current.isRepeat = isRep;
    setState((prev) => ({
      ...prev,
      repeatCount: count,
      remainingRepeats: count,
      isRepeat: isRep,
    }));
  }, []);

  // Legacy toggle repeat (cycles: 1 -> 3 -> 5 -> 999 -> 1)
  const toggleRepeat = useCallback(() => {
    const cycles = [1, 3, 5, 999];
    const currentIndex = cycles.indexOf(state.repeatCount);
    const nextCount = cycles[(currentIndex + 1) % cycles.length] || 1;
    setRepeatCount(nextCount);
  }, [state.repeatCount, setRepeatCount]);

  // Set Segment A (start of repeat loop)
  const setSegmentA = useCallback((time?: number) => {
    const t = time !== undefined ? time : audioRef.current?.currentTime || 0;
    loopRef.current.segmentA = t;
    setState((prev) => ({ ...prev, segmentA: t }));
  }, []);

  // Set Segment B (end of repeat loop)
  const setSegmentB = useCallback((time?: number) => {
    const t = time !== undefined ? time : audioRef.current?.currentTime || 0;
    loopRef.current.segmentB = t;
    setState((prev) => ({ ...prev, segmentB: t }));
  }, []);

  // Clear Segment Loop
  const clearSegment = useCallback(() => {
    loopRef.current.segmentA = null;
    loopRef.current.segmentB = null;
    loopRef.current.isSegmentLooping = false;
    setState((prev) => ({
      ...prev,
      segmentA: null,
      segmentB: null,
      isSegmentLooping: false,
    }));
  }, []);

  // Toggle Segment Loop Playback
  const toggleSegmentLoop = useCallback(() => {
    setState((prev) => {
      const nextLooping = !prev.isSegmentLooping;
      let startA = prev.segmentA;
      let endB = prev.segmentB;

      if (nextLooping) {
        // If start point is not set, set it to 5 seconds before current time or 0
        if (startA === null) {
          startA = Math.max(0, (audioRef.current?.currentTime || 0) - 5);
        }
        // If end point is not set, set it to 15 seconds after startA
        if (endB === null || endB <= startA) {
          endB = Math.min(prev.duration || startA + 20, startA + 15);
        }

        // Jump to start point and play
        if (audioRef.current) {
          audioRef.current.currentTime = startA;
          audioRef.current.play().catch(() => {});
        }
      }

      loopRef.current.isSegmentLooping = nextLooping;
      loopRef.current.segmentA = startA;
      loopRef.current.segmentB = endB;
      loopRef.current.remainingRepeats = prev.repeatCount > 1 ? prev.repeatCount : 3; // default to 3 repeats if normal

      return {
        ...prev,
        isSegmentLooping: nextLooping,
        segmentA: startA,
        segmentB: endB,
        isPlaying: nextLooping ? true : prev.isPlaying,
        repeatCount: prev.repeatCount > 1 ? prev.repeatCount : 3,
        remainingRepeats: prev.repeatCount > 1 ? prev.repeatCount : 3,
      };
    });
  }, []);

  // Quick Loop of recent segment (e.g. last 10 seconds or last 20 seconds)
  const quickLoopLast = useCallback((secondsBack: number) => {
    const cur = audioRef.current?.currentTime || 0;
    const startA = Math.max(0, cur - secondsBack);
    const endB = Math.max(startA + 2, cur);

    loopRef.current.segmentA = startA;
    loopRef.current.segmentB = endB;
    loopRef.current.isSegmentLooping = true;
    loopRef.current.repeatCount = 3;
    loopRef.current.remainingRepeats = 3;

    if (audioRef.current) {
      audioRef.current.currentTime = startA;
      audioRef.current.play().catch(() => {});
    }

    setState((prev) => ({
      ...prev,
      segmentA: startA,
      segmentB: endB,
      isSegmentLooping: true,
      isPlaying: true,
      repeatCount: 3,
      remainingRepeats: 3,
    }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    loopRef.current.isSegmentLooping = false;
    loopRef.current.segmentA = null;
    loopRef.current.segmentB = null;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentSurah: 0,
      currentVerseKey: null,
      surahName: '',
      reciterName: '',
      segmentA: null,
      segmentB: null,
      isSegmentLooping: false,
      remainingRepeats: 1,
    }));
  }, []);

  return {
    ...state,
    loadAndPlay,
    play,
    pause,
    togglePlayPause,
    seek,
    skipTime,
    setPlaybackRate,
    setRepeatCount,
    toggleRepeat,
    setSegmentA,
    setSegmentB,
    clearSegment,
    toggleSegmentLoop,
    quickLoopLast,
    stop,
  };
}
