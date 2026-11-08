'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ReadingProgress, Bookmark } from '@/types/quran';
import { getReadingProgress, saveReadingProgress, getBookmarks, getPagesVisited, getSettings, saveSettings, isAutoVoiceAssistantOnLaunch } from '@/lib/storage';
import { consumeNativeVoiceLaunch } from '@/lib/athkar-native-bridge';
import { SURAH_METADATA, JUZ_METADATA, POPULAR_RECITERS, getSurahName, getSurahForPage, parseArabicOrWesternNumber } from '@/lib/quran-meta';
import InstallAppModal from '@/components/home/InstallAppModal';
import AudioPlayerComponent from '@/components/mushaf/AudioPlayer';
import ReciterModal from '@/components/mushaf/ReciterModal';
import OfflineAudioModal from '@/components/mushaf/OfflineAudioModal';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAutoAthkar } from '@/hooks/useAutoAthkar';
import AutoAthkarModal from '@/components/home/AutoAthkarModal';
import OfflineDownloadModal from '@/components/mushaf/OfflineDownloadModal';
import MultiSurahLoopModal from '@/components/mushaf/MultiSurahLoopModal';
import AthkarToast from '@/components/common/AthkarToast';
import AnimatedLogo from '@/components/common/AnimatedLogo';
import EditReadingProgressModal from '@/components/home/EditReadingProgressModal';
import { AccessibilityModal } from '@/components/common/AccessibilityModal';
import PrayerTimesModal from '@/components/home/PrayerTimesModal';
import ReadQuranModal from '@/components/home/ReadQuranModal';
import QuranRadiosModal from '@/components/home/QuranRadiosModal';
import AudioControlModal from '@/components/home/AudioControlModal';
import { useQuranRadio } from '@/hooks/useQuranRadio';
import BlindVoiceAssistantModal from '@/components/common/BlindVoiceAssistantModal';
import type { VoiceCommandResult } from '@/lib/voice-command-engine';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { triggerHaptic, speakAccessibility, stopAccessibilitySpeech, announceToScreenReader } from '@/lib/accessibility';

export default function HomePage() {
  const router = useRouter();
  const audio = useAudioPlayer();
  const autoAthkar = useAutoAthkar();
  const prayerTimes = usePrayerTimes();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pagesRead, setPagesRead] = useState(0);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [selectedSurahForAudio, setSelectedSurahForAudio] = useState<number>(1);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showOfflineAudioModal, setShowOfflineAudioModal] = useState(false);
  const [showAthkarModal, setShowAthkarModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [ayahRangeStart, setAyahRangeStart] = useState<number>(1);
  const [ayahRangeEnd, setAyahRangeEnd] = useState<number>(1);
  const [rangeRepeatCount, setRangeRepeatCount] = useState<number>(3);
  const [repeatTab, setRepeatTab] = useState<'ayahs' | 'surah' | 'multi'>('ayahs');
  const [showMultiSurahModal, setShowMultiSurahModal] = useState(false);
  const [showEditProgressModal, setShowEditProgressModal] = useState(false);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showReadQuranModal, setShowReadQuranModal] = useState(false);
  const [showVoiceAssistantModal, setShowVoiceAssistantModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const quranRadio = useQuranRadio();
  const [showRadiosModal, setShowRadiosModal] = useState(false);

  // Refresh reading progress freshly from localStorage
  const refreshProgress = useCallback(() => {
    const prog = getReadingProgress();
    setProgress(prog);
    setBookmarks(getBookmarks());
    setPagesRead(getPagesVisited().length);
    const settings = getSettings();
    if (settings.selectedReciterId) {
      setSelectedReciterId(settings.selectedReciterId);
    }
    if (prog?.surahNumber) {
      setSelectedSurahForAudio(prog.surahNumber);
    }
  }, []);

  useEffect(() => {
    refreshProgress();
    const handleFocus = () => refreshProgress();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshProgress();
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('noor-reading-progress-updated', refreshProgress);
    window.addEventListener('noor-pages-visited-updated', refreshProgress);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('noor-reading-progress-updated', refreshProgress);
      window.removeEventListener('noor-pages-visited-updated', refreshProgress);
    };
  }, [refreshProgress]);

  // Navigate directly to the last saved read page
  const handleContinueReading = useCallback(() => {
    const saved = getReadingProgress();
    const targetPage =
      saved && saved.pageNumber >= 1 && saved.pageNumber <= 604
        ? saved.pageNumber
        : progress && progress.pageNumber >= 1 && progress.pageNumber <= 604
        ? progress.pageNumber
        : 1;
    router.push(`/mushaf?page=${targetPage}`);
  }, [progress, router]);

  // Keep selectedSurahForAudio synchronized when audio plays a different surah (e.g. auto next)
  useEffect(() => {
    if (audio.currentSurah > 0 && audio.currentSurah !== selectedSurahForAudio) {
      setSelectedSurahForAudio(audio.currentSurah);
    }
  }, [audio.currentSurah, selectedSurahForAudio]);

  // Reset Ayah range limits to Ayah 1 when selectedSurahForAudio changes
  useEffect(() => {
    setAyahRangeStart(1);
    setAyahRangeEnd(1);
  }, [selectedSurahForAudio]);

  const currentReciter = POPULAR_RECITERS.find((r) => r.id === selectedReciterId) || POPULAR_RECITERS[0];

  // Start repeating a specific range of Ayahs from start to end
  const handleStartAyahRangeLoop = useCallback(() => {
    const meta = SURAH_METADATA[selectedSurahForAudio];
    const total = meta?.versesCount || 7;
    const start = Math.max(1, Math.min(total, ayahRangeStart));
    const end = Math.max(start, Math.min(total, ayahRangeEnd));
    triggerHaptic('repeat');
    stopAccessibilitySpeech();
    announceToScreenReader(`بدء تكرار سورة ${meta?.name || ''} من آية ${start} إلى ${end}`);
    audio.startAyahRangeLoop(
      selectedSurahForAudio,
      start,
      end,
      selectedReciterId,
      currentReciter.name,
      rangeRepeatCount
    );
  }, [
    selectedSurahForAudio,
    ayahRangeStart,
    ayahRangeEnd,
    selectedReciterId,
    currentReciter.name,
    rangeRepeatCount,
    audio,
  ]);

  // Toggle audio playback
  const handleTogglePlay = useCallback(() => {
    const sName = getSurahName(selectedSurahForAudio);
    if (audio.isLoading) {
      triggerHaptic('pause');
      audio.pause();
      return;
    }
    if (audio.isPlaying) {
      triggerHaptic('pause');
      announceToScreenReader('تم إيقاف التلاوة مؤقتاً');
      audio.pause();
    } else if (audio.currentSurah === selectedSurahForAudio && audio.currentTime > 0) {
      triggerHaptic('play');
      stopAccessibilitySpeech();
      announceToScreenReader(`استئناف تلاوة سورة ${sName}`);
      audio.play();
    } else {
      triggerHaptic('play');
      stopAccessibilitySpeech();
      announceToScreenReader(`تشغيل سورة ${sName} بصوت الشيخ ${currentReciter.name}`);
      audio.setAutoPlayNext(true);
      audio.loadAndPlay(
        selectedSurahForAudio,
        selectedReciterId,
        sName,
        currentReciter.name
      );
    }
  }, [audio, selectedSurahForAudio, selectedReciterId, currentReciter.name]);

  // Reciter change handler
  const handleReciterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = parseInt(e.target.value, 10);
    setSelectedReciterId(newId);
    saveSettings({ selectedReciterId: newId });
    const newReciter = POPULAR_RECITERS.find((r) => r.id === newId) || POPULAR_RECITERS[0];
    triggerHaptic('tap');
    announceToScreenReader(`تم اختيار القارئ الشيخ ${newReciter.name}`);
    if (audio.isPlaying) {
      const targetSurah = audio.currentSurah || selectedSurahForAudio;
      audio.loadAndPlay(
        targetSurah,
        newId,
        getSurahName(targetSurah),
        newReciter.name
      );
    }
  }, [audio, selectedSurahForAudio]);

  // Play specific surah
  const handlePlaySurah = useCallback((surahNumber: number) => {
    setSelectedSurahForAudio(surahNumber);
    const sName = getSurahName(surahNumber);
    if (audio.isPlaying && audio.currentSurah === surahNumber) {
      triggerHaptic('pause');
      announceToScreenReader(`تم إيقاف تلاوة سورة ${sName}`);
      audio.pause();
    } else {
      triggerHaptic('play');
      stopAccessibilitySpeech();
      announceToScreenReader(`تشغيل سورة ${sName} بصوت الشيخ ${currentReciter.name}`);
      audio.setAutoPlayNext(true);
      audio.loadAndPlay(
        surahNumber,
        selectedReciterId,
        sName,
        currentReciter.name
      );
    }
  }, [audio, selectedReciterId, currentReciter.name]);

  // Handle voice command results from BlindVoiceAssistantModal or Google Assistant
  const handleVoiceCommandResult = useCallback((res: VoiceCommandResult) => {
    if (res.action === 'play_surah' && res.surahNumber) {
      const sNum = res.surahNumber;
      const recId = res.reciterId || selectedReciterId || 7;
      const sName = res.surahName || getSurahName(sNum);
      const rName = res.reciterName || POPULAR_RECITERS.find((r) => r.id === recId)?.name || currentReciter.name;

      if (res.reciterId && res.reciterId !== selectedReciterId) {
        setSelectedReciterId(res.reciterId);
        saveSettings({ selectedReciterId: res.reciterId });
      }

      // تفعيل الانتقال التلقائي للسور التالية للمكفوفين والمستخدمين
      audio.setAutoPlayNext(true);

      setSelectedSurahForAudio(sNum);
      triggerHaptic('play');
      announceToScreenReader(`جاري تشغيل سورة ${sName} بصوت الشيخ ${rName} وسوف تتلوها السور التالية تلقائياً`);
      audio.loadAndPlay(sNum, recId, sName, rName);
    } else if (res.action === 'pause') {
      triggerHaptic('pause');
      audio.pause();
    } else if (res.action === 'resume') {
      triggerHaptic('play');
      audio.play();
    } else if (res.action === 'next') {
      triggerHaptic('next');
      audio.playNextSurah();
    } else if (res.action === 'previous') {
      triggerHaptic('prev');
      audio.playPreviousSurah();
    } else if (res.action === 'where_am_i') {
      triggerHaptic('alert');
      const saved = getReadingProgress();
      const p = saved?.pageNumber || 1;
      const s = saved?.surahNumber || 1;
      const sn = getSurahName(s);
      speakAccessibility(`آخر موضع توقفت عنده هو سورة ${sn}، صفحة ${p}`, { force: true });
      announceToScreenReader(`آخر موضع توقفت عنده هو سورة ${sn}، صفحة ${p}`);
    } else if (res.action === 'open_read_quran') {
      triggerHaptic('tap');
      setShowReadQuranModal(true);
    }
  }, [selectedReciterId, currentReciter.name, audio]);

  // Keep a stable ref for handleVoiceCommandResult to avoid re-triggering effects
  const handleVoiceCommandResultRef = useRef(handleVoiceCommandResult);
  useEffect(() => {
    handleVoiceCommandResultRef.current = handleVoiceCommandResult;
  }, [handleVoiceCommandResult]);

  // Track if auto-launch has already been evaluated for this session
  const hasAutoVoiceCheckedRef = useRef(false);

  // Stable callback to close the voice assistant modal
  const handleCloseVoiceModal = useCallback(() => {
    setShowVoiceAssistantModal(false);
  }, []);

  // Listen for native voice commands triggered by Android intents (Google Assistant / Voice Match)
  useEffect(() => {
    // 1. Immediately check if auto voice assistant is enabled for this session
    if (!hasAutoVoiceCheckedRef.current) {
      hasAutoVoiceCheckedRef.current = true;
      if (isAutoVoiceAssistantOnLaunch()) {
        setShowVoiceAssistantModal(true);
      }
    }

    // 2. Check if launched by Google Assistant intent
    consumeNativeVoiceLaunch().then(({ isVoiceLaunch, query }) => {
      if (isVoiceLaunch) {
        if (query) {
          import('@/lib/voice-command-engine').then(({ parseVoiceCommand }) => {
            const res = parseVoiceCommand(query);
            handleVoiceCommandResultRef.current(res);
          });
        } else {
          setShowVoiceAssistantModal(true);
        }
      }
    }).catch(() => {});

    // 3. Also listen for custom events if already mounted
    const handleVoiceTrigger = () => {
      setShowVoiceAssistantModal(true);
    };

    const handleVoiceSearch = (e: Event) => {
      const custom = e as CustomEvent<{ query?: string }>;
      const query = custom.detail?.query;
      if (query) {
        import('@/lib/voice-command-engine').then(({ parseVoiceCommand }) => {
          const res = parseVoiceCommand(query);
          handleVoiceCommandResultRef.current(res);
        });
      } else {
        setShowVoiceAssistantModal(true);
      }
    };

    window.addEventListener('noor-voice-command-trigger', handleVoiceTrigger);
    window.addEventListener('noor-voice-play-search', handleVoiceSearch);

    return () => {
      window.removeEventListener('noor-voice-command-trigger', handleVoiceTrigger);
      window.removeEventListener('noor-voice-play-search', handleVoiceSearch);
    };
  }, []);

  // Select reciter from modal
  const handleSelectReciterFromModal = useCallback((id: number, name: string) => {
    setSelectedReciterId(id);
    saveSettings({ selectedReciterId: id });
    setShowReciterModal(false);
    if (audio.isPlaying) {
      const targetSurah = audio.currentSurah || selectedSurahForAudio;
      audio.loadAndPlay(targetSurah, id, getSurahName(targetSurah), name);
    }
  }, [audio, selectedSurahForAudio]);

  const currentStoppedPage =
    progress && progress.pageNumber >= 1 && progress.pageNumber <= 604
      ? progress.pageNumber
      : 1;
  const stoppedSurahMeta = getSurahForPage(currentStoppedPage);
  const actualPagesRead = Math.max(pagesRead, currentStoppedPage > 1 ? currentStoppedPage : pagesRead);
  const percentage = Math.min(
    100,
    Math.round(((actualPagesRead > 0 ? actualPagesRead : currentStoppedPage) / 604) * 1000) / 10
  );

  const formatLastReadTime = (isoString?: string) => {
    if (!isoString) return 'اليوم';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'اليوم';
      const now = new Date();
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) return 'منذ قليل';
      if (diffHours < 24 && now.getDate() === date.getDate()) {
        return `اليوم ${date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}`;
      }
      if (diffHours < 48) return 'أمس';
      return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    } catch {
      return 'اليوم';
    }
  };
  const currentSurahMeta = SURAH_METADATA[selectedSurahForAudio] || SURAH_METADATA[1];
  const totalVerses = currentSurahMeta?.versesCount || 7;

  return (
    <div className={`min-h-screen ${audio.currentSurah > 0 ? 'pb-28' : 'pb-8'}`} style={{ backgroundColor: '#FBF8EF' }}>
      {/* Main Container */}
      <header
        className="px-4 sm:px-6 pt-2.5 pb-5 shadow-md"
        style={{ backgroundColor: '#123B2A', color: 'white' }}
      >
        <div className="max-w-xl mx-auto space-y-2 sm:space-y-2.5">
          {/* 1. TOP BANNER: صدقة جارية (تم تصغير النافذة قليلاً مع الحفاظ التام على الخطوط) */}
          <div
            className="w-full py-1.5 px-3 rounded-xl border-2 border-[#C8A85B] shadow-md text-center select-none"
            style={{
              background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              boxShadow: '0 3px 12px -2px rgba(200, 168, 91, 0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-lg text-[#C8A85B]">🤲</span>
              <h2
                className="text-base sm:text-lg font-black text-[#F7EED8] tracking-wider"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                صدقة جارية
              </h2>
              <span className="text-lg text-[#C8A85B]">🤲</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#C8A85B] font-medium mt-0.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              لوالديَّ أرجو الدعاء لهما بالرحمة والمغفرة ولجميع موتى المسلمين
            </p>
          </div>

          {/* 2. CENTER: شعار التطبيق (تم تصغير النافذة قليلاً مع الحفاظ التام على حجم الشعار وحجم الخطوط) */}
          <div
            className="w-full max-w-[270px] mx-auto py-2 px-3 sm:py-2.5 sm:px-4 rounded-2xl border-2 border-[#C8A85B]/70 shadow-lg flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              boxShadow: '0 4px 16px -3px rgba(0, 0, 0, 0.4), 0 0 10px rgba(200, 168, 91, 0.2)',
            }}
          >
            <AnimatedLogo size="lg" />
            <h1
              className="text-2xl sm:text-3xl font-black text-[#F7EED8] mt-0.5 tracking-wide"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              نور القرآن
            </h1>
            <p
              className="text-xs text-[#C8A85B] font-bold mt-0.5"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              المصحف الشريف • رفيقك مع القرآن الكريم
            </p>
            {/* Install APK badge */}
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#C8A85B]/25 hover:bg-[#C8A85B]/35 text-[#FFD700] border border-[#C8A85B]/50 active:scale-95 transition cursor-pointer shadow-xs"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <span>📲</span>
              <span>تثبيت التطبيق (APK)</span>
            </button>
          </div>

          {/* 3. WIDE CARD: تقدمك في القراءة (تم تصغير النافذة قليلاً مع الحفاظ التام على الخطوط والبيانات) */}
          <div
            className="w-full rounded-2xl py-2.5 px-3.5 sm:py-3 sm:px-4 border-2 border-[#C8A85B] shadow-lg text-right transition-all"
            style={{
              background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
            }}
          >
            {/* Header: Title, Owner Badge, Percentage & Edit */}
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg shrink-0">📖</span>
                <span
                  className="text-sm sm:text-base font-extrabold text-[#F7EED8] flex items-center gap-2"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  <span>تقدمك في القراءة</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    صاحب الجوال
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black text-[#FFD700]" dir="ltr">
                  {percentage}%
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditProgressModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#C8A85B]/25 hover:bg-[#C8A85B]/35 text-[#FFD700] border border-[#C8A85B]/40 active:scale-95 transition cursor-pointer"
                  title="تعديل صفحة التوقف وعدد الصفحات المقروءة"
                >
                  <span>✏️</span>
                  <span>تعديل</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Line */}
            <div className="flex items-center justify-between text-xs mb-1.5 bg-black/35 rounded-xl px-2.5 py-1.5 border border-white/10">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="text-[#FFD700] font-black text-sm sm:text-base shrink-0" style={{ fontFamily: "'Amiri', serif" }}>
                  صفحة {currentStoppedPage}
                </span>
                {stoppedSurahMeta && (
                  <span className="text-xs text-white/90 truncate">
                    ({stoppedSurahMeta.name} • جزء {stoppedSurahMeta.startPage})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/70 flex items-center gap-2 shrink-0">
                <span>{actualPagesRead} من 604 ص</span>
                <span className="text-white/40">•</span>
                <span className="text-[10px] text-white/60">{formatLastReadTime(progress?.updatedAt)}</span>
              </div>
            </div>

            {/* Slim Progress Bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-white/15 mb-2 relative">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#C8A85B] via-[#eed596] to-[#C8A85B]"
                style={{ width: `${Math.max(2, percentage)}%` }}
              />
            </div>

            {/* Action Button: Continue Reading */}
            <button
              type="button"
              onClick={handleContinueReading}
              className="w-full py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 active:scale-[0.99] transition shadow-md cursor-pointer flex items-center justify-between border border-[#C8A85B]"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="text-sm">▶</span>
                <span className="truncate">
                  متابعة القراءة من صفحة {currentStoppedPage} {stoppedSurahMeta ? `(سورة ${stoppedSurahMeta.name})` : ''}
                </span>
              </div>
              <span className="text-xs font-black shrink-0 mr-2">فتح المصحف ←</span>
            </button>
          </div>

          {/* 4. THE 2-COLUMN GRID (8 SECTIONS EXACTLY AS IN THE DIAGRAM) */}
          <div className="w-full grid grid-cols-2 gap-3 sm:gap-4">
            {/* ROW 1: RIGHT = اقرأ القرآن */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowReadQuranModal(true);
              }}
              className="group relative flex flex-col justify-between p-4 rounded-2xl border-2 border-[#C8A85B] hover:brightness-110 active:scale-95 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="اقرأ القرآن - الفهرس الشامل للسور والأجزاء والختمة"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-3xl filter drop-shadow">📖</span>
                <span className="text-[10px] font-bold text-[#FFD700] bg-black/40 px-2 py-0.5 rounded-full border border-[#C8A85B]/40">
                  فهرس
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  اقرأ القرآن
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  السور • الأجزاء • الختمة
                </p>
              </div>
            </button>

            {/* ROW 1: LEFT = استمع للقرآن */}
            <div
              onClick={() => {
                triggerHaptic('tap');
                setShowAudioModal(true);
              }}
              className={`group relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden ${
                audio.isPlaying
                  ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                  : 'border-[#C8A85B] hover:brightness-110'
              }`}
              style={{
                background: audio.isPlaying
                  ? 'linear-gradient(135deg, #0B5B43 0%, #123B2A 50%, #082A1C 100%)'
                  : 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              role="button"
              tabIndex={0}
              aria-label="استمع للقرآن - اختيار القارئ والتلاوة والتكرار"
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-3xl filter drop-shadow ${audio.isPlaying ? 'animate-pulse' : ''}`}>🎧</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlay();
                  }}
                  className="w-9 h-9 rounded-full bg-[#C8A85B] hover:bg-[#d4b66d] text-[#123B2A] flex items-center justify-center font-bold text-sm shadow-md transition active:scale-90 cursor-pointer"
                  title={audio.isPlaying ? 'إيقاف مؤقت' : 'تشغيل الاستماع'}
                  aria-label={audio.isPlaying ? 'إيقاف مؤقت' : 'تشغيل الاستماع'}
                >
                  {audio.isPlaying ? '⏸' : '▶'}
                </button>
              </div>
              <div className="mt-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                    استمع للقرآن
                  </h3>
                  {audio.isPlaying && (
                    <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                      نشط
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  الشيخ: {currentReciter.name}
                </p>
              </div>
            </div>

            {/* ROW 2: RIGHT = تحميل المصحف */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowOfflineModal(true);
              }}
              className="group relative flex flex-col justify-between p-4 rounded-2xl border-2 border-[#C8A85B] hover:brightness-110 active:scale-95 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="تحميل المصحف للقراءة بدون إنترنت"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-3xl filter drop-shadow">📥</span>
                <span className="text-[10px] font-bold text-[#FFD700] bg-black/40 px-2 py-0.5 rounded-full border border-[#C8A85B]/40">
                  بدون نت
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  تحميل المصحف
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  القراءة بدون اتصال
                </p>
              </div>
            </button>

            {/* ROW 2: LEFT = الأذكار */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowAthkarModal(true);
              }}
              className={`group relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden ${
                autoAthkar?.settings?.enabled
                  ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                  : 'border-[#C8A85B] hover:brightness-110 active:scale-95'
              }`}
              style={{
                background: autoAthkar?.settings?.enabled
                  ? 'linear-gradient(135deg, #0E3E2B 0%, #123B2A 50%, #0A271B 100%)'
                  : 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="الأذكار والتسابيح الصوتية التلقائية والصلاة على النبي"
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-3xl filter drop-shadow ${autoAthkar?.settings?.enabled ? 'animate-bounce' : ''}`}>🔔</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  autoAthkar?.settings?.enabled
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                    : 'bg-black/40 text-[#FFD700] border-[#C8A85B]/40'
                }`}>
                  {autoAthkar?.settings?.enabled ? `كل ${autoAthkar?.settings?.intervalMinutes ?? 10} د` : 'متوقفة'}
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  الأذكار
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  أذكار تلقائية وصلاة على النبي
                </p>
              </div>
            </button>

            {/* ROW 3: RIGHT = المكفوفين */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowAccessibilityModal(true);
              }}
              className="group relative flex flex-col justify-between p-4 rounded-2xl border-2 border-[#C8A85B] hover:brightness-110 active:scale-95 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="المكفوفين - تسهيل الوصول والتوجيه الصوتي"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-3xl filter drop-shadow">🦯</span>
                <span className="text-[10px] font-bold text-[#FFD700] bg-black/40 px-2 py-0.5 rounded-full border border-[#C8A85B]/40">
                  سهولة وصول
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  المكفوفين
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  تسهيل الوصول وقارئ الشاشة
                </p>
              </div>
            </button>

            {/* ROW 3: LEFT = نطق السورة */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowVoiceAssistantModal(true);
              }}
              className="group relative flex flex-col justify-between p-4 rounded-2xl border-2 border-[#C8A85B] hover:brightness-110 active:scale-95 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="نطق السورة - المساعد الصوتي الذكي"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-3xl filter drop-shadow animate-bounce">🎙️</span>
                <span className="text-[10px] font-bold text-[#FFD700] bg-black/40 px-2 py-0.5 rounded-full border border-[#C8A85B]/40">
                  تحكم صوتي
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  نطق السورة
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  انطق اسم السورة لتشغيلها
                </p>
              </div>
            </button>

            {/* ROW 4: RIGHT = أوقات الصلوات */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowPrayerModal(true);
              }}
              className="group relative flex flex-col justify-between p-4 rounded-2xl border-2 border-[#C8A85B] hover:brightness-110 active:scale-95 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="أوقات الصلوات - مواقيت الصلاة والآذان"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-3xl filter drop-shadow">🕌</span>
                <span className="text-[10px] font-bold text-[#FFD700] bg-black/40 px-2 py-0.5 rounded-full border border-[#C8A85B]/40 truncate max-w-[95px]">
                  {prayerTimes.prayerData.nextPrayer.name}: {prayerTimes.prayerData.nextPrayer.time12}
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  أوقات الصلوات
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  متبقي: {prayerTimes.prayerData.nextPrayer.remainingFormatted}
                </p>
              </div>
            </button>

            {/* ROW 4: LEFT = إذاعات القرآن الكريم */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowRadiosModal(true);
              }}
              className={`group relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all shadow-xl text-right cursor-pointer h-32 sm:h-36 overflow-hidden ${
                quranRadio.isPlaying
                  ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                  : 'border-[#C8A85B] hover:brightness-110 active:scale-95'
              }`}
              style={{
                background: quranRadio.isPlaying
                  ? 'linear-gradient(135deg, #0B5B43 0%, #123B2A 50%, #082A1C 100%)'
                  : 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
              }}
              aria-label="إذاعات القرآن الكريم - بث مباشر متواصل"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-3xl filter drop-shadow">📻</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  quranRadio.isPlaying
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'bg-black/40 text-[#FFD700] border-[#C8A85B]/40'
                }`}>
                  {quranRadio.isPlaying ? 'بث حي LIVE' : 'بث مباشر'}
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-base sm:text-lg font-black text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                  إذاعات القرآن الكريم
                </h3>
                <p className="text-[11px] text-[#C8A85B] mt-0.5 truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  {quranRadio.isPlaying ? quranRadio.currentStation?.name : 'مصر • السعودية • كبار القراء'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Audio Control & Repetition Modal */}
      <AudioControlModal
        isOpen={showAudioModal}
        onClose={() => setShowAudioModal(false)}
        isPlaying={audio.isPlaying}
        isLoading={audio.isLoading}
        currentSurah={audio.currentSurah}
        selectedSurahForAudio={selectedSurahForAudio}
        selectedReciterId={selectedReciterId}
        currentReciter={currentReciter}
        autoPlayNext={audio.autoPlayNext}
        repeatCount={audio.repeatCount}
        remainingRepeats={audio.remainingRepeats}
        isAyahRangeLooping={audio.isAyahRangeLooping}
        ayahRangeStart={ayahRangeStart}
        ayahRangeEnd={ayahRangeEnd}
        currentAyahNumber={audio.currentAyahNumber}
        rangeRepeatCount={rangeRepeatCount}
        repeatTab={repeatTab}
        isMultiSurahLoop={audio.isMultiSurahLoop}
        selectedSurahsToLoop={audio.selectedSurahsToLoop}
        onTogglePlay={handleTogglePlay}
        onPlaySurah={handlePlaySurah}
        onReciterChange={(newId) => {
          setSelectedReciterId(newId);
          saveSettings({ selectedReciterId: newId });
          const newReciter = POPULAR_RECITERS.find((r) => r.id === newId) || POPULAR_RECITERS[0];
          triggerHaptic('tap');
          announceToScreenReader(`تم اختيار القارئ الشيخ ${newReciter.name}`);
          if (audio.isPlaying) {
            const targetSurah = audio.currentSurah || selectedSurahForAudio;
            audio.loadAndPlay(
              targetSurah,
              newId,
              getSurahName(targetSurah),
              newReciter.name
            );
          }
        }}
        onOpenReciterModal={() => setShowReciterModal(true)}
        onOpenOfflineAudioModal={() => setShowOfflineAudioModal(true)}
        onToggleAutoPlayNext={audio.toggleAutoPlayNext}
        onStopAyahRangeLoop={audio.stopAyahRangeLoop}
        onStartAyahRangeLoop={handleStartAyahRangeLoop}
        setAyahRangeStart={setAyahRangeStart}
        setAyahRangeEnd={setAyahRangeEnd}
        setRangeRepeatCount={setRangeRepeatCount}
        setRepeatTab={setRepeatTab}
        setRepeatCount={audio.setRepeatCount}
        onOpenMultiSurahModal={() => setShowMultiSurahModal(true)}
        onToggleMultiSurahLoop={(enable) => audio.toggleMultiSurahLoop(enable)}
      />

      {/* Android & PWA Installation Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Global Audio Player Bar when audio is active */}
      {audio.currentSurah > 0 && (
        <AudioPlayerComponent
          isPlaying={audio.isPlaying}
          currentTime={audio.currentTime}
          duration={audio.duration}
          isLoading={audio.isLoading}
          surahName={audio.surahName}
          reciterName={audio.reciterName}
          playbackRate={audio.playbackRate}
          isRepeat={audio.isRepeat}
          repeatCount={audio.repeatCount}
          remainingRepeats={audio.remainingRepeats}
          segmentA={audio.segmentA}
          segmentB={audio.segmentB}
          isSegmentLooping={audio.isSegmentLooping}
          isAyahRangeLooping={audio.isAyahRangeLooping}
          ayahRangeStart={audio.ayahRangeStart}
          ayahRangeEnd={audio.ayahRangeEnd}
          currentAyahNumber={audio.currentAyahNumber}
          onStopAyahRangeLoop={audio.stopAyahRangeLoop}
          onTogglePlay={audio.togglePlayPause}
          onSeek={audio.seek}
          onSetSpeed={audio.setPlaybackRate}
          onToggleRepeat={audio.toggleRepeat}
          onSetRepeatCount={audio.setRepeatCount}
          onSetSegmentA={() => audio.setSegmentA()}
          onSetSegmentB={() => audio.setSegmentB()}
          onClearSegment={audio.clearSegment}
          onToggleSegmentLoop={audio.toggleSegmentLoop}
          onSkip={audio.skipTime}
          autoPlayNext={audio.autoPlayNext}
          onNextSurah={audio.playNextSurah}
          onPreviousSurah={audio.playPreviousSurah}
          onToggleAutoPlayNext={audio.toggleAutoPlayNext}
          onClose={audio.stop}
          onOpenReciterSelect={() => setShowReciterModal(true)}
          onOpenOfflineAudio={() => setShowOfflineAudioModal(true)}
        />
      )}

      {/* Reciter Modal for Extended List of Reciters */}
      {showReciterModal && (
        <ReciterModal
          isOpen={showReciterModal}
          selectedReciterId={selectedReciterId}
          onSelectReciter={handleSelectReciterFromModal}
          onClose={() => setShowReciterModal(false)}
          onOpenOfflineAudio={() => setShowOfflineAudioModal(true)}
        />
      )}

      {/* Offline Audio Recitations Download Modal */}
      {showOfflineAudioModal && (
        <OfflineAudioModal
          isOpen={showOfflineAudioModal}
          selectedReciterId={selectedReciterId}
          currentSurah={audio.currentSurah || selectedSurahForAudio || 1}
          onClose={() => setShowOfflineAudioModal(false)}
          onSelectReciter={(id) => {
            const found = POPULAR_RECITERS.find((r) => r.id === id);
            handleSelectReciterFromModal(id, found?.name || `القارئ ${id}`);
          }}
        />
      )}

      {/* Floating Auto Voice Athkar Toast Notification */}
      {autoAthkar.currentToast && (
        <AthkarToast
          thikr={autoAthkar.currentToast}
          onDismiss={autoAthkar.dismissToast}
          onReplay={(t) => autoAthkar.triggerThikr(t)}
          isSpeaking={autoAthkar.isSpeaking}
        />
      )}

      {/* Automatic Athkar Settings Modal */}
      {showAthkarModal && (
        <AutoAthkarModal
          isOpen={showAthkarModal}
          onClose={() => setShowAthkarModal(false)}
          settings={autoAthkar.settings}
          onUpdateSettings={autoAthkar.updateSettings}
          onTestThikr={(t) => autoAthkar.triggerThikr(t)}
          isSpeaking={autoAthkar.isSpeaking}
        />
      )}

      {/* Offline Download Mushaf Modal */}
      <OfflineDownloadModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
      />

      {/* Multi-Surah Loop Modal */}
      <MultiSurahLoopModal
        isOpen={showMultiSurahModal}
        onClose={() => setShowMultiSurahModal(false)}
        selectedSurahs={audio.selectedSurahsToLoop}
        isMultiSurahLoop={audio.isMultiSurahLoop}
        currentPlayingSurah={audio.currentSurah || selectedSurahForAudio}
        onSave={(surahs, enabled) => {
          audio.setSelectedSurahsToLoop(surahs);
          audio.toggleMultiSurahLoop(enabled);
        }}
        onStartPlayback={(surahNum) => {
          setSelectedSurahForAudio(surahNum);
          audio.loadAndPlay(
            surahNum,
            selectedReciterId,
            getSurahName(surahNum),
            currentReciter.name
          );
        }}
      />

      {/* Edit Reading Progress Modal (Linked to Mobile User) */}
      <EditReadingProgressModal
        isOpen={showEditProgressModal}
        onClose={() => setShowEditProgressModal(false)}
        currentPage={currentStoppedPage}
        pagesRead={actualPagesRead}
        onProgressUpdated={refreshProgress}
      />

      {/* Accessibility & Blind Assistance Modal */}
      <AccessibilityModal
        isOpen={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
      />

      {/* Prayer Times Modal */}
      <PrayerTimesModal
        isOpen={showPrayerModal}
        onClose={() => setShowPrayerModal(false)}
        prayerHook={prayerTimes}
      />

      {/* Comprehensive Read Quran Modal (All tabs, search & audio) */}
      <ReadQuranModal
        isOpen={showReadQuranModal}
        onClose={() => setShowReadQuranModal(false)}
        bookmarks={bookmarks}
        progress={progress}
        isPlayingAudio={audio.isPlaying}
        currentPlayingSurah={audio.currentSurah || selectedSurahForAudio}
        currentReciterName={currentReciter.name}
        onPlaySurah={handlePlaySurah}
      />

      {/* Floating Blind Voice Assistant Button (FAB) for Instant One-Tap Voice Access */}
      <div className={`fixed ${audio.currentSurah > 0 ? 'bottom-20' : 'bottom-6'} left-4 z-40`}>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            setShowVoiceAssistantModal(true);
          }}
          className="relative group flex items-center gap-2 p-3 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-[#C8A85B] to-[#997732] text-[#123B2A] font-bold shadow-2xl border-2 border-[#F7EED8] hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-[#C8A85B]/30"
          aria-label="المساعد الصوتي لنور القرآن - انطق اسم السورة لتشغيلها بصوتك"
          title="المساعد الصوتي لنور القرآن - انطق اسم السورة لتشغيلها"
        >
          <span className="text-xl sm:text-2xl animate-bounce">🎙️</span>
          <span className="hidden sm:inline text-xs font-black tracking-wide text-[#123B2A] whitespace-nowrap">
            انطق اسم السورة
          </span>
          {/* Subtle pulsating glow ring */}
          <span className="absolute -inset-1 rounded-full bg-[#C8A85B]/30 animate-pulse -z-10 pointer-events-none" />
        </button>
      </div>

      {/* Blind Voice Assistant Modal (Speech Recognition & Hands-Free Player) */}
      <BlindVoiceAssistantModal
        isOpen={showVoiceAssistantModal}
        onClose={handleCloseVoiceModal}
        onExecuteCommand={handleVoiceCommandResult}
      />

      {/* Quran Live Radios Modal */}
      <QuranRadiosModal
        isOpen={showRadiosModal}
        onClose={() => setShowRadiosModal(false)}
      />

      {/* Floating Radio Mini Player when a station is active and playing */}
      {quranRadio.currentStation && quranRadio.isPlaying && (
        <div
          className={`fixed ${audio.currentSurah > 0 ? 'bottom-20' : 'bottom-4'} right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-40 p-3 rounded-2xl border-2 border-[#C8A85B] shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-white transition-all`}
          style={{ backgroundColor: 'rgba(18, 59, 42, 0.95)' }}
          dir="rtl"
        >
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            onClick={() => setShowRadiosModal(true)}
          >
            <span className="text-2xl shrink-0">{quranRadio.currentStation.flag}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <p className="text-xs font-bold text-[#FFD700] truncate">
                  {quranRadio.currentStation.name}
                </p>
              </div>
              <p className="text-[10px] text-white/70 truncate">
                بث مباشر • انقر لفتح قائمة الإذاعات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => quranRadio.togglePlayPause()}
              className="p-2 rounded-xl bg-[#C8A85B] text-[#123B2A] font-bold text-xs hover:bg-[#d6b76c] transition active:scale-95 cursor-pointer shadow-sm"
              title={quranRadio.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {quranRadio.isPlaying ? '⏸' : '▶️'}
            </button>
            <button
              type="button"
              onClick={() => quranRadio.stopRadio()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition active:scale-95 cursor-pointer text-xs"
              title="إغلاق الإذاعة"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
