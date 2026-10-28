'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ReadingProgress, Bookmark } from '@/types/quran';
import { getReadingProgress, saveReadingProgress, getBookmarks, getPagesVisited, getSettings, saveSettings } from '@/lib/storage';
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
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { triggerHaptic, speakAccessibility, announceToScreenReader } from '@/lib/accessibility';

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
    speakAccessibility(`بدء تكرار سورة ${meta?.name || ''} من آية ${start} إلى ${end}، ${rangeRepeatCount === 999 ? 'مستمر' : `${rangeRepeatCount} مرات`}`);
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
    if (audio.isPlaying) {
      triggerHaptic('pause');
      speakAccessibility('إيقاف مؤقت');
      announceToScreenReader('تم إيقاف التلاوة مؤقتاً');
      audio.pause();
    } else if (audio.currentSurah === selectedSurahForAudio && audio.currentTime > 0) {
      triggerHaptic('play');
      speakAccessibility(`استئناف تلاوة سورة ${sName}`);
      announceToScreenReader(`استئناف تلاوة سورة ${sName}`);
      audio.play();
    } else {
      triggerHaptic('play');
      speakAccessibility(`تشغيل سورة ${sName} بصوت الشيخ ${currentReciter.name}`);
      announceToScreenReader(`تشغيل سورة ${sName} بصوت الشيخ ${currentReciter.name}`);
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
    speakAccessibility(`تم اختيار القارئ الشيخ ${newReciter.name}`);
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
      speakAccessibility(`إيقاف الاستماع لسورة ${sName}`);
      announceToScreenReader(`تم إيقاف تلاوة سورة ${sName}`);
      audio.pause();
    } else {
      triggerHaptic('play');
      speakAccessibility(`تشغيل سورة ${sName} بصوت الشيخ ${currentReciter.name}`);
      announceToScreenReader(`تشغيل سورة ${sName} بصوت الشيخ ${currentReciter.name}`);
      audio.loadAndPlay(
        surahNumber,
        selectedReciterId,
        sName,
        currentReciter.name
      );
    }
  }, [audio, selectedReciterId, currentReciter.name]);

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
      {/* Header */}
      <header
        className="px-6 pt-8 pb-6 shadow-md"
        style={{ backgroundColor: '#123B2A', color: 'white' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Dedication Banner: صدقة جارية لوالديَّ */}
          <div
            className="mb-5 mx-auto max-w-fit flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl border border-[#C8A85B]/60 shadow-md transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(200, 168, 91, 0.22) 0%, rgba(11, 91, 67, 0.45) 100%)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span className="text-[#C8A85B] text-base select-none">🤲</span>
            <p
              className="text-xs sm:text-sm font-bold text-[#F7EED8] text-center tracking-wide leading-relaxed"
              style={{ fontFamily: "'Tajawal', 'Amiri', serif" }}
            >
              صدقة جارية لوالديَّ أرجو الدعاء لهما بالرحمة
            </p>
            <span className="text-[#C8A85B] text-base select-none">🤲</span>
          </div>

          <div className="text-center mb-5 flex flex-col items-center">
            {/* Header Row: Animated "اقرأ القرآن" Portal Window on the Right & Official Animated Logo */}
            <div className="flex items-center justify-center gap-3.5 sm:gap-6 mb-3 w-full">
              {/* 1. On the Right (يمين الشعار في RTL): نافذة "اقرأ القرآن" الجذابة والمتحركة بنفس حركة وبريق الشعار */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  speakAccessibility('فتح نافذة اقرأ القرآن وفهرس السور والأجزاء والختمة المباركة');
                  setShowReadQuranModal(true);
                }}
                className="group relative inline-block select-none cursor-pointer focus:outline-none"
                title="اقرأ القرآن - فهرس السور والأجزاء والختمة وتصحيح التلاوة"
                aria-label="اقرأ القرآن - فتح الفهرس الشامل للسور والأجزاء وتتبع الختمة"
              >
                {/* 1. Pulsing Golden Radiant Aura Behind */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#C8A85B]/40 via-[#F5D88A]/30 to-[#C8A85B]/40 animate-logo-aura -z-10 pointer-events-none" />
                <div className="absolute -inset-1 rounded-3xl bg-radial from-[#C8A85B]/30 via-transparent to-transparent animate-pulse -z-10 pointer-events-none" />

                {/* 2. Main Container with Floating Breathing Animation & Metallic Rim */}
                <div
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-2 sm:border-[2.5px] border-[#C8A85B]/80 overflow-hidden shadow-2xl animate-logo-breathing transform-gpu transition-all duration-300 group-hover:scale-105 active:scale-95 flex flex-col items-center justify-center p-1.5 sm:p-2"
                  style={{
                    background: 'linear-gradient(135deg, #184E38 0%, #123B2A 50%, #0A271B 100%)',
                    boxShadow: '0 8px 24px -4px rgba(200, 168, 91, 0.45), 0 4px 12px rgba(18, 59, 42, 0.25)',
                  }}
                >
                  {/* Glowing Islamic Mushaf Icon */}
                  <div className="relative mb-0.5">
                    <span className="text-2xl sm:text-3xl filter drop-shadow-[0_2px_8px_rgba(200,168,91,0.6)]">
                      📖
                    </span>
                  </div>

                  {/* Title: اقرأ القرآن */}
                  <span
                    className="font-bold text-xs sm:text-sm text-[#F7EED8] tracking-wide leading-tight text-center"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    اقرأ القرآن
                  </span>

                  {/* Subtitle Badge */}
                  <span
                    className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full bg-[#C8A85B]/25 text-[#F5D88A] border border-[#C8A85B]/40 font-medium mt-1 whitespace-nowrap"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    الفهرس الشامل
                  </span>

                  {/* 3. The Animated Flash Light Beam Sheen (Sweep) */}
                  <div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    style={{ mixBlendMode: 'screen' }}
                  >
                    <div
                      className="w-[200%] h-full animate-logo-flash"
                      style={{
                        background:
                          'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.05) 15%, rgba(255,255,255,0.4) 30%, rgba(255,248,220,0.95) 45%, rgba(255,255,255,0.9) 50%, rgba(255,248,220,0.95) 55%, rgba(255,255,255,0.4) 70%, rgba(255,255,255,0.05) 85%, transparent 100%)',
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
                      }}
                    />
                  </div>

                  {/* 4. Subtle Inner Golden Frame Rim Glow */}
                  <div className="absolute inset-0 rounded-3xl border border-white/25 pointer-events-none" />
                </div>

                {/* 5. Glowing Star Glint Sparkles */}
                <div className="absolute -top-1 -right-1 text-xs text-[#FFD700] animate-logo-sparkle pointer-events-none">
                  ✦
                </div>
                <div
                  className="absolute -bottom-1 -left-1 text-[10px] text-[#FFD700] animate-logo-sparkle pointer-events-none"
                  style={{ animationDelay: '1.5s' }}
                >
                  ✦
                </div>
              </button>

              {/* 2. Official Animated Logo */}
              <AnimatedLogo size="lg" />
            </div>

            <h1
              className="text-3xl md:text-4xl font-bold mb-1 tracking-wide"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              نور القرآن
            </h1>
            <p
              className="text-sm opacity-80 mb-3"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              رفيقك مع القرآن الكريم • المصحف الشريف
            </p>
            <div className="flex flex-col items-center gap-2 mb-3 w-full">
              {/* Row 1: Install APK & Download Mushaf */}
              <div className="flex items-center justify-center gap-2 w-full max-w-sm">
                <button
                  onClick={() => setShowInstallModal(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all hover:bg-white/15 border border-[#C8A85B]/40 active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgba(200, 168, 91, 0.18)',
                    color: '#C8A85B',
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  <span className="shrink-0">📲</span>
                  <span className="whitespace-nowrap">تثبيت التطبيق (APK)</span>
                </button>

                <button
                  onClick={() => setShowOfflineModal(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all hover:bg-white/15 border border-[#C8A85B]/40 active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  style={{
                    backgroundColor: 'rgba(200, 168, 91, 0.18)',
                    color: '#C8A85B',
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                  title="تحميل المصحف كاملاً للقراءة بدون إنترنت"
                >
                  <span className="shrink-0">📥</span>
                  <span className="whitespace-nowrap">تحميل المصحف بدون نت</span>
                </button>
              </div>

              {/* Row 2: Athkar Button & Blind Accessibility Button side-by-side in one row */}
              <div className="flex items-center justify-center gap-2 w-full max-w-sm">
                {/* 1. Athkar Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setShowAthkarModal(true);
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border active:scale-95 cursor-pointer shadow-xs whitespace-nowrap ${
                    autoAthkar?.settings?.enabled
                      ? 'border-emerald-400/60 bg-emerald-700/40 text-emerald-200 hover:bg-emerald-700/60'
                      : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                  title="إعداد الأذكار الصوتية التلقائية"
                  aria-label="إعداد الأذكار الصوتية التلقائية"
                >
                  <span className={`shrink-0 ${autoAthkar?.settings?.enabled ? 'animate-bounce' : ''}`}>🔔</span>
                  <span className="whitespace-nowrap truncate">
                    الأذكار: {autoAthkar?.settings?.enabled ? `كل ${autoAthkar?.settings?.intervalMinutes ?? 10} د` : 'متوقفة'}
                  </span>
                  <span className="text-[10px] opacity-80 bg-black/20 px-1 py-0.5 rounded-md shrink-0">⚙️</span>
                </button>

                {/* 2. Blind Accessibility Button directly beside Athkar */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setShowAccessibilityModal(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border border-[#C8A85B]/60 bg-[#C8A85B]/20 text-[#F7EED8] hover:bg-[#C8A85B]/30 active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                  title="تسهيل الوصول وخدمة المكفوفين"
                  aria-label="فتح إعدادات خدمة المكفوفين وتسهيل الوصول"
                >
                  <span className="text-sm shrink-0">🦯</span>
                  <span className="whitespace-nowrap">خدمة المكفوفين</span>
                </button>
              </div>

              {/* Row 3: Prayer Times & Countdown Bar */}
              <div className="w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setShowPrayerModal(true);
                  }}
                  className="w-full inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border border-emerald-500/50 bg-[#0E3E2B]/85 text-[#F7EED8] hover:bg-[#124D36] active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                  title="مواقيت الصلاة وموعد الأذان"
                  aria-label={`مواقيت الصلاة، موعد أذان ${prayerTimes.prayerData.nextPrayer.name} الساعة ${prayerTimes.prayerData.nextPrayer.time12}، متبقي على الأذان ${prayerTimes.prayerData.nextPrayer.remainingFormatted}`}
                >
                  <div className="inline-flex items-center gap-1.5 truncate min-w-0">
                    <span className="text-sm shrink-0">🕌</span>
                    <span className="whitespace-nowrap truncate">
                      أذان {prayerTimes.prayerData.nextPrayer.name}: {prayerTimes.prayerData.nextPrayer.time12}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium bg-black/35 border border-[#C8A85B]/40 px-2 py-0.5 rounded-full text-[#F5D88A] shadow-xs whitespace-nowrap shrink-0">
                    <span className="opacity-75">متبقي:</span>
                    <span className="font-bold text-[#FFD700]" dir="rtl">
                      {prayerTimes.prayerData.nextPrayer.remainingFormatted}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Compact Reading Progress Card linked to the mobile user */}
          <div className="w-full text-right rounded-2xl p-2.5 sm:p-3.5 mb-2.5 sm:mb-3 border border-[#C8A85B]/40 bg-gradient-to-r from-white/12 via-white/16 to-[#123B2A]/35 shadow-md backdrop-blur-md transition-all">
            {/* Header: Title, Owner Badge, Percentage & Edit */}
            <div className="flex justify-between items-center mb-1.5 whitespace-nowrap">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-base shrink-0">📖</span>
                <span
                  className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 whitespace-nowrap"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  <span className="whitespace-nowrap">تقدمك في القراءة</span>
                  <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                    صاحب الجوال
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xs font-mono font-bold text-[#C8A85B]" dir="ltr">
                  {percentage}%
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditProgressModal(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#C8A85B]/20 hover:bg-[#C8A85B]/30 text-[#C8A85B] border border-[#C8A85B]/30 active:scale-95 transition cursor-pointer whitespace-nowrap"
                  title="تعديل صفحة التوقف وعدد الصفحات المقروءة"
                >
                  <span>✏️</span>
                  <span>تعديل</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Line */}
            <div className="flex items-center justify-between text-xs mb-1.5 bg-black/20 rounded-xl px-2.5 py-1.5 border border-white/10 whitespace-nowrap overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-[#C8A85B] font-bold text-sm whitespace-nowrap shrink-0" style={{ fontFamily: "'Amiri', serif" }}>
                  صفحة {currentStoppedPage}
                </span>
                {stoppedSurahMeta && (
                  <span className="text-[11px] text-white/80 truncate whitespace-nowrap">
                    ({stoppedSurahMeta.name} • ج {stoppedSurahMeta.startPage})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/70 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
                <span className="whitespace-nowrap">{actualPagesRead} من 604 ص</span>
                <span className="text-white/40">•</span>
                <span className="text-[10px] text-white/60 whitespace-nowrap">{formatLastReadTime(progress?.updatedAt)}</span>
              </div>
            </div>

            {/* Slim Progress Bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-white/15 mb-2 relative">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#C8A85B] via-[#eed596] to-[#C8A85B]"
                style={{ width: `${Math.max(2, percentage)}%` }}
              />
            </div>

            {/* Compact Action Button */}
            <button
              type="button"
              onClick={handleContinueReading}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 active:scale-[0.99] transition shadow-xs cursor-pointer flex items-center justify-between border border-[#C8A85B]/70 whitespace-nowrap"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <span>▶</span>
                <span className="truncate whitespace-nowrap">
                  متابعة القراءة من صفحة {currentStoppedPage} {stoppedSurahMeta ? `(سورة ${stoppedSurahMeta.name})` : ''}
                </span>
              </div>
              <span className="text-[11px] font-extrabold flex-shrink-0 mr-2 whitespace-nowrap">فتح المصحف ←</span>
            </button>
          </div>

          {/* Audio Listening & Sheikh Selection Card */}
          <div
            className="rounded-2xl p-4 border border-[#C8A85B]/40 bg-white/10 backdrop-blur-md shadow-md select-none"
            onDoubleClick={handleTogglePlay}
            title="انقر نقراً مزدوجاً في أي مكان هنا للتشغيل أو الإيقاف السريع"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎧</span>
                <span className="text-sm font-bold text-[#C8A85B]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  الاستماع المباشر للقرآن الكريم
                </span>
              </div>
              {audio.isPlaying && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>جاري الاستماع الآن</span>
                </div>
              )}
            </div>

            {/* Listening Icon & Sheikh Selection Field */}
            <div className="flex items-center gap-3">
              {/* Play / Listening Icon Button on the Right */}
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={audio.isLoading}
                className={`w-13 h-13 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-95 shadow-lg flex-shrink-0 cursor-pointer border ${
                  audio.isPlaying
                    ? 'bg-[#0B5B43] text-white border-emerald-400/50 ring-4 ring-emerald-500/25 animate-pulse'
                    : 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] hover:bg-[#d4b66d]'
                }`}
                aria-label={audio.isPlaying ? 'إيقاف الاستماع' : 'استمع الآن للقرآن الكريم'}
                title={audio.isPlaying ? 'إيقاف التلاوة' : `استمع الآن بصوت الشيخ ${currentReciter.name}`}
              >
                {audio.isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
                ) : audio.isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              {/* Sheikh Names Field (حقل أسماء المشايخ) on the Left */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-1">
                  <label className="text-[11px] font-medium text-white/80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    اختر الشيخ / القارئ:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOfflineAudioModal(true)}
                      className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer font-bold transition-all hover:bg-emerald-900 shadow-xs"
                      title="تنزيل صوت الشيخ للاستماع بدون نت"
                    >
                      <span>📥</span>
                      <span>تنزيل بدون نت</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReciterModal(true)}
                      className="text-[10px] text-[#C8A85B] hover:underline cursor-pointer"
                    >
                      عرض القراء 🔍
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={selectedReciterId}
                    onChange={handleReciterChange}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C8A85B] cursor-pointer shadow-inner appearance-none"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    {POPULAR_RECITERS.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#123B2A] text-white py-1">
                        الشيخ: {r.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#C8A85B] pointer-events-none">
                    👳‍♂️
                  </span>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#C8A85B] pointer-events-none">
                    ▾
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Surah selection for audio with Prev/Next buttons */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="opacity-80 text-[11px] flex items-center gap-1">
                <span>📖</span>
                <span>سورة التلاوة:</span>
              </span>

              <div className="flex items-center gap-1.5 flex-1 max-w-[240px] justify-end">
                {/* Next Surah button on the right */}
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(114, selectedSurahForAudio + 1);
                    handlePlaySurah(next);
                  }}
                  disabled={selectedSurahForAudio >= 114}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition border border-white/10"
                  title="السورة التالية"
                  aria-label="السورة التالية"
                >
                  ⏭
                </button>

                <select
                  value={selectedSurahForAudio}
                  onChange={(e) => {
                    const sNum = parseInt(e.target.value, 10);
                    handlePlaySurah(sNum);
                  }}
                  className="flex-1 bg-[#123B2A]/80 text-[#C8A85B] font-bold text-xs px-2 py-1.5 rounded-lg border border-[#C8A85B]/40 focus:outline-none cursor-pointer truncate"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  {Object.values(SURAH_METADATA).map((s) => (
                    <option key={s.number} value={s.number} className="bg-[#123B2A] text-white">
                      {s.number}. سورة {s.name}
                    </option>
                  ))}
                </select>

                {/* Previous Surah button on the left */}
                <button
                  type="button"
                  onClick={() => {
                    const prev = Math.max(1, selectedSurahForAudio - 1);
                    handlePlaySurah(prev);
                  }}
                  disabled={selectedSurahForAudio <= 1}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition border border-white/10"
                  title="السورة السابقة"
                  aria-label="السورة السابقة"
                >
                  ⏮
                </button>
              </div>
            </div>

            {/* Auto Transition to Next Surah (الانتقال التلقائي للسورة التالية) */}
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white/90 flex items-center gap-1">
                  <span>⏭</span>
                  <span>الانتقال التلقائي للسورة التالية:</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                    audio.autoPlayNext
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-white/10 text-white/50 border border-white/10'
                  }`}
                >
                  {audio.autoPlayNext ? 'مفعّل تلقائياً ✓' : 'متوقف'}
                </span>
              </div>
              <button
                type="button"
                onClick={audio.toggleAutoPlayNext}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer border ${
                  audio.autoPlayNext
                    ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-xs'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}
                title="تفعيل أو إيقاف الانتقال التلقائي للسورة التالية بعد نهاية السورة الحالية"
              >
                {audio.autoPlayNext ? 'إيقاف التتابع' : 'تشغيل التتابع'}
              </button>
            </div>

            {/* Live Active Ayah Range Loop Card */}
            {audio.isAyahRangeLooping && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-white shadow-lg animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                    <span className="text-base">🎧</span>
                    <span>جاري تكرار الآيات: سورة {SURAH_METADATA[audio.currentSurah]?.name || ''}</span>
                  </div>
                  <button
                    type="button"
                    onClick={audio.stopAyahRangeLoop}
                    className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
                  >
                    <span>⏹</span>
                    <span>إيقاف التكرار</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-1.5 border-t border-emerald-500/30">
                  <span className="bg-black/30 px-2.5 py-1 rounded-md text-emerald-200">
                    النطاق: من الآية {audio.ayahRangeStart} إلى {audio.ayahRangeEnd}
                  </span>
                  <span className="bg-emerald-500/20 px-2.5 py-1 rounded-md font-bold text-[#FBF8EF]">
                    الآية الجارية: {audio.currentAyahNumber || audio.ayahRangeStart}
                  </span>
                  <span className="bg-[#C8A85B] text-[#123B2A] px-2.5 py-1 rounded-md font-extrabold">
                    {audio.repeatCount === 999
                      ? 'تكرار مستمر ∞'
                      : `متبقي: ${audio.remainingRepeats} من ${audio.repeatCount} مرات`}
                  </span>
                </div>
              </div>
            )}

            {/* Repetition & Segment Looping Controls (تكرار التلاوة وتحديد المقاطع) */}
            <div className="mt-3 pt-2.5 border-t border-white/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#C8A85B] flex items-center gap-1.5">
                  <span className="text-base">🔁</span>
                  <span>تكرار التلاوة للحفظ والإتقان:</span>
                </span>
                {audio.repeatCount > 1 && !audio.isAyahRangeLooping && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A85B] text-[#123B2A] font-extrabold shadow-sm animate-pulse">
                    {audio.repeatCount === 999
                      ? 'تكرار مستمر ∞'
                      : `متبقي: ${audio.remainingRepeats} من ${audio.repeatCount} مرات`}
                  </span>
                )}
              </div>

              {/* Mode Tabs: Ayah Range vs Whole Surah vs Time AB */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/20 mb-3 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setRepeatTab('ayahs')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                    repeatTab === 'ayahs'
                      ? 'bg-[#C8A85B] text-[#123B2A] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  📖 تكرار بالآيات
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatTab('surah')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                    repeatTab === 'surah'
                      ? 'bg-[#C8A85B] text-[#123B2A] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  🔁 كامل السورة
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatTab('multi')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                    repeatTab === 'multi'
                      ? 'bg-[#C8A85B] text-[#123B2A] shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  📚 تكرار عدة سور
                </button>
              </div>

              {/* TAB 1: Ayah Range Repetition (اختيار بداية ونهاية المقطع بالآيات) */}
              {repeatTab === 'ayahs' && (
                <div className="bg-[#123B2A]/90 rounded-2xl p-3 border border-[#C8A85B]/40 flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between text-xs text-white/90">
                    <span className="font-bold flex items-center gap-1 text-[#C8A85B]">
                      <span>🎯</span>
                      <span>حدد بداية ونهاية المقطع ليتكرر:</span>
                    </span>
                    <span className="text-[11px] opacity-75">
                      سورة {currentSurahMeta.name} ({totalVerses} آية)
                    </span>
                  </div>

                  {/* Start Ayah & End Ayah Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Start Ayah */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-white/80 font-medium flex items-center gap-1">
                        <span>🟢</span>
                        <span>بداية المقطع (من الآية):</span>
                      </label>
                      <select
                        value={ayahRangeStart}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setAyahRangeStart(val);
                          if (ayahRangeEnd < val) {
                            setAyahRangeEnd(val);
                          }
                          triggerHaptic('tap');
                          speakAccessibility(`بداية المقطع من الآية ${val}`);
                        }}
                        aria-label="اختيار بداية المقطع من الآية"
                        className="w-full bg-[#0D281C] text-[#C8A85B] font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/50 focus:outline-none cursor-pointer"
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        {Array.from({ length: totalVerses }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num} className="bg-[#123B2A] text-white">
                            الآية {num}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* End Ayah */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-white/80 font-medium flex items-center gap-1">
                        <span>🛑</span>
                        <span>نهاية المقطع (إلى الآية):</span>
                      </label>
                      <select
                        value={ayahRangeEnd}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          const finalEnd = Math.max(ayahRangeStart, val);
                          setAyahRangeEnd(finalEnd);
                          triggerHaptic('tap');
                          speakAccessibility(`نهاية المقطع إلى الآية ${finalEnd}`);
                        }}
                        aria-label="اختيار نهاية المقطع إلى الآية"
                        className="w-full bg-[#0D281C] text-[#C8A85B] font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/50 focus:outline-none cursor-pointer"
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        {Array.from({ length: totalVerses - ayahRangeStart + 1 }, (_, i) => ayahRangeStart + i).map((num) => (
                          <option key={num} value={num} className="bg-[#123B2A] text-white">
                            الآية {num}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Custom Repetition Count Defined by the User */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs text-white/90 mb-2 flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-[#C8A85B]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                        <span>🔢</span>
                        <span>حدد عدد مرات التكرار بنفسك:</span>
                      </span>
                      <span className="text-[11px] font-bold text-[#F7EED8] bg-black/40 px-2.5 py-0.5 rounded-lg border border-[#C8A85B]/30">
                        {rangeRepeatCount === 999 ? 'مستمر بلا توقف ∞' : `${rangeRepeatCount} مرات`}
                      </span>
                    </div>

                    {/* Stepper & Direct Custom Number Input */}
                    <div className="flex items-center gap-2 mb-2 bg-[#0D281C] p-2 rounded-xl border border-[#C8A85B]/40">
                      <span className="text-[11px] text-white/80 font-bold shrink-0">مرات التكرار:</span>
                      
                      {/* Decrease button */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          if (rangeRepeatCount === 999) {
                            setRangeRepeatCount(10);
                            speakAccessibility('عدد التكرار 10');
                          } else {
                            const nextVal = Math.max(1, rangeRepeatCount - 1);
                            setRangeRepeatCount(nextVal);
                            speakAccessibility(`عدد التكرار ${nextVal}`);
                          }
                        }}
                        aria-label="إنقاص عدد مرات التكرار بمقدار واحد"
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center border border-white/10 cursor-pointer active:scale-95"
                        title="إنقاص مرة واحدة"
                      >
                        -
                      </button>

                      {/* Direct Numeric Input Box */}
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={rangeRepeatCount === 999 ? '' : rangeRepeatCount}
                        placeholder={rangeRepeatCount === 999 ? '∞ مستمر' : '1'}
                        aria-label="إدخال عدد مرات التكرار يدوياً"
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            const clamped = Math.min(500, val);
                            setRangeRepeatCount(clamped);
                            speakAccessibility(`عدد التكرار ${clamped}`);
                          } else if (e.target.value === '') {
                            setRangeRepeatCount(1);
                          }
                        }}
                        className="flex-1 bg-black/40 text-[#C8A85B] text-center font-bold text-base py-1 px-2 rounded-lg border border-[#C8A85B]/60 focus:outline-none focus:ring-1 focus:ring-[#C8A85B]"
                      />

                      {/* Increase button */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          if (rangeRepeatCount === 999) {
                            setRangeRepeatCount(1);
                            speakAccessibility('عدد التكرار 1');
                          } else {
                            const nextVal = Math.min(500, rangeRepeatCount + 1);
                            setRangeRepeatCount(nextVal);
                            speakAccessibility(`عدد التكرار ${nextVal}`);
                          }
                        }}
                        aria-label="زيادة عدد مرات التكرار بمقدار واحد"
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center border border-white/10 cursor-pointer active:scale-95"
                        title="زيادة مرة واحدة"
                      >
                        +
                      </button>

                      {/* Infinite Loop Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          const nextVal = rangeRepeatCount === 999 ? 3 : 999;
                          setRangeRepeatCount(nextVal);
                          speakAccessibility(nextVal === 999 ? 'تكرار مستمر بلا توقف' : 'تكرار 3 مرات');
                        }}
                        aria-label="تفعيل أو إيقاف التكرار المستمر"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                          rangeRepeatCount === 999
                            ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-xs'
                            : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                        }`}
                      >
                        مستمر ∞
                      </button>
                    </div>
                  </div>

                  {/* Compact Yellow Button: تشغيل وتكرار من آية إلى آية */}
                  <button
                    type="button"
                    onClick={handleStartAyahRangeLoop}
                    disabled={audio.isLoading}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg font-bold text-xs bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 active:scale-[0.99] transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 border border-[#C8A85B]"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    <span className="text-xs">🔁</span>
                    <span className="font-extrabold text-xs">
                      تشغيل وتكرار من آية {ayahRangeStart} إلى {ayahRangeEnd}
                    </span>
                    <span className="bg-[#123B2A]/15 px-1.5 py-0.5 rounded text-[10px] font-black">
                      ({rangeRepeatCount === 999 ? 'مستمر ∞' : `${rangeRepeatCount} مرات`})
                    </span>
                  </button>
                </div>
              )}

              {/* TAB 2: Full Surah Repetition */}
              {repeatTab === 'surah' && (
                <div className="bg-[#123B2A]/90 rounded-2xl p-3 border border-[#C8A85B]/40 flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between text-xs text-white/90">
                    <span className="font-bold text-[#C8A85B]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      تكرار سورة {currentSurahMeta.name} بالكامل:
                    </span>
                    {audio.repeatCount > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A85B] text-[#123B2A] font-bold">
                        {audio.repeatCount === 999
                          ? 'مستمر ∞'
                          : `متبقي: ${audio.remainingRepeats} من ${audio.repeatCount}`}
                      </span>
                    )}
                  </div>

                  {/* Stepper & Direct Custom Number Input for Surah */}
                  <div className="flex items-center gap-2 bg-[#0D281C] p-2 rounded-xl border border-[#C8A85B]/40">
                    <span className="text-[11px] text-white/80 font-bold shrink-0">مرات التكرار:</span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        if (audio.repeatCount === 999) {
                          audio.setRepeatCount(10);
                          speakAccessibility('تكرار السورة 10 مرات');
                        } else {
                          const nextVal = Math.max(1, audio.repeatCount - 1);
                          audio.setRepeatCount(nextVal);
                          speakAccessibility(`تكرار السورة ${nextVal} مرات`);
                        }
                      }}
                      aria-label="إنقاص عدد تكرار السورة"
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center border border-white/10 cursor-pointer active:scale-95"
                      title="إنقاص مرة واحدة"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={audio.repeatCount === 999 ? '' : audio.repeatCount}
                      placeholder={audio.repeatCount === 999 ? '∞ مستمر' : '1'}
                      aria-label="إدخال عدد مرات تكرار السورة يدوياً"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          const clamped = Math.min(500, val);
                          audio.setRepeatCount(clamped);
                          speakAccessibility(`تكرار السورة ${clamped} مرات`);
                        } else if (e.target.value === '') {
                          audio.setRepeatCount(1);
                        }
                      }}
                      className="flex-1 bg-black/40 text-[#C8A85B] text-center font-bold text-base py-1 px-2 rounded-lg border border-[#C8A85B]/60 focus:outline-none focus:ring-1 focus:ring-[#C8A85B]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        if (audio.repeatCount === 999) {
                          audio.setRepeatCount(1);
                          speakAccessibility('تكرار السورة مرة واحدة');
                        } else {
                          const nextVal = Math.min(500, audio.repeatCount + 1);
                          audio.setRepeatCount(nextVal);
                          speakAccessibility(`تكرار السورة ${nextVal} مرات`);
                        }
                      }}
                      aria-label="زيادة عدد تكرار السورة"
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center border border-white/10 cursor-pointer active:scale-95"
                      title="زيادة مرة واحدة"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        const nextVal = audio.repeatCount === 999 ? 3 : 999;
                        audio.setRepeatCount(nextVal);
                        speakAccessibility(nextVal === 999 ? 'تكرار السورة مستمر بلا توقف' : 'تكرار السورة 3 مرات');
                      }}
                      aria-label="تفعيل أو إلغاء تكرار السورة المستمر"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                        audio.repeatCount === 999
                          ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-xs'
                          : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                      }`}
                    >
                      مستمر ∞
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="w-full mt-1.5 py-1.5 px-3 rounded-lg font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] transition cursor-pointer shadow-md"
                  >
                    {audio.isPlaying ? '⏸ إيقاف مؤقت' : `▶ تشغيل سورة ${currentSurahMeta.name}`}
                  </button>
                </div>
              )}

              {/* TAB 3: Multi-Surah Loop */}
              {repeatTab === 'multi' && (
                <div className="bg-[#123B2A]/90 rounded-2xl p-3 border border-[#C8A85B]/40 flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between text-xs text-white/90">
                    <span className="font-bold flex items-center gap-1.5 text-[#C8A85B]">
                      <span>📚</span>
                      <span>تكرار قائمة سور مخصصة:</span>
                    </span>
                    {audio.isMultiSurahLoop && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold animate-pulse">
                        مفعّل ({audio.selectedSurahsToLoop.length} سور)
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-white/80 leading-relaxed">
                    اختر مجموعة سور محددة (مثل المعوذات، جزء عم، يس والواقعة والملك) ليقوم المشغل بتكرارها تتابعاً بلا توقف للحفظ والمراجعة.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMultiSurahModal(true)}
                      className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>⚙️</span>
                      <span>
                        {audio.selectedSurahsToLoop.length > 0
                          ? `تعديل السور المحددة (${audio.selectedSurahsToLoop.length})`
                          : 'تحديد السور للتكرار'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => audio.toggleMultiSurahLoop()}
                      disabled={audio.selectedSurahsToLoop.length === 0}
                      className={`py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer border ${
                        audio.isMultiSurahLoop
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : audio.selectedSurahsToLoop.length > 0
                          ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                          : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {audio.isMultiSurahLoop ? 'إيقاف التكرار' : 'بدء التكرار'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
    </div>
  );
}
