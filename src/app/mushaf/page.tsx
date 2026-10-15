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
  saveReadingProgress,
  addPageVisited,
  getPagesVisited,
  getSettings,
  saveSettings,
  updateBookmarkNote,
  updateKhatmahProgress,
  recordWirdProgress,
} from '@/lib/storage';
import { SURAH_NAMES, POPULAR_RECITERS, getSurahMeta } from '@/lib/quran-meta';
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
import MushafSkeleton from '@/components/mushaf/MushafSkeleton';



// Helper to get the chapter number from a verse
function getChapterNumber(verse: Verse): number {
  return verse.chapterId || verse.chapterNumber || parseInt(verse.verseKey?.split(':')[0] || '1', 10);
}

function MushafReaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Math.max(1, Math.min(604, parseInt(searchParams.get('page') || '1', 10) || 1));

  const { currentPage, verses, isLoading, error, goToPage, nextPage, previousPage, refetch } = useMushafPage(initialPage);
  const audio = useAudioPlayer();

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
  const [showReciterSelect, setShowReciterSelect] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Load settings and bookmarks from localStorage
  useEffect(() => {
    setSettings(getSettings());
    setBookmarks(getBookmarks());
  }, []);

  // Save reading progress
  useEffect(() => {
    if (verses.length > 0) {
      const firstVerse = verses[0];
      const chapterNum = getChapterNumber(firstVerse);
      saveReadingProgress({
        pageNumber: currentPage,
        surahNumber: chapterNum,
        ayahNumber: firstVerse.verseNumber,
        updatedAt: new Date().toISOString(),
      });
      addPageVisited(currentPage);
      updateKhatmahProgress(currentPage);
      recordWirdProgress(1);
    }
  }, [currentPage, verses]);

  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', currentPage.toString());
    window.history.replaceState({}, '', url.toString());
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

  const mainSurahName = chaptersOnPage.length > 0
    ? SURAH_NAMES[chaptersOnPage[0]] || `سورة ${chaptersOnPage[0]}`
    : '';

  const juzNumber = verses.length > 0 ? verses[0].juzNumber : undefined;

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

  if (isLoading && verses.length === 0) {
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
        className="flex-1 px-4 py-6 md:px-8 lg:px-16 max-w-4xl mx-auto w-full page-transition"
        onClick={handleCenterTap}
        role="main"
        aria-label={`صفحة ${currentPage} من المصحف`}
      >
        {error ? (
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
          </div>
        ) : (
          /* Mushaf Mode - Page-oriented continuous text */
          <div dir="rtl">
            {groupedVerses.map((group) => (
              <div key={group.chapterNumber}>
                {/* Surah Header */}
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
          onTogglePlay={audio.togglePlayPause}
          onSeek={audio.seek}
          onSetSpeed={audio.setPlaybackRate}
          onToggleRepeat={audio.toggleRepeat}
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
