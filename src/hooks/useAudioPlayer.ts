'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getSurahName } from '@/lib/quran-meta';

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
  segmentA: number | null;
  segmentB: number | null;
  isSegmentLooping: boolean;
  autoPlayNext: boolean; // Automatically transition to next Surah when current Surah ends
  currentSurah: number;
  currentVerseKey: string | null;
  currentReciter: number;
  surahName: string;
  reciterName: string;
  // Ayah-to-Ayah repetition (تكرار المقطع بتحديد بداية ونهاية الآيات)
  isAyahRangeLooping: boolean;
  ayahRangeStart: number | null;
  ayahRangeEnd: number | null;
  currentAyahNumber: number | null;
  // Multi-Surah Group Loop (تكرار مجموعة سور محددة)
  isMultiSurahLoop: boolean;
  selectedSurahsToLoop: number[];
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadAndPlayRef = useRef<
    | ((
        surahNumber: number,
        reciterId: number,
        surahName: string,
        reciterName: string,
        verseKey?: string,
        preserveRepeatState?: boolean
      ) => Promise<void>)
    | null
  >(null);

  const [state, setState] = useState<AudioPlayerState>(() => {
    let initialMultiLoop = false;
    let initialSurahs: number[] = [];
    if (typeof window !== 'undefined') {
      try {
        initialMultiLoop = localStorage.getItem('noor_multi_surah_loop_enabled') === 'true';
        const raw = localStorage.getItem('noor_multi_surah_loop_list');
        if (raw) initialSurahs = JSON.parse(raw);
      } catch {}
    }
    return {
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
      autoPlayNext: true,
      currentSurah: 0,
      currentVerseKey: null,
      currentReciter: 7,
      surahName: '',
      reciterName: '',
      isAyahRangeLooping: false,
      ayahRangeStart: null,
      ayahRangeEnd: null,
      currentAyahNumber: null,
      isMultiSurahLoop: initialMultiLoop,
      selectedSurahsToLoop: initialSurahs,
    };
  });

  // Reference for real-time loop logic inside audio event listeners
  const loopRef = useRef({
    isSegmentLooping: false,
    segmentA: null as number | null,
    segmentB: null as number | null,
    repeatCount: 1,
    remainingRepeats: 1,
    isRepeat: false,
    autoPlayNext: true,
    currentSurah: 0,
    currentReciter: 7,
    reciterName: '',
    isAyahRangeLooping: false,
    ayahRangeStart: null as number | null,
    ayahRangeEnd: null as number | null,
    currentAyahNumber: null as number | null,
    isMultiSurahLoop: state.isMultiSurahLoop,
    selectedSurahsToLoop: state.selectedSurahsToLoop,
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
      autoPlayNext: state.autoPlayNext,
      currentSurah: state.currentSurah,
      currentReciter: state.currentReciter,
      reciterName: state.reciterName,
      isAyahRangeLooping: state.isAyahRangeLooping,
      ayahRangeStart: state.ayahRangeStart,
      ayahRangeEnd: state.ayahRangeEnd,
      currentAyahNumber: state.currentAyahNumber,
      isMultiSurahLoop: state.isMultiSurahLoop,
      selectedSurahsToLoop: state.selectedSurahsToLoop,
    };
  }, [
    state.isSegmentLooping,
    state.segmentA,
    state.segmentB,
    state.repeatCount,
    state.remainingRepeats,
    state.isRepeat,
    state.autoPlayNext,
    state.currentSurah,
    state.currentReciter,
    state.reciterName,
    state.isAyahRangeLooping,
    state.ayahRangeStart,
    state.ayahRangeEnd,
    state.currentAyahNumber,
    state.isMultiSurahLoop,
    state.selectedSurahsToLoop,
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
    };

    const onLoadedMetadata = () => {
      setState((prev) => ({ ...prev, duration: audio.duration, isLoading: false }));
    };

    const onEnded = () => {
      const {
        repeatCount,
        remainingRepeats,
        autoPlayNext,
        currentSurah,
        currentReciter,
        reciterName,
        isAyahRangeLooping,
        ayahRangeStart,
        ayahRangeEnd,
        currentAyahNumber,
        isMultiSurahLoop,
        selectedSurahsToLoop,
      } = loopRef.current;

      // =========================================================================
      // 0) Ayah Range Loop (تكرار المقطع بتحديد بداية ونهاية الآيات)
      // =========================================================================
      if (
        isAyahRangeLooping &&
        currentSurah > 0 &&
        ayahRangeStart !== null &&
        ayahRangeEnd !== null &&
        currentAyahNumber !== null
      ) {
        if (currentAyahNumber < ayahRangeEnd) {
          const nextAyah = currentAyahNumber + 1;
          loopRef.current.currentAyahNumber = nextAyah;
          setState((prev) => ({ ...prev, currentAyahNumber: nextAyah }));
          const verseKey = `${currentSurah}:${nextAyah}`;
          const surahName = getSurahName(currentSurah);
          loadAndPlayRef.current?.(currentSurah, currentReciter, surahName, reciterName, verseKey, true);
          return;
        }

        if (repeatCount === 999) {
          loopRef.current.currentAyahNumber = ayahRangeStart;
          setState((prev) => ({ ...prev, currentAyahNumber: ayahRangeStart }));
          const verseKey = `${currentSurah}:${ayahRangeStart}`;
          const surahName = getSurahName(currentSurah);
          loadAndPlayRef.current?.(currentSurah, currentReciter, surahName, reciterName, verseKey, true);
          return;
        }

        if (remainingRepeats > 1) {
          const nextRemaining = remainingRepeats - 1;
          loopRef.current.remainingRepeats = nextRemaining;
          loopRef.current.currentAyahNumber = ayahRangeStart;
          setState((prev) => ({
            ...prev,
            remainingRepeats: nextRemaining,
            currentAyahNumber: ayahRangeStart,
          }));
          const verseKey = `${currentSurah}:${ayahRangeStart}`;
          const surahName = getSurahName(currentSurah);
          loadAndPlayRef.current?.(currentSurah, currentReciter, surahName, reciterName, verseKey, true);
          return;
        }

        loopRef.current.isAyahRangeLooping = false;
        loopRef.current.repeatCount = 1;
        loopRef.current.remainingRepeats = 1;
        loopRef.current.currentAyahNumber = null;
        audio.pause();
        audio.currentTime = 0;
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isAyahRangeLooping: false,
          remainingRepeats: 1,
          repeatCount: 1,
          currentAyahNumber: null,
          currentTime: 0,
        }));
        return;
      }

      // =========================================================================
      // 1) Single Surah Repeat Count (1x, 3x, 5x, 999x)
      // =========================================================================
      if (repeatCount === 999) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      if (remainingRepeats > 1) {
        const nextRemaining = remainingRepeats - 1;
        loopRef.current.remainingRepeats = nextRemaining;
        setState((prev) => ({ ...prev, remainingRepeats: nextRemaining }));
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      const wasSingleRepeatActive = repeatCount > 1;
      loopRef.current.repeatCount = 1;
      loopRef.current.remainingRepeats = 1;
      loopRef.current.isRepeat = false;

      // =========================================================================
      // 2) Multi-Surah Group Repetition (تكرار عدة سور محددة بالتتابع)
      // =========================================================================
      if (!wasSingleRepeatActive && isMultiSurahLoop && selectedSurahsToLoop.length > 0) {
        const curIdx = selectedSurahsToLoop.indexOf(currentSurah);
        const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % selectedSurahsToLoop.length;
        const nextSurah = selectedSurahsToLoop[nextIdx];
        const nextSurahName = getSurahName(nextSurah);

        if (loadAndPlayRef.current) {
          loadAndPlayRef.current(nextSurah, currentReciter, nextSurahName, reciterName);
        }
        return;
      }

      // =========================================================================
      // 3) Standard Sequential Auto-play Next Surah
      // =========================================================================
      if (!wasSingleRepeatActive && autoPlayNext && currentSurah > 0 && currentSurah < 114) {
        const nextSurah = currentSurah + 1;
        const nextSurahName = getSurahName(nextSurah);
        setState((prev) => ({
          ...prev,
          repeatCount: 1,
          remainingRepeats: 1,
          isRepeat: false,
        }));
        if (loadAndPlayRef.current) {
          loadAndPlayRef.current(nextSurah, currentReciter, nextSurahName, reciterName);
        }
      } else {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
          repeatCount: 1,
          remainingRepeats: 1,
          isRepeat: false,
        }));
      }
    };

    const onError = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: 'تعذر تشغيل الصوت. يرجى التحقق من الاتصال بالإنترنت.',
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
      verseKey?: string,
      preserveRepeatState = false
    ) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        currentSurah: surahNumber,
        currentVerseKey: verseKey || null,
        currentReciter: reciterId,
        surahName,
        reciterName,
        isPlaying: false,
        ...(!preserveRepeatState
          ? {
              isRepeat: false,
              repeatCount: 1,
              remainingRepeats: 1,
              isAyahRangeLooping: false,
              ayahRangeStart: null,
              ayahRangeEnd: null,
              currentAyahNumber: null,
            }
          : {}),
      }));

      loopRef.current.currentSurah = surahNumber;
      loopRef.current.currentReciter = reciterId;
      loopRef.current.reciterName = reciterName;
      if (!preserveRepeatState) {
        loopRef.current.repeatCount = 1;
        loopRef.current.remainingRepeats = 1;
        loopRef.current.isRepeat = false;
        loopRef.current.isAyahRangeLooping = false;
        loopRef.current.ayahRangeStart = null;
        loopRef.current.ayahRangeEnd = null;
        loopRef.current.currentAyahNumber = null;
      }

      try {
        let url = `/api/quran/audio?chapter=${surahNumber}&reciter=${reciterId}`;
        if (verseKey) {
          url += `&verse=${verseKey}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('فشل تحميل الملف الصوتي');
        const data = await res.json();

        if (data.audioUrl) {
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          const audio = audioRef.current;
          audio.src = data.audioUrl;
          audio.playbackRate = state.playbackRate;

          try {
            await audio.play();
            setState((prev) => ({
              ...prev,
              isPlaying: true,
              isLoading: false,
            }));
          } catch {
            setState((prev) => ({
              ...prev,
              isPlaying: false,
              isLoading: false,
            }));
          }
        } else {
          throw new Error('رابط الصوت غير متوفر');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ غير معروف';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: message,
        }));
      }
    },
    [state.playbackRate]
  );

  loadAndPlayRef.current = loadAndPlay;

  const playNextSurah = useCallback(() => {
    const { currentSurah, isMultiSurahLoop, selectedSurahsToLoop, currentReciter, reciterName } = loopRef.current;

    // If multi-surah loop is active, jump to next selected surah
    if (isMultiSurahLoop && selectedSurahsToLoop.length > 0) {
      const curIdx = selectedSurahsToLoop.indexOf(currentSurah);
      const nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % selectedSurahsToLoop.length;
      const nextSurah = selectedSurahsToLoop[nextIdx];
      const nextSurahName = getSurahName(nextSurah);
      if (loadAndPlayRef.current) {
        loadAndPlayRef.current(nextSurah, currentReciter, nextSurahName, reciterName);
      }
      return;
    }

    if (currentSurah < 114) {
      const nextSurah = currentSurah + 1;
      const nextSurahName = getSurahName(nextSurah);
      if (loadAndPlayRef.current) {
        loadAndPlayRef.current(nextSurah, currentReciter, nextSurahName, reciterName);
      }
    }
  }, []);

  const playPreviousSurah = useCallback(() => {
    const { currentSurah, isMultiSurahLoop, selectedSurahsToLoop, currentReciter, reciterName } = loopRef.current;

    // If multi-surah loop is active, jump to previous selected surah
    if (isMultiSurahLoop && selectedSurahsToLoop.length > 0) {
      const curIdx = selectedSurahsToLoop.indexOf(currentSurah);
      const prevIdx = curIdx === -1 ? selectedSurahsToLoop.length - 1 : (curIdx - 1 + selectedSurahsToLoop.length) % selectedSurahsToLoop.length;
      const prevSurah = selectedSurahsToLoop[prevIdx];
      const prevSurahName = getSurahName(prevSurah);
      if (loadAndPlayRef.current) {
        loadAndPlayRef.current(prevSurah, currentReciter, prevSurahName, reciterName);
      }
      return;
    }

    if (currentSurah > 1) {
      const prevSurah = currentSurah - 1;
      const prevSurahName = getSurahName(prevSurah);
      if (loadAndPlayRef.current) {
        loadAndPlayRef.current(prevSurah, currentReciter, prevSurahName, reciterName);
      }
    }
  }, []);

  const toggleAutoPlayNext = useCallback(() => {
    setState((prev) => {
      const nextVal = !prev.autoPlayNext;
      loopRef.current.autoPlayNext = nextVal;
      return { ...prev, autoPlayNext: nextVal };
    });
  }, []);

  const setAutoPlayNext = useCallback((enabled: boolean) => {
    loopRef.current.autoPlayNext = enabled;
    setState((prev) => ({ ...prev, autoPlayNext: enabled }));
  }, []);

  const play = useCallback(() => {
    audioRef.current
      ?.play()
      .then(() => {
        setState((prev) => ({ ...prev, isPlaying: true }));
      })
      .catch((err) => {
        console.error('Audio play error:', err);
      });
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

  const toggleRepeat = useCallback(() => {
    const cycles = [1, 3, 5, 999];
    const currentIndex = cycles.indexOf(state.repeatCount);
    const nextCount = cycles[(currentIndex + 1) % cycles.length] || 1;
    setRepeatCount(nextCount);
  }, [state.repeatCount, setRepeatCount]);

  // Multi-Surah Loop Controls (تكرار مجموعة سور محددة)
  const toggleMultiSurahLoop = useCallback((enabled?: boolean) => {
    setState((prev) => {
      const nextVal = enabled !== undefined ? enabled : !prev.isMultiSurahLoop;
      try {
        localStorage.setItem('noor_multi_surah_loop_enabled', String(nextVal));
      } catch {}
      loopRef.current.isMultiSurahLoop = nextVal;
      return { ...prev, isMultiSurahLoop: nextVal };
    });
  }, []);

  const setSelectedSurahsToLoop = useCallback((surahs: number[], enableNow = true) => {
    setState((prev) => {
      const isEnabled = enableNow && surahs.length > 0;
      try {
        localStorage.setItem('noor_multi_surah_loop_list', JSON.stringify(surahs));
        localStorage.setItem('noor_multi_surah_loop_enabled', String(isEnabled));
      } catch {}
      loopRef.current.selectedSurahsToLoop = surahs;
      loopRef.current.isMultiSurahLoop = isEnabled;
      return {
        ...prev,
        selectedSurahsToLoop: surahs,
        isMultiSurahLoop: isEnabled,
      };
    });
  }, []);

  // Backward-compatible stubs for segment functions (deprecated in favor of multi-surah loop)
  const setSegmentA = useCallback(() => {}, []);
  const setSegmentB = useCallback(() => {}, []);
  const clearSegment = useCallback(() => {}, []);
  const toggleSegmentLoop = useCallback(() => {}, []);
  const quickLoopLast = useCallback(() => {}, []);

  const startAyahRangeLoop = useCallback(
    (
      surahNumber: number,
      startAyah: number,
      endAyah: number,
      reciterId: number,
      reciterName: string,
      repeats = 3
    ) => {
      const validStart = Math.max(1, startAyah);
      const validEnd = Math.max(validStart, endAyah);

      loopRef.current.isAyahRangeLooping = true;
      loopRef.current.ayahRangeStart = validStart;
      loopRef.current.ayahRangeEnd = validEnd;
      loopRef.current.currentAyahNumber = validStart;
      loopRef.current.currentSurah = surahNumber;
      loopRef.current.currentReciter = reciterId;
      loopRef.current.reciterName = reciterName;
      loopRef.current.repeatCount = repeats;
      loopRef.current.remainingRepeats = repeats;

      setState((prev) => ({
        ...prev,
        isAyahRangeLooping: true,
        ayahRangeStart: validStart,
        ayahRangeEnd: validEnd,
        currentAyahNumber: validStart,
        repeatCount: repeats,
        remainingRepeats: repeats,
      }));

      const verseKey = `${surahNumber}:${validStart}`;
      const sName = getSurahName(surahNumber);
      if (loadAndPlayRef.current) {
        loadAndPlayRef.current(surahNumber, reciterId, sName, reciterName, verseKey, true);
      }
    },
    []
  );

  const stopAyahRangeLoop = useCallback(() => {
    loopRef.current.isAyahRangeLooping = false;
    loopRef.current.ayahRangeStart = null;
    loopRef.current.ayahRangeEnd = null;
    loopRef.current.currentAyahNumber = null;
    loopRef.current.repeatCount = 1;
    loopRef.current.remainingRepeats = 1;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isAyahRangeLooping: false,
      ayahRangeStart: null,
      ayahRangeEnd: null,
      currentAyahNumber: null,
      repeatCount: 1,
      remainingRepeats: 1,
    }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    loopRef.current.isAyahRangeLooping = false;
    loopRef.current.ayahRangeStart = null;
    loopRef.current.ayahRangeEnd = null;
    loopRef.current.currentAyahNumber = null;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentSurah: 0,
      currentVerseKey: null,
      surahName: '',
      reciterName: '',
      isAyahRangeLooping: false,
      ayahRangeStart: null,
      ayahRangeEnd: null,
      currentAyahNumber: null,
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
    toggleMultiSurahLoop,
    setSelectedSurahsToLoop,
    setSegmentA,
    setSegmentB,
    clearSegment,
    toggleSegmentLoop,
    quickLoopLast,
    startAyahRangeLoop,
    stopAyahRangeLoop,
    playNextSurah,
    playPreviousSurah,
    toggleAutoPlayNext,
    setAutoPlayNext,
    stop,
  };
}
