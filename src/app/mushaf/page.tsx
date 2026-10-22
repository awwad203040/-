'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { Verse, Bookmark, UserSettings } from '@/types/quran';
import { useMushafPage } from '@/hooks/useMushafPage';
import { useSwipe } from '@/hooks/useSwipe';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked as checkIsBookmarked,
  getReadingProgress,
  saveReadingProgress,
  addPageVisited,
  getPagesVisited,
  getSettings,
  saveSettings,
  updateBookmarkNote,
  updateKhatmahProgress,
  recordWirdProgress,
} from '@/lib/storage';
import { SURAH_NAMES, POPULAR_RECITERS, getSurahMeta, getSurahForPage, parseArabicOrWesternNumber } from '@/lib/quran-meta';
import MushafToolbar from '@/components/mushaf/MushafToolbar';
import PageNavigator from '@/components/mushaf/PageNavigator';
import AyahActions from '@/components/mushaf/AyahActions';
import TafsirModal from '@/components/mushaf/TafsirModal';
import AudioPlayerComponent from '@/components/mushaf/AudioPlayer';
import ReadingProgressComponent from '@/components/mushaf/ReadingProgress';
import SettingsPanel from '@/components/mushaf/SettingsPanel';
import SearchModal from '@/components/mushaf/SearchModal';
import ReciterModal from '@/components/mushaf/ReciterModal';
import RecitationCorrectionModal from '@/components/mushaf/RecitationCorrectionModal';
import OfflineDownloadModal from '@/components/mushaf/OfflineDownloadModal';
import MushafSkeleton from '@/components/mushaf/MushafSkeleton';
import { useAutoAthkar } from '@/hooks/useAutoAthkar';
import AthkarToast from '@/components/common/AthkarToast';



// Helper to get the chapter number from a verse
function getChapterNumber(verse: Verse): number {
  return verse.chapterId || verse.chapterNumber || parseInt(verse.verseKey?.split(':')[0] || '1', 10);
}

function MushafReaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');

  // Compute starting page accurately:
  // 1. If explicit ?page=X param in URL -> use it (supports Arabic-Indic numerals)
  // 2. Otherwise retrieve the last saved reading page from localStorage
  // 3. Fallback to 1 only if neither exists
  const initialPage = (() => {
    if (pageParam) {
      const parsed = parseArabicOrWesternNumber(pageParam);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 604) {
        return parsed;
      }
    }
    if (typeof window !== 'undefined') {
      const saved = getReadingProgress();
      if (saved && saved.pageNumber >= 1 && saved.pageNumber <= 604) {
        return saved.pageNumber;
      }
    }
    return 1;
  })();

  const { currentPage, verses, isLoading, error, goToPage, nextPage, previousPage, refetch } = useMushafPage(initialPage);
  const audio = useAudioPlayer();
  const autoAthkar = useAutoAthkar();

  // Synchronize page when user clicks browser Back/Forward history
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const p = url.searchParams.get('page');
      if (p) {
        const parsed = parseArabicOrWesternNumber(p);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 604) {
          goToPage(parsed);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [goToPage]);

  // Synchronize immediately whenever URL ?page= changes (e.g. user clicked any surah from home)
  useEffect(() => {
    if (pageParam) {
      const parsed = parseArabicOrWesternNumber(pageParam);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 604 && parsed !== currentPage) {
        goToPage(parsed);
      }
    }
  }, [pageParam, currentPage, goToPage]);

  const [settings, setSettings] = useState<UserSettings>({
    fontSize: 28,
    nightMode: false,
    readingMode: 'mushaf',
    selectedReciterId: 7,
    selectedTafsirId: 169,
  });
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirVerse, setTafsirVerse] = useState<Verse | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionVerse, setCorrectionVerse] = useState<Verse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);
  const [showReciterSelect, setShowReciterSelect] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showPageVersesDrawer, setShowPageVersesDrawer] = useState(false);
  const [pageImageError, setPageImageError] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // Reset page image error when changing pages
  useEffect(() => {
    setPageImageError(false);
  }, [currentPage]);

  // Prefetch adjacent Madinah Mushaf page images for instant transitions
  useEffect(() => {
    if (currentPage < 604) {
      const nextImg = new Image();
      nextImg.src = `https://files.quran.app/hafs/madani/width_1024/page${(currentPage + 1).toString().padStart(3, '0')}.png`;
    }
    if (currentPage > 1) {
      const prevImg = new Image();
      prevImg.src = `https://files.quran.app/hafs/madani/width_1024/page${(currentPage - 1).toString().padStart(3, '0')}.png`;
    }
  }, [currentPage]);

  // Load settings and bookmarks from localStorage
  useEffect(() => {
    setSettings(getSettings());
    setBookmarks(getBookmarks());
  }, []);

  // Save reading progress immediately whenever currentPage changes
  useEffect(() => {
    if (currentPage >= 1 && currentPage <= 604) {
      const firstVerse = verses.length > 0 ? verses[0] : null;
      const chapterNum = firstVerse ? getChapterNumber(firstVerse) : 1;
      saveReadingProgress({
        pageNumber: currentPage,
        surahNumber: chapterNum,
        ayahNumber: firstVerse ? firstVerse.verseNumber : 1,
        updatedAt: new Date().toISOString(),
      });
      addPageVisited(currentPage);
      updateKhatmahProgress(currentPage);
      recordWirdProgress(1);
    }
  }, [currentPage, verses]);

  // Update URL query parameter and scroll to top smoothly when page changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentPage >= 1 && currentPage <= 604) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('page') !== currentPage.toString()) {
        url.searchParams.set('page', currentPage.toString());
        window.history.replaceState({}, '', url.toString());
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage]);

  // Night mode
  useEffect(() => {
    if (settings.nightMode) {
      document.documentElement.classList.add('night-mode');
    } else {
      document.documentElement.classList.remove('night-mode');
    }
  }, [settings.nightMode]);

  const handleUpdateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Reciter selection handler
  const handleSelectReciter = useCallback((id: number, name: string) => {
    handleUpdateSettings({ selectedReciterId: id });
    if (audio.currentSurah > 0) {
      const surahName = SURAH_NAMES[audio.currentSurah] || `سورة ${audio.currentSurah}`;
      audio.loadAndPlay(audio.currentSurah, id, surahName, name);
    }
  }, [audio, handleUpdateSettings]);

  // Keyboard navigation (Accessibility: Section 32)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        // Arabic RTL: Left arrow advances to next page
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowRight') {
        // Right arrow moves to previous page
        e.preventDefault();
        previousPage();
      } else if (e.key === ' ' && audio.currentSurah > 0) {
        // Space key toggles audio playback
        e.preventDefault();
        audio.togglePlayPause();
      } else if (e.key === 'Escape') {
        // Escape closes any open modal
        setSelectedVerse(null);
        setShowTafsir(false);
        setShowCorrection(false);
        setShowSettings(false);
        setShowSearch(false);
        setShowReciterSelect(false);
        setShowNoteModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, previousPage, audio]);

  // Swipe navigation (RTL: swipe right = previous, swipe left = next)
  const swipeRef = useSwipe({
    onSwipeLeft: nextPage,
    onSwipeRight: previousPage,
    threshold: 50,
  });

  // Get unique chapter numbers on this page
  const chaptersOnPage = verses.reduce<number[]>((acc, v) => {
    const ch = getChapterNumber(v);
    if (!acc.includes(ch)) acc.push(ch);
    return acc;
  }, []);

  const pageMeta = getSurahForPage(currentPage);
  const mainSurahName = chaptersOnPage.length > 0
    ? SURAH_NAMES[chaptersOnPage[0]] || `سورة ${chaptersOnPage[0]}`
    : pageMeta ? `سورة ${pageMeta.name}` : '';

  const juzNumber = verses.length > 0 ? verses[0].juzNumber : (pageMeta ? Math.min(30, Math.ceil(currentPage / 20)) : undefined);

  const isPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  const handleBookmarkPage = useCallback(() => {
    if (isPageBookmarked) {
      const bm = bookmarks.find((b) => b.pageNumber === currentPage);
      if (bm) {
        removeBookmark(bm.id);
        setBookmarks(getBookmarks());
      }
    } else if (verses.length > 0) {
      const v = verses[0];
      const chNum = getChapterNumber(v);
      addBookmark({
        id: uuidv4(),
        surahNumber: chNum,
        ayahNumber: v.verseNumber,
        pageNumber: currentPage,
        verseKey: v.verseKey,
        createdAt: new Date().toISOString(),
      });
      setBookmarks(getBookmarks());
    }
  }, [isPageBookmarked, bookmarks, currentPage, verses]);

  const handleVerseBookmark = useCallback((verse: Verse) => {
    const chNum = getChapterNumber(verse);
    if (checkIsBookmarked(chNum, verse.verseNumber)) {
      const bm = bookmarks.find((b) => b.surahNumber === chNum && b.ayahNumber === verse.verseNumber);
      if (bm) removeBookmark(bm.id);
    } else {
      addBookmark({
        id: uuidv4(),
        surahNumber: chNum,
        ayahNumber: verse.verseNumber,
        pageNumber: currentPage,
        verseKey: verse.verseKey,
        createdAt: new Date().toISOString(),
      });
    }
    setBookmarks(getBookmarks());
    setSelectedVerse(null);
  }, [bookmarks, currentPage]);

  const handleCopy = useCallback((verse: Verse) => {
    const text = `${verse.textUthmani}\n\n[${verse.verseKey}] — نور القرآن`;
    navigator.clipboard.writeText(text).catch(() => {});
    setSelectedVerse(null);
  }, []);

  const handleShare = useCallback(async (verse: Verse) => {
    const chNum = getChapterNumber(verse);
    const surahName = SURAH_NAMES[chNum] || `سورة ${chNum}`;
    const text = `${verse.textUthmani}\n\nسورة ${surahName} - الآية ${verse.verseNumber}\nنور القرآن`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${surahName} - ${verse.verseKey}`, text });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setSelectedVerse(null);
  }, []);

  const handlePlayVerse = useCallback((verse: Verse) => {
    const chNum = getChapterNumber(verse);
    const surahName = SURAH_NAMES[chNum] || `سورة ${chNum}`;
    const reciter = POPULAR_RECITERS.find((r) => r.id === (settings.selectedReciterId || 7));
    const reciterName = reciter?.name || 'مشاري راشد العفاسي';
    audio.loadAndPlay(chNum, settings.selectedReciterId || 7, surahName, reciterName, verse.verseKey);
    setSelectedVerse(null);
  }, [audio, settings.selectedReciterId]);

  const handlePlayRepeatVerse = useCallback((verse: Verse, count: number = 3) => {
    const chNum = getChapterNumber(verse);
    const surahName = SURAH_NAMES[chNum] || `سورة ${chNum}`;
    const reciter = POPULAR_RECITERS.find((r) => r.id === (settings.selectedReciterId || 7));
    const reciterName = reciter?.name || 'مشاري راشد العفاسي';
    audio.setRepeatCount(count);
    audio.loadAndPlay(chNum, settings.selectedReciterId || 7, surahName, reciterName, verse.verseKey);
    setSelectedVerse(null);
  }, [audio, settings.selectedReciterId]);

  const handlePlayRangeRepeatVerse = useCallback((verse: Verse, startAyah: number, endAyah: number, count: number = 3) => {
    const chNum = getChapterNumber(verse);
    const reciter = POPULAR_RECITERS.find((r) => r.id === (settings.selectedReciterId || 7));
    const reciterName = reciter?.name || 'مشاري راشد العفاسي';
    audio.startAyahRangeLoop(chNum, startAyah, endAyah, settings.selectedReciterId || 7, reciterName, count);
    setSelectedVerse(null);
  }, [audio, settings.selectedReciterId]);

  const handleOpenTafsir = useCallback((verse: Verse) => {
    setTafsirVerse(verse);
    setShowTafsir(true);
    setSelectedVerse(null);
  }, []);

  const handleOpenCorrection = useCallback((verse: Verse) => {
    setCorrectionVerse(verse);
    setShowCorrection(true);
    setSelectedVerse(null);
  }, []);

  // Navigation for Recitation Correction across verses on the page
  const currentCorrectionIndex = verses.findIndex(
    (v) => (v.id && v.id === correctionVerse?.id) || (v.verseKey && v.verseKey === correctionVerse?.verseKey)
  );

  const handleNextCorrectionVerse = useCallback(() => {
    if (currentCorrectionIndex >= 0 && currentCorrectionIndex < verses.length - 1) {
      setCorrectionVerse(verses[currentCorrectionIndex + 1]);
    }
  }, [currentCorrectionIndex, verses]);

  const handlePrevCorrectionVerse = useCallback(() => {
    if (currentCorrectionIndex > 0) {
      setCorrectionVerse(verses[currentCorrectionIndex - 1]);
    }
  }, [currentCorrectionIndex, verses]);

  const hasNextCorrectionVerse = currentCorrectionIndex >= 0 && currentCorrectionIndex < verses.length - 1;
  const hasPrevCorrectionVerse = currentCorrectionIndex > 0;

  const handleAddNote = useCallback((verse: Verse) => {
    setNoteVerse(verse);
    setNoteInput('');
    setShowNoteModal(true);
    setSelectedVerse(null);
  }, []);

  const handleSaveNote = useCallback(() => {
    if (noteVerse && noteInput.trim()) {
      const chNum = getChapterNumber(noteVerse);
      // First bookmark the verse if not already bookmarked
      if (!checkIsBookmarked(chNum, noteVerse.verseNumber)) {
        addBookmark({
          id: uuidv4(),
          surahNumber: chNum,
          ayahNumber: noteVerse.verseNumber,
          pageNumber: currentPage,
          verseKey: noteVerse.verseKey,
          note: noteInput.trim(),
          createdAt: new Date().toISOString(),
        });
      } else {
        const bm = bookmarks.find((b) => b.surahNumber === chNum && b.ayahNumber === noteVerse.verseNumber);
        if (bm) updateBookmarkNote(bm.id, noteInput.trim());
      }
      setBookmarks(getBookmarks());
    }
    setShowNoteModal(false);
    setNoteVerse(null);
    setNoteInput('');
  }, [noteVerse, noteInput, currentPage, bookmarks]);

  // Toggle controls visibility on center tap (mobile)
  const handleCenterTap = useCallback(() => {
    setControlsVisible((prev) => !prev);
  }, []);

  // Group verses by chapter for rendering surah headers
  const groupedVerses: { chapterNumber: number; verses: Verse[] }[] = [];
  let currentChapter = -1;
  for (const verse of verses) {
    const ch = getChapterNumber(verse);
    if (ch !== currentChapter) {
      currentChapter = ch;
      groupedVerses.push({ chapterNumber: ch, verses: [] });
    }
    groupedVerses[groupedVerses.length - 1].verses.push(verse);
  }

  const pagesVisited = typeof window !== 'undefined' ? getPagesVisited().length : 0;

  // Night mode background color
  const bgColor = settings.nightMode ? '#0D1F17' : '#FBF8EF';
  const textColor = settings.nightMode ? '#E8E4D9' : '#17231D';
  const verseNumberBg = settings.nightMode ? '#C8A85B' : '#C8A85B';

  // Only show full skeleton in verse-by-verse mode; in mushaf page mode the authentic page image renders immediately
  if (isLoading && verses.length === 0 && settings.readingMode === 'verse') {
    return <MushafSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Toolbar */}
      {controlsVisible && (
        <MushafToolbar
          currentPage={currentPage}
          surahName={mainSurahName}
          juzNumber={juzNumber}
          hizbNumber={verses.length > 0 ? verses[0].hizbNumber : undefined}
          onBack={() => router.push('/')}
          onSettings={() => setShowSettings(true)}
          onSearch={() => setShowSearch(true)}
          onOpenPageJump={() => setShowPageJumpModal(true)}
          onOpenOfflineModal={() => setShowOfflineModal(true)}
          onOpenCorrection={() => {
            if (verses.length > 0) {
              handleOpenCorrection(verses[0]);
            }
          }}
        />
      )}

      {/* Reading Progress */}
      {controlsVisible && (
        <ReadingProgressComponent
          currentPage={currentPage}
          totalPages={604}
          pagesRead={pagesVisited}
        />
      )}

      {/* Quran Content */}
      <main
        ref={swipeRef}
        className="flex-1 px-2 sm:px-4 py-3 sm:py-6 md:px-8 lg:px-16 max-w-4xl mx-auto w-full page-transition"
        role="main"
        aria-label={`صفحة ${currentPage} من المصحف`}
      >
        {error && (settings.readingMode === 'verse' || pageImageError) ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div
              className="text-6xl mb-4"
              style={{ color: '#C8A85B' }}
            >
              ⚠️
            </div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: textColor, fontFamily: "'Tajawal', sans-serif" }}
            >
              تعذر تحميل الصفحة
            </h2>
            <p
              className="text-sm mb-6 opacity-70"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              تحقق من اتصال الإنترنت وحاول مرة أخرى.
            </p>
            <div className="flex gap-3">
              <button
                onClick={refetch}
                className="px-6 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
              >
                إعادة المحاولة
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 rounded-xl font-medium"
                style={{
                  backgroundColor: 'rgba(18,59,42,0.1)',
                  color: '#123B2A',
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                العودة
              </button>
            </div>
          </div>
        ) : settings.readingMode === 'verse' ? (
          /* Verse-by-Verse Mode */
          <div className="space-y-1" dir="rtl">
            {groupedVerses.map((group) => (
              <div key={group.chapterNumber}>
                {/* Surah Header - show if verse 1 is on this page */}
                {group.verses.some((v) => v.verseNumber === 1) && (
                  <div className="surah-header my-6 p-4 rounded-2xl text-center shadow-sm border-2 border-[#C8A85B]/60">
                    {/* Badges bar */}
                    {(() => {
                      const meta = getSurahMeta(group.chapterNumber);
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs font-semibold px-2 mb-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
                              سورة {group.chapterNumber}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-[#C8A85B]/25 text-[#123B2A]">
                              {meta?.revelationPlace === 'makkah' ? 'مكية 🕋' : 'مدنية 🕌'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
                              {meta?.versesCount || group.verses.length} آية
                            </span>
                          </div>

                          <div className="py-1">
                            <div className="surah-name text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Amiri', serif" }}>
                              سورة {meta?.name || SURAH_NAMES[group.chapterNumber] || group.chapterNumber}
                            </div>
                            {meta?.englishName && (
                              <div className="text-xs opacity-60 mt-1" dir="ltr" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                                {meta.englishName}
                              </div>
                            )}
                          </div>

                          {/* Bismillah - not shown for Surah 9 (At-Tawbah) or Surah 1 */}
                          {group.chapterNumber !== 9 && group.chapterNumber !== 1 && (
                            <div className="bismillah mt-3 text-lg md:text-xl font-bold" style={{ fontFamily: "'Amiri', serif" }}>
                              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {group.verses.map((verse) => (
                  <div
                    key={verse.id || verse.verseKey}
                    className="py-4 px-3 rounded-xl mb-2 cursor-pointer transition-colors hover:bg-[#123B2A]/5"
                    style={{
                      borderBottom: `1px solid ${settings.nightMode ? 'rgba(200,168,91,0.1)' : 'rgba(18,59,42,0.08)'}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVerse(verse);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`الآية ${verse.verseKey}`}
                  >
                    <p
                      className="quran-text"
                      style={{
                        fontSize: `${settings.fontSize}px`,
                        color: textColor,
                      }}
                    >
                      {verse.textUthmani}
                      <span className="verse-number" style={{ backgroundColor: verseNumberBg }}>
                        {verse.verseNumber}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ))}
            {/* Quick Page Navigation for Verse Mode */}
            <div className="w-full mt-6 flex items-center justify-between gap-3 text-xs font-bold pt-4 border-t border-[#C8A85B]/30">
              <button
                type="button"
                onClick={nextPage}
                disabled={currentPage >= 604}
                className="flex-1 py-3 px-3 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif", touchAction: 'manipulation' }}
              >
                <span>◀ الصفحة التالية ({currentPage < 604 ? currentPage + 1 : 604})</span>
              </button>
              <button
                type="button"
                onClick={previousPage}
                disabled={currentPage <= 1}
                className="flex-1 py-3 px-3 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif", touchAction: 'manipulation' }}
              >
                <span>({currentPage > 1 ? currentPage - 1 : 1}) الصفحة السابقة ▶</span>
              </button>
            </div>
          </div>
        ) : !pageImageError ? (
          /* Madinah Mushaf Page View - Identical to King Fahd Complex / User's Uploaded Image */
          <div className="relative w-full flex flex-col items-center justify-center select-none py-1">
            {/* Quick Top Info Bar */}
            <div className="w-full max-w-2xl mb-2 flex items-center justify-between text-xs font-bold px-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A] border border-[#123B2A]/20">
                {mainSurahName}
              </span>
              <span className="text-[#C8A85B] font-bold">
                صفحة {currentPage} من 604
              </span>
              {juzNumber && (
                <span className="px-3 py-1 rounded-full bg-[#C8A85B]/20 text-[#123B2A] border border-[#C8A85B]/30">
                  الجزء {juzNumber}
                </span>
              )}
            </div>

            {/* Page Container with Screen Tap Navigation */}
            <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border-2 border-[#C8A85B]/50 bg-[#FBF8EF]">
              {/* Authentic Madinah Mushaf Page Image */}
              <img
                src={`https://files.quran.app/hafs/madani/width_1024/page${currentPage.toString().padStart(3, '0')}.png`}
                alt={`مصحف المدينة المنورة - صفحة ${currentPage}`}
                onError={() => setPageImageError(true)}
                className={`w-full h-auto max-h-[85vh] object-contain transition-all duration-200 pointer-events-none ${
                  settings.nightMode ? 'invert-[0.92] hue-rotate-180 brightness-95 contrast-125' : ''
                }`}
                loading="eager"
              />

              {/* Interactive Screen Tap Navigation Zones */}
              <div className="absolute inset-0 z-20 flex select-none">
                {/* Left 40%: Next Page (RTL) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPage();
                  }}
                  className="w-[40%] h-full cursor-pointer flex items-center justify-start pl-3 group active:bg-white/10 transition-colors"
                  aria-label="الانتقال للصفحة التالية"
                  title="اضغط هنا للذهاب للصفحة التالية (▶)"
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="p-3 rounded-full bg-black/60 text-white backdrop-blur-xs text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    ◀ التالي ({currentPage < 604 ? currentPage + 1 : 604})
                  </span>
                </div>

                {/* Center 20%: Toggle Menu & Toolbar Controls */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setControlsVisible((prev) => !prev);
                  }}
                  className="w-[20%] h-full cursor-pointer"
                  aria-label="إظهار أو إخفاء القوائم والأشرطة"
                  title="اضغط في الوسط لإظهار أو إخفاء الأشرطة"
                  style={{ touchAction: 'manipulation' }}
                />

                {/* Right 40%: Previous Page (RTL) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    previousPage();
                  }}
                  className="w-[40%] h-full cursor-pointer flex items-center justify-end pr-3 group active:bg-white/10 transition-colors"
                  aria-label="الانتقال للصفحة السابقة"
                  title="اضغط هنا للرجوع للصفحة السابقة (◀)"
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="p-3 rounded-full bg-black/60 text-white backdrop-blur-xs text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    ({currentPage > 1 ? currentPage - 1 : 1}) السابق ▶
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Page Navigation Controls */}
            <div className="w-full max-w-2xl mt-3 flex items-center justify-between px-1 gap-2 text-xs font-bold">
              {/* Next Page Button */}
              <button
                type="button"
                onClick={nextPage}
                disabled={currentPage >= 604}
                className="flex-1 py-3 px-3 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                title="الانتقال إلى الصفحة التالية"
              >
                <span>◀ الصفحة التالية ({currentPage < 604 ? currentPage + 1 : 604})</span>
              </button>

              {/* Verses Drawer Trigger */}
              <button
                type="button"
                onClick={() => setShowPageVersesDrawer(!showPageVersesDrawer)}
                className="py-3 px-3.5 rounded-xl border border-[#C8A85B]/70 bg-[#C8A85B] text-[#123B2A] hover:bg-[#d6b86e] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                title="تفسير واستماع آيات هذه الصفحة"
              >
                <span>📖</span>
                <span>{showPageVersesDrawer ? 'إخفاء الآيات' : 'آيات وتفسير الصفحة'}</span>
              </button>

              {/* Previous Page Button */}
              <button
                type="button"
                onClick={previousPage}
                disabled={currentPage <= 1}
                className="flex-1 py-3 px-3 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                title="الرجوع إلى الصفحة السابقة"
              >
                <span>({currentPage > 1 ? currentPage - 1 : 1}) الصفحة السابقة ▶</span>
              </button>
            </div>

            {/* Expandable Verses List for Tafsir & Audio Interaction */}
            {showPageVersesDrawer && (
              <div className="w-full max-w-2xl mt-4 bg-white/95 rounded-2xl p-4 border border-[#C8A85B]/50 shadow-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-[#123B2A]/10">
                  <span className="font-bold text-sm text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    آيات الصفحة {currentPage} ({verses.length} آية)
                  </span>
                  <span className="text-xs text-gray-500 font-sans">
                    اضغط على أي آية للاستماع أو التفسير
                  </span>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {verses.map((verse) => (
                    <div
                      key={verse.id || verse.verseKey}
                      onClick={() => setSelectedVerse(verse)}
                      className="p-3 rounded-xl bg-black/5 hover:bg-[#123B2A]/10 transition-colors cursor-pointer border border-transparent hover:border-[#C8A85B]/40"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span className="font-bold text-[#123B2A]">الآية {verse.verseKey}</span>
                        <span className="text-[#C8A85B]">اضغط للخيارات والتفسير ▾</span>
                      </div>
                      <p className="text-base text-[#17231D] leading-relaxed font-bold" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                        {verse.textUthmani}
                        <span className="verse-number inline-flex mr-1" style={{ backgroundColor: verseNumberBg }}>
                          {verse.verseNumber}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mushaf Mode Fallback - Page-oriented continuous text */
          <div dir="rtl">
            {groupedVerses.map((group) => (
              <div key={group.chapterNumber}>
                {/* Surah Header */}
                {group.verses.some((v) => v.verseNumber === 1) && (
                  <div className="surah-header my-6 p-4 rounded-2xl text-center shadow-sm border-2 border-[#C8A85B]/60">
                    {(() => {
                      const meta = getSurahMeta(group.chapterNumber);
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs font-semibold px-2 mb-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
                              سورة {group.chapterNumber}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-[#C8A85B]/25 text-[#123B2A]">
                              {meta?.revelationPlace === 'makkah' ? 'مكية 🕋' : 'مدنية 🕌'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
                              {meta?.versesCount || group.verses.length} آية
                            </span>
                          </div>

                          <div className="py-1">
                            <div className="surah-name text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Amiri', serif" }}>
                              سورة {meta?.name || SURAH_NAMES[group.chapterNumber] || group.chapterNumber}
                            </div>
                            {meta?.englishName && (
                              <div className="text-xs opacity-60 mt-1" dir="ltr" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                                {meta.englishName}
                              </div>
                            )}
                          </div>

                          {group.chapterNumber !== 9 && group.chapterNumber !== 1 && (
                            <div className="bismillah mt-3 text-lg md:text-xl font-bold" style={{ fontFamily: "'Amiri', serif" }}>
                              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                <p
                  className="quran-text-mushaf"
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    color: textColor,
                  }}
                >
                  {group.verses.map((verse) => (
                    <span
                      key={verse.id || verse.verseKey}
                      className="cursor-pointer hover:bg-[#C8A85B]/10 rounded px-0.5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVerse(verse);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`الآية ${verse.verseKey}`}
                    >
                      {verse.textUthmani}
                      <span className="verse-number" style={{ backgroundColor: verseNumberBg }}>
                        {verse.verseNumber}
                      </span>
                      {' '}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Juz indicator */}
        {juzNumber && (
          <div className="text-center mt-6 mb-2">
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                backgroundColor: settings.nightMode ? 'rgba(200,168,91,0.15)' : 'rgba(18,59,42,0.08)',
                color: settings.nightMode ? '#C8A85B' : '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              الجزء {juzNumber}
            </span>
          </div>
        )}

        {/* Loading indicator for page transitions */}
        {isLoading && verses.length > 0 && (
          <div className="flex justify-center py-4">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: '#C8A85B', borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      {controlsVisible && (
        <PageNavigator
          currentPage={currentPage}
          onPrevious={previousPage}
          onNext={nextPage}
          onGoToPage={goToPage}
          onBookmarkPage={handleBookmarkPage}
          isBookmarked={isPageBookmarked}
          isOpenModal={showPageJumpModal}
          onCloseModal={() => setShowPageJumpModal(false)}
        />
      )}

      {/* Audio Player */}
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
          onOpenReciterSelect={() => setShowReciterSelect(true)}
        />
      )}

      {/* Ayah Actions Bottom Sheet */}
      {selectedVerse && (
        <AyahActions
          verse={selectedVerse}
          isBookmarked={checkIsBookmarked(getChapterNumber(selectedVerse), selectedVerse.verseNumber)}
          onClose={() => setSelectedVerse(null)}
          onPlay={() => handlePlayVerse(selectedVerse)}
          onPlayRepeat={(count) => handlePlayRepeatVerse(selectedVerse, count)}
          onPlayRangeRepeat={(start, end, count) => handlePlayRangeRepeatVerse(selectedVerse, start, end, count)}
          onCorrection={() => handleOpenCorrection(selectedVerse)}
          onTafsir={() => handleOpenTafsir(selectedVerse)}
          onBookmark={() => handleVerseBookmark(selectedVerse)}
          onCopy={() => handleCopy(selectedVerse)}
          onShare={() => handleShare(selectedVerse)}
          onAddNote={() => handleAddNote(selectedVerse)}
        />
      )}

      {/* Recitation Correction Modal */}
      {showCorrection && correctionVerse && (
        <RecitationCorrectionModal
          verse={correctionVerse}
          isOpen={showCorrection}
          onClose={() => {
            setShowCorrection(false);
            setCorrectionVerse(null);
          }}
          onNextVerse={handleNextCorrectionVerse}
          onPrevVerse={handlePrevCorrectionVerse}
          hasNextVerse={hasNextCorrectionVerse}
          hasPrevVerse={hasPrevCorrectionVerse}
          selectedReciterId={settings.selectedReciterId || 7}
          nightMode={settings.nightMode}
        />
      )}

      {/* Tafsir Modal */}
      {showTafsir && tafsirVerse && (
        <TafsirModal
          verse={tafsirVerse}
          onClose={() => { setShowTafsir(false); setTafsirVerse(null); }}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onUpdateSettings={handleUpdateSettings}
          onOpenReciterSelect={() => {
            setShowSettings(false);
            setShowReciterSelect(true);
          }}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onNavigateToPage={goToPage}
        nightMode={settings.nightMode}
      />

      {/* Reciter Modal */}
      <ReciterModal
        isOpen={showReciterSelect}
        selectedReciterId={settings.selectedReciterId || 7}
        onSelectReciter={handleSelectReciter}
        onClose={() => setShowReciterSelect(false)}
        nightMode={settings.nightMode}
      />

      {/* Note Modal */}
      {showNoteModal && noteVerse && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowNoteModal(false)}
          />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: bgColor }}
          >
            <h3
              className="text-lg font-bold mb-4 text-center"
              style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
            >
              إضافة ملاحظة
            </h3>
            <p className="text-sm text-center mb-3" style={{ color: textColor, opacity: 0.7 }}>
              الآية {noteVerse.verseKey}
            </p>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              className="w-full px-4 py-3 rounded-xl border-2 text-sm resize-none h-32"
              style={{
                borderColor: '#C8A85B',
                color: textColor,
                backgroundColor: 'transparent',
                fontFamily: "'Tajawal', sans-serif",
              }}
              dir="rtl"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSaveNote}
                className="flex-1 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
              >
                حفظ
              </button>
              <button
                onClick={() => { setShowNoteModal(false); setNoteVerse(null); }}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ color: '#123B2A', backgroundColor: 'rgba(18,59,42,0.1)', fontFamily: "'Tajawal', sans-serif" }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </>
      )}

      {/* Offline Download Mushaf Modal */}
      <OfflineDownloadModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        nightMode={settings.nightMode}
      />

      {/* Floating Auto Voice Athkar Toast Notification */}
      {autoAthkar.currentToast && (
        <AthkarToast
          thikr={autoAthkar.currentToast}
          onDismiss={autoAthkar.dismissToast}
          onReplay={(t) => autoAthkar.triggerThikr(t)}
          isSpeaking={autoAthkar.isSpeaking}
        />
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function MushafPage() {
  return (
    <Suspense fallback={<MushafSkeleton />}>
      <MushafReaderInner />
    </Suspense>
  );
}
