'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  getSurahName,
  getDirectReciterAudioUrl,
  getFallbackReciterAudioUrl,
  getDirectAyahAudioUrl,
  getFallbackAyahAudioUrl,
} from '@/lib/quran-meta';
import { getOfflineAudioBlob, isAudioDownloaded } from '@/lib/offline-audio-manager';
import { triggerHaptic, stopAccessibilitySpeech, announceToScreenReader, speakAccessibility, getAccessibilitySettings } from '@/lib/accessibility';
import { updateNativeMediaNotification, dismissNativeMediaNotification } from '@/lib/adhan-native-bridge';

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
  ayahRepeatMode: 'each_verse' | 'whole_range';
  ayahRemainingRepeats: number;
  // Multi-Surah Group Loop (تكرار مجموعة سور محددة)
  isMultiSurahLoop: boolean;
  selectedSurahsToLoop: number[];
  // Offline Audio State
  isCurrentSurahOffline: boolean;
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
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackUrlRef = useRef<string | null>(null);
  const fallbackTriedRef = useRef<boolean>(false);
  const playRequestIdRef = useRef<number>(0);

  const [state, setState] = useState<AudioPlayerState>(() => {
    let initialMultiLoop = false;
    let initialSurahs: number[] = [];
    let initialAutoPlay = true;
    if (typeof window !== 'undefined') {
      try {
        initialMultiLoop = localStorage.getItem('noor_multi_surah_loop_enabled') === 'true';
        const raw = localStorage.getItem('noor_multi_surah_loop_list');
        if (raw) initialSurahs = JSON.parse(raw);
        const savedAutoPlay = localStorage.getItem('noor_auto_play_next');
        if (savedAutoPlay !== null) initialAutoPlay = savedAutoPlay === 'true';
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
      autoPlayNext: initialAutoPlay,
      currentSurah: 0,
      currentVerseKey: null,
      currentReciter: 7,
      surahName: '',
      reciterName: '',
      isAyahRangeLooping: false,
      ayahRangeStart: null,
      ayahRangeEnd: null,
      currentAyahNumber: null,
      ayahRepeatMode: 'each_verse',
      ayahRemainingRepeats: 1,
      isMultiSurahLoop: initialMultiLoop,
      selectedSurahsToLoop: initialSurahs,
      isCurrentSurahOffline: false,
    };
  });

  // Reference for real-time loop logic inside audio event listeners
  const loopRef = useRef({
    isSegmentLooping: false,
    segmentA: null as number | null,
    segmentB: null as number | null,
    repeatCount: 1,
    remainingRepeats: 1,
    ayahRemainingRepeats: 1,
    ayahRepeatMode: 'each_verse' as 'each_verse' | 'whole_range',
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
      ayahRemainingRepeats: state.ayahRemainingRepeats,
      ayahRepeatMode: state.ayahRepeatMode,
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
    state.ayahRemainingRepeats,
    state.ayahRepeatMode,
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
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setState((prev) => ({
        ...prev,
        duration: audio.duration && !isNaN(audio.duration) ? audio.duration : prev.duration,
        isLoading: false,
      }));
    };

    const onCanPlay = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        duration: audio.duration && !isNaN(audio.duration) ? audio.duration : prev.duration,
      }));
    };

    const onPlaying = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
        error: null,
      }));
    };

    const onWaiting = () => {
      setState((prev) => ({ ...prev, isLoading: true }));
    };

    const onPause = () => {
      setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
    };

    const onStalled = () => {
      setState((prev) => ({ ...prev, isLoading: false }));
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
        const mode = loopRef.current.ayahRepeatMode || 'each_verse';

        // -----------------------------------------------------------------------
        // Mode A: تكرار كل آية على حدة بالعدد المحدد ثم الانتقال للآية التالية
        // -----------------------------------------------------------------------
        if (mode === 'each_verse') {
          // إذا كان التكرار مستمر ∞ لنفس الآية
          if (repeatCount === 999) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            triggerHaptic('repeat');
            announceToScreenReader(`تكرار مستمر للآية ${currentAyahNumber}`);
            return;
          }

          // فحص عدد المرات المتبقية لتكرار الآية الحالية
          const currentAyahRemaining = loopRef.current.ayahRemainingRepeats;
          if (currentAyahRemaining > 1) {
            const nextRemaining = currentAyahRemaining - 1;
            loopRef.current.ayahRemainingRepeats = nextRemaining;
            setState((prev) => ({
              ...prev,
              ayahRemainingRepeats: nextRemaining,
              currentTime: 0,
            }));
            audio.currentTime = 0;
            audio.play().catch(() => {});
            triggerHaptic('repeat');
            const iter = repeatCount - nextRemaining + 1;
            announceToScreenReader(`الآية ${currentAyahNumber} (تكرار ${iter} من ${repeatCount})`);
            return;
          }

          // انتهت تكرارات الآية الحالية بنجاح: الانتقال للآية التالية إن وجدت
          if (currentAyahNumber < ayahRangeEnd) {
            const nextAyah = currentAyahNumber + 1;
            loopRef.current.currentAyahNumber = nextAyah;
            loopRef.current.ayahRemainingRepeats = repeatCount;
            setState((prev) => ({
              ...prev,
              currentAyahNumber: nextAyah,
              ayahRemainingRepeats: repeatCount,
              currentTime: 0,
            }));
            triggerHaptic('next');
            announceToScreenReader(`الانتقال للآية ${nextAyah} (تكرار 1 من ${repeatCount})`);
            const verseKey = `${currentSurah}:${nextAyah}`;
            const surahName = getSurahName(currentSurah);
            loadAndPlayRef.current?.(currentSurah, currentReciter, surahName, reciterName, verseKey, true);
            return;
          }

          // تم الوصول لنهاية المقطع واكتمال جميع تكرارات الآيات
          loopRef.current.isAyahRangeLooping = false;
          loopRef.current.repeatCount = 1;
          loopRef.current.remainingRepeats = 1;
          loopRef.current.ayahRemainingRepeats = 1;
          loopRef.current.currentAyahNumber = null;
          audio.pause();
          audio.currentTime = 0;
          triggerHaptic('success');
          announceToScreenReader('اكتمل تكرار الآيات بنجاح');
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isAyahRangeLooping: false,
            remainingRepeats: 1,
            ayahRemainingRepeats: 1,
            repeatCount: 1,
            currentAyahNumber: null,
            currentTime: 0,
          }));
          return;
        }

        // -----------------------------------------------------------------------
        // Mode B: تكرار كامل المقطع معاً (سرد من الآية الأولى للأخيرة ثم الإعادة)
        // -----------------------------------------------------------------------
        if (currentAyahNumber < ayahRangeEnd) {
          const nextAyah = currentAyahNumber + 1;
          loopRef.current.currentAyahNumber = nextAyah;
          setState((prev) => ({ ...prev, currentAyahNumber: nextAyah }));
          triggerHaptic('tap');
          announceToScreenReader(`الآية ${nextAyah}`);
          const verseKey = `${currentSurah}:${nextAyah}`;
          const surahName = getSurahName(currentSurah);
          loadAndPlayRef.current?.(currentSurah, currentReciter, surahName, reciterName, verseKey, true);
          return;
        }

        if (repeatCount === 999) {
          loopRef.current.currentAyahNumber = ayahRangeStart;
          setState((prev) => ({ ...prev, currentAyahNumber: ayahRangeStart }));
          triggerHaptic('repeat');
          announceToScreenReader('إعادة تكرار كامل المقطع');
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
          triggerHaptic('repeat');
          announceToScreenReader(`تكرار كامل المقطع: متبقي ${nextRemaining} مرات`);
          const verseKey = `${currentSurah}:${ayahRangeStart}`;
          const surahName = getSurahName(currentSurah);
          loadAndPlayRef.current?.(currentSurah, currentReciter, surahName, reciterName, verseKey, true);
          return;
        }

        loopRef.current.isAyahRangeLooping = false;
        loopRef.current.repeatCount = 1;
        loopRef.current.remainingRepeats = 1;
        loopRef.current.ayahRemainingRepeats = 1;
        loopRef.current.currentAyahNumber = null;
        audio.pause();
        audio.currentTime = 0;
        triggerHaptic('success');
        announceToScreenReader('اكتمل التكرار');
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isAyahRangeLooping: false,
          remainingRepeats: 1,
          ayahRemainingRepeats: 1,
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
      // 3) Standard Sequential Auto-play Next Surah (التتابع التلقائي للسورة التالية)
      // =========================================================================
      if (!wasSingleRepeatActive && autoPlayNext && currentSurah > 0) {
        const nextSurah = currentSurah < 114 ? currentSurah + 1 : 1;
        const nextSurahName = getSurahName(nextSurah);
        setState((prev) => ({
          ...prev,
          repeatCount: 1,
          remainingRepeats: 1,
          isRepeat: false,
        }));
        triggerHaptic('next');
        announceToScreenReader(`انتقال تلقائي إلى سورة ${nextSurahName}`);
        try {
          const accSettings = getAccessibilitySettings();
          if (accSettings.blindMode || accSettings.voiceGuidance) {
            speakAccessibility(`سورة ${nextSurahName}`);
          }
        } catch {}
        if (loadAndPlayRef.current) {
          loadAndPlayRef.current(nextSurah, currentReciter, nextSurahName, reciterName);
        }
        return;
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
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (fallbackUrlRef.current && !fallbackTriedRef.current) {
        fallbackTriedRef.current = true;
        const fbUrl = fallbackUrlRef.current;
        console.warn('Primary audio stream failed, auto-switching to backup CDN:', fbUrl);
        audio.src = fbUrl;
        audio.play().catch(() => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
            error: 'تعذر تشغيل الصوت. يرجى التحقق من الاتصال بالإنترنت.',
          }));
        });
        return;
      }
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: 'تعذر تشغيل الصوت. يرجى التحقق من الاتصال بالإنترنت.',
      }));
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
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
      stopAccessibilitySpeech();
      const requestId = ++playRequestIdRef.current;

      // Immediately pause old audio to prevent overlaps or ghost playback
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
      }

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

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      fallbackTriedRef.current = false;
      fallbackUrlRef.current = verseKey
        ? getFallbackAyahAudioUrl(reciterId, verseKey)
        : getFallbackReciterAudioUrl(reciterId, surahNumber);

      // Watchdog: Clear loading state if playback is delayed over 4.5 seconds
      loadTimeoutRef.current = setTimeout(() => {
        if (requestId === playRequestIdRef.current) {
          setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
        }
      }, 4500);

      try {
        let playableAudioSrc: string | null = null;
        let isOffline = false;

        // 1. Check if whole Surah audio is already stored offline in IndexedDB
        if (!verseKey && typeof window !== 'undefined') {
          try {
            const offlineBlob = await getOfflineAudioBlob(reciterId, surahNumber);
            if (offlineBlob && offlineBlob.size > 0) {
              playableAudioSrc = URL.createObjectURL(offlineBlob);
              isOffline = true;
            }
          } catch {
            // Non-critical fallback
          }
        }

        if (requestId !== playRequestIdRef.current) return;

        // 2. If not offline, resolve online URL
        if (!playableAudioSrc) {
          if (!verseKey && reciterId && surahNumber) {
            playableAudioSrc = getDirectReciterAudioUrl(reciterId, surahNumber);
          } else if (verseKey) {
            // Instant 0ms Ayah CDN resolution (works in Web and Android Capacitor APK)
            playableAudioSrc = getDirectAyahAudioUrl(reciterId, verseKey);
            if (!playableAudioSrc) {
              const url = `/api/quran/audio?chapter=${surahNumber}&reciter=${reciterId}&verse=${verseKey}`;
              try {
                const res = await fetch(url);
                if (res.ok) {
                  const data = await res.json();
                  playableAudioSrc =
                    data.audioUrl ||
                    data.audio_file?.audio_url ||
                    data.audio_file?.url ||
                    (typeof data.audio_file === 'string' ? data.audio_file : null);
                }
              } catch {
                // Network fallback
              }
            }
          }
        }

        if (requestId !== playRequestIdRef.current) return;

        if (!playableAudioSrc) {
          playableAudioSrc = getDirectReciterAudioUrl(reciterId, surahNumber);
        }

        if (!playableAudioSrc) {
          throw new Error('رابط الصوت غير متوفر');
        }

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        audio.preload = 'auto';

        audio.src = playableAudioSrc;
        audio.currentTime = 0;
        audio.playbackRate = state.playbackRate;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (requestId !== playRequestIdRef.current) return;
              if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
              setState((prev) => ({
                ...prev,
                isPlaying: true,
                isLoading: false,
                isCurrentSurahOffline: isOffline,
                error: null,
              }));
            })
            .catch((playErr) => {
              if (requestId !== playRequestIdRef.current) return;
              console.warn('Audio play() error:', playErr);
              if (fallbackUrlRef.current && !fallbackTriedRef.current) {
                fallbackTriedRef.current = true;
                const fbUrl = fallbackUrlRef.current;
                console.log('Attempting playback with backup CDN URL:', fbUrl);
                audio.src = fbUrl;
                audio.currentTime = 0;
                audio.play().catch((fbErr) => {
                  if (requestId !== playRequestIdRef.current) return;
                  console.error('Fallback playback also rejected:', fbErr);
                  setState((prev) => ({
                    ...prev,
                    isPlaying: false,
                    isLoading: false,
                    isCurrentSurahOffline: isOffline,
                  }));
                });
              } else {
                setState((prev) => ({
                  ...prev,
                  isPlaying: false,
                  isLoading: false,
                  isCurrentSurahOffline: isOffline,
                }));
              }
            });
        }
      } catch (err: unknown) {
        if (requestId !== playRequestIdRef.current) return;
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
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
      try {
        localStorage.setItem('noor_auto_play_next', String(nextVal));
      } catch {}
      return { ...prev, autoPlayNext: nextVal };
    });
  }, []);

  const setAutoPlayNext = useCallback((enabled: boolean) => {
    loopRef.current.autoPlayNext = enabled;
    try {
      localStorage.setItem('noor_auto_play_next', String(enabled));
    } catch {}
    setState((prev) => ({ ...prev, autoPlayNext: enabled }));
  }, []);

  const play = useCallback(() => {
    stopAccessibilitySpeech();
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (!audio.src || audio.error) {
      const sNum = state.currentSurah || 1;
      const recId = state.currentReciter || 7;
      loadAndPlay(sNum, recId, getSurahName(sNum), state.reciterName || 'محمد صديق المنشاوي');
      return;
    }
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        setState((prev) => ({ ...prev, isPlaying: true, isLoading: false, error: null }));
      }).catch((err) => {
        console.warn('Audio play error, retrying via loadAndPlay:', err);
        const sNum = state.currentSurah || 1;
        const recId = state.currentReciter || 7;
        loadAndPlay(sNum, recId, getSurahName(sNum), state.reciterName || 'محمد صديق المنشاوي');
      });
    }
  }, [state.currentSurah, state.currentReciter, state.reciterName, loadAndPlay]);

  const pause = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    audioRef.current?.pause();
    setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, pause, play]);

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
      repeats = 3,
      mode: 'each_verse' | 'whole_range' = 'each_verse'
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
      loopRef.current.ayahRepeatMode = mode;
      loopRef.current.ayahRemainingRepeats = repeats;

      setState((prev) => ({
        ...prev,
        isAyahRangeLooping: true,
        ayahRangeStart: validStart,
        ayahRangeEnd: validEnd,
        currentAyahNumber: validStart,
        repeatCount: repeats,
        remainingRepeats: repeats,
        ayahRepeatMode: mode,
        ayahRemainingRepeats: repeats,
      }));

      const verseKey = `${surahNumber}:${validStart}`;
      const sName = getSurahName(surahNumber);
      if (loadAndPlayRef.current) {
        loadAndPlayRef.current(surahNumber, reciterId, sName, reciterName, verseKey, true);
      }
    },
    []
  );

  const setAyahRepeatMode = useCallback((mode: 'each_verse' | 'whole_range') => {
    loopRef.current.ayahRepeatMode = mode;
    setState((prev) => ({ ...prev, ayahRepeatMode: mode }));
  }, []);

  const stopAyahRangeLoop = useCallback(() => {
    loopRef.current.isAyahRangeLooping = false;
    loopRef.current.ayahRangeStart = null;
    loopRef.current.ayahRangeEnd = null;
    loopRef.current.currentAyahNumber = null;
    loopRef.current.repeatCount = 1;
    loopRef.current.remainingRepeats = 1;
    loopRef.current.ayahRemainingRepeats = 1;
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
      ayahRemainingRepeats: 1,
    }));
  }, []);

  const stop = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
    }
    dismissNativeMediaNotification();
    loopRef.current.isAyahRangeLooping = false;
    loopRef.current.ayahRangeStart = null;
    loopRef.current.ayahRangeEnd = null;
    loopRef.current.currentAyahNumber = null;
    loopRef.current.ayahRemainingRepeats = 1;
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
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
      ayahRemainingRepeats: 1,
    }));
  }, []);

  // Synchronize with Web Standard MediaSession & Android Native Media Notification (MediaStyle)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (state.currentSurah > 0 && state.surahName) {
      const title = `سورة ${state.surahName}`;
      const artist = state.reciterName || 'نور القرآن';

      // 1. Web Standard MediaSession API
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist,
            album: 'نور القرآن الكريم',
            artwork: [
              { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
          });

          navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';

          navigator.mediaSession.setActionHandler('play', () => {
            play();
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            pause();
          });
          navigator.mediaSession.setActionHandler('stop', () => {
            stop();
          });
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            playPreviousSurah();
          });
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            playNextSurah();
          });
        } catch {}
      }

      // 2. Native Android Media Notification with MediaSessionCompat and Dedicated Stop
      updateNativeMediaNotification({
        title,
        artist,
        isPlaying: state.isPlaying,
      });
    } else if (!state.isPlaying && state.currentSurah === 0) {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'none';
        } catch {}
      }
      dismissNativeMediaNotification();
    }
  }, [state.isPlaying, state.currentSurah, state.surahName, state.reciterName, play, pause, stop, playNextSurah, playPreviousSurah]);

  // Listen to native media notification actions (Play/Pause, Stop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMediaAction = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string }>;
      const action = customEvent.detail?.action;
      if (!action) return;

      if (action === 'play') {
        play();
      } else if (action === 'pause') {
        pause();
      } else if (action === 'toggle') {
        togglePlayPause();
      } else if (action === 'stop') {
        stop();
      }
    };

    window.addEventListener('noor-media-action', handleMediaAction);
    return () => {
      window.removeEventListener('noor-media-action', handleMediaAction);
    };
  }, [play, pause, togglePlayPause, stop]);

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
    setAyahRepeatMode,
    stopAyahRangeLoop,
    playNextSurah,
    playPreviousSurah,
    toggleAutoPlayNext,
    setAutoPlayNext,
    stop,
  };
}
