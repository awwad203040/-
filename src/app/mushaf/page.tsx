'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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
  setRealReadingPosition,
  addPageVisited,
  getPagesVisited,
  getSettings,
  saveSettings,
  updateBookmarkNote,
  updateKhatmahProgress,
  recordWirdProgress,
} from '@/lib/storage';
import { SURAH_NAMES, POPULAR_RECITERS, getSurahMeta, getSurahForPage, parseArabicOrWesternNumber, getJuzForPage, getHizbForPage } from '@/lib/quran-meta';
import MushafToolbar from '@/components/mushaf/MushafToolbar';
import PageNavigator from '@/components/mushaf/PageNavigator';
import AyahActions from '@/components/mushaf/AyahActions';
import TafsirModal from '@/components/mushaf/TafsirModal';
import AudioPlayerComponent from '@/components/mushaf/AudioPlayer';
import ReadingProgressComponent from '@/components/mushaf/ReadingProgress';
import SettingsPanel from '@/components/mushaf/SettingsPanel';
import SearchModal from '@/components/mushaf/SearchModal';
import ReciterModal from '@/components/mushaf/ReciterModal';
import OfflineAudioModal from '@/components/mushaf/OfflineAudioModal';
import RecitationCorrectionModal from '@/components/mushaf/RecitationCorrectionModal';
import OfflineDownloadModal from '@/components/mushaf/OfflineDownloadModal';
import MushafSkeleton from '@/components/mushaf/MushafSkeleton';
import PageVersesTafsirDrawer from '@/components/mushaf/PageVersesTafsirDrawer';
import VerseCopyModal from '@/components/mushaf/VerseCopyModal';
import { useAutoAthkar } from '@/hooks/useAutoAthkar';
import AthkarToast from '@/components/common/AthkarToast';
import { getPageFromIDB } from '@/lib/offline-manager';
import { stopAccessibilitySpeech } from '@/lib/accessibility';



// Helper to get the chapter number from a verse
function getChapterNumber(verse: Verse): number {
  return verse.chapterId || verse.chapterNumber || parseInt(verse.verseKey?.split(':')[0] || '1', 10);
}

function MushafReaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page');

  // Compute starting page accurately:
  // 1. Direct window.location.search FIRST (instant and synchronous in browser)
  // 2. Next.js searchParams fallback
  // 3. Otherwise retrieve the last saved reading page from localStorage
  // 4. Fallback to 1 only if neither exists
  const initialPage = (() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get('page');
      if (raw) {
        const parsed = parseArabicOrWesternNumber(raw);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 604) {
          return parsed;
        }
      }
    }
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
  const lastSyncedParamRef = useRef<string | null>(pageParam);

  // Synchronize page when user clicks browser Back/Forward history
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const p = url.searchParams.get('page');
      if (p) {
        const parsed = parseArabicOrWesternNumber(p);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 604) {
          lastSyncedParamRef.current = p;
          goToPage(parsed);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [goToPage]);

  // Synchronize only when pageParam changes externally (e.g. user selected another surah from navigation)
  useEffect(() => {
    if (pageParam && pageParam !== lastSyncedParamRef.current) {
      lastSyncedParamRef.current = pageParam;
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
    selectedTafsirId: 16,
    pageZoom: 100,
  });
  const [isLandscape, setIsLandscape] = useState(false);
  const [pageZoom, setPageZoom] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{ touchX: number; touchY: number; startX: number; startY: number } | null>(null);
  const hasMovedPanRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(100);
  const lastPinchTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  // Monitor orientation changes (Portrait vs Landscape)
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const isLand = window.innerWidth > window.innerHeight;
        setIsLandscape(isLand);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Sync zoom from settings
  useEffect(() => {
    if (settings.pageZoom && settings.pageZoom !== pageZoom) {
      setPageZoom(settings.pageZoom);
    }
  }, [settings.pageZoom]);

  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirVerse, setTafsirVerse] = useState<Verse | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionVerse, setCorrectionVerse] = useState<Verse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);
  const [showReciterSelect, setShowReciterSelect] = useState(false);
  const [showOfflineAudioModal, setShowOfflineAudioModal] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteVerse, setNoteVerse] = useState<Verse | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showPageVersesDrawer, setShowPageVersesDrawer] = useState(false);
  const [pageImageError, setPageImageError] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [stopMarkToast, setStopMarkToast] = useState<string | null>(null);

  const handleSetStopMark = useCallback(() => {
    setRealReadingPosition(currentPage, false);
    setStopMarkToast(`📌 تم تثبيت صفحة ${currentPage} كموضع توقفك الحالي في القراءة`);
    setTimeout(() => {
      setStopMarkToast(null);
    }, 2800);
  }, [currentPage]);

  // Check if current page is stored in IndexedDB (offline-ready for all mobile devices)
  useEffect(() => {
    let active = true;
    let urlToRevoke: string | null = null;

    async function loadOfflinePage() {
      try {
        const blob = await getPageFromIDB(currentPage);
        if (active && blob) {
          urlToRevoke = URL.createObjectURL(blob);
          setOfflineBlobUrl(urlToRevoke);
          return;
        }
      } catch {}
      if (active) {
        setOfflineBlobUrl(null);
      }
    }

    loadOfflinePage();

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [currentPage]);

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
    stopAccessibilitySpeech();
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

  // Update URL query parameter smoothly when user flips pages
  useEffect(() => {
    if (typeof window !== 'undefined' && currentPage >= 1 && currentPage <= 604) {
      const pageStr = currentPage.toString();
      lastSyncedParamRef.current = pageStr;
      const url = new URL(window.location.href);
      if (url.searchParams.get('page') !== pageStr) {
        url.searchParams.set('page', pageStr);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [currentPage]);

  // Scroll to top on page change (crucial for reading in landscape orientation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  // Reset zoom and pan on page flip so user starts each page at standard 100%
  useEffect(() => {
    setPageZoom(100);
    setPanOffset({ x: 0, y: 0 });
    setIsPanning(false);
  }, [currentPage]);

  const swipeTouchRef = useRef<{ startX: number; startY: number; time: number; endX: number; endY: number } | null>(null);

  // Touch handlers for manual pinch-to-zoom (التوسيع والتضييق) and 1-finger panning / swipe page flipping
  const handlePageTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // 2 fingers = Pinch to zoom ONLY the Mushaf page (keep the interface fixed)
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = pageZoom;
      lastPinchTimeRef.current = Date.now();
      panStartRef.current = null;
      swipeTouchRef.current = null;
      setIsPanning(false);
    } else if (e.touches.length === 1 && pageZoom > 100) {
      // 1 finger = Pan / Drag the zoomed page
      panStartRef.current = {
        touchX: e.touches[0].clientX,
        touchY: e.touches[0].clientY,
        startX: panOffset.x,
        startY: panOffset.y,
      };
      hasMovedPanRef.current = false;
      swipeTouchRef.current = null;
      setIsPanning(true);
    } else if (e.touches.length === 1 && pageZoom <= 100) {
      // 1 finger at normal zoom = Swipe page flipping (سحب لليمين أو اليسار للتنقل بين الصفحات)
      swipeTouchRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        endX: e.touches[0].clientX,
        endY: e.touches[0].clientY,
        time: Date.now(),
      };
      panStartRef.current = null;
      setIsPanning(false);
    }
  }, [pageZoom, panOffset]);

  // Native non-passive touch listeners to block WebView / browser native viewport zoom
  // ensuring ONLY the Mushaf reading page scales while the UI remains 100% stationary
  useEffect(() => {
    const el = pageContainerRef.current;
    if (!el) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && e.cancelable) {
        e.preventDefault();
      }
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      if ((e.touches.length === 2 || (e.touches.length === 1 && pageZoom > 100)) && e.cancelable) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    el.addEventListener('touchmove', onNativeTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onNativeTouchStart);
      el.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, [pageZoom]);

  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePageTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current && pinchStartDistRef.current > 0) {
      // Pinch scaling: minimum zoom is strictly 100% (cannot shrink below default size)
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = currentDist / pinchStartDistRef.current;
      const calculatedZoom = Math.min(260, Math.max(100, Math.round(pinchStartZoomRef.current * scale)));
      setPageZoom(calculatedZoom);
      if (calculatedZoom <= 100) {
        setPanOffset({ x: 0, y: 0 });
      }
      lastPinchTimeRef.current = Date.now();
    } else if (e.touches.length === 1 && panStartRef.current && pageZoom > 100) {
      // 1-finger pan movement: effortlessly drag in all 4 directions (up, down, left, right)
      if (e.cancelable) e.preventDefault();

      const dx = e.touches[0].clientX - panStartRef.current.touchX;
      const dy = e.touches[0].clientY - panStartRef.current.touchY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedPanRef.current = true;
        lastPinchTimeRef.current = Date.now();
      }

      const container = pageContainerRef.current;
      const width = container ? container.clientWidth : (typeof window !== 'undefined' ? window.innerWidth : 400);
      const height = container ? container.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 600);
      const scale = pageZoom / 100;
      // Generous bounds for smooth movement in all directions: up/down and left/right
      const maxPanX = Math.max(120, ((scale - 1) * width) / 2 + 200);
      const maxPanY = Math.max(200, ((scale - 1) * height) / 2 + 350);

      const nextX = panStartRef.current.startX + dx;
      const nextY = panStartRef.current.startY + dy;

      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, nextX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, nextY)),
      });
    } else if (e.touches.length === 1 && pageZoom <= 100 && swipeTouchRef.current) {
      swipeTouchRef.current.endX = e.touches[0].clientX;
      swipeTouchRef.current.endY = e.touches[0].clientY;
    }
  }, [pageZoom]);

  const handlePageTouchEnd = useCallback(() => {
    // 1. Check if user performed a horizontal swipe to flip page
    if (swipeTouchRef.current && pageZoom <= 100) {
      const dx = swipeTouchRef.current.startX - swipeTouchRef.current.endX;
      const dy = swipeTouchRef.current.startY - swipeTouchRef.current.endY;
      const dt = Date.now() - swipeTouchRef.current.time;
      // Horizontal swipe threshold: dx > 35px, horizontal dominance, within 800ms
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35 && dt < 800) {
        if (dx > 0) {
          // Swipe Left in Arabic RTL -> Next Page
          nextPage();
        } else {
          // Swipe Right in Arabic RTL -> Previous Page
          previousPage();
        }
      }
      swipeTouchRef.current = null;
    }

    if (pinchStartDistRef.current !== null) {
      pinchStartDistRef.current = null;
      lastPinchTimeRef.current = Date.now();
      setPageZoom((prev) => {
        if (prev <= 102) {
          setPanOffset({ x: 0, y: 0 });
          return 100;
        }
        return Math.max(100, Math.min(260, prev));
      });
    }
    if (panStartRef.current !== null) {
      panStartRef.current = null;
      setIsPanning(false);
      if (hasMovedPanRef.current) {
        lastPinchTimeRef.current = Date.now();
      }
    }
  }, [pageZoom, nextPage, previousPage]);

  // Mouse pan handlers for desktop / mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (pageZoom > 100 && e.button === 0) {
      isMouseDownRef.current = true;
      panStartRef.current = {
        touchX: e.clientX,
        touchY: e.clientY,
        startX: panOffset.x,
        startY: panOffset.y,
      };
      hasMovedPanRef.current = false;
      setIsPanning(true);
    }
  }, [pageZoom, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current && panStartRef.current && pageZoom > 100) {
      const dx = e.clientX - panStartRef.current.touchX;
      const dy = e.clientY - panStartRef.current.touchY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedPanRef.current = true;
        lastPinchTimeRef.current = Date.now();
      }

      const container = pageContainerRef.current;
      const width = container ? container.clientWidth : 400;
      const height = container ? container.clientHeight : 600;
      const scale = pageZoom / 100;
      const maxPanX = Math.max(120, ((scale - 1) * width) / 2 + 200);
      const maxPanY = Math.max(200, ((scale - 1) * height) / 2 + 350);

      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, panStartRef.current.startX + dx)),
        y: Math.max(-maxPanY, Math.min(maxPanY, panStartRef.current.startY + dy)),
      });
    }
  }, [pageZoom]);

  const handleMouseUp = useCallback(() => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      panStartRef.current = null;
      setIsPanning(false);
      if (hasMovedPanRef.current) {
        lastPinchTimeRef.current = Date.now();
      }
    }
  }, []);

  // Single tap toggles menu/toolbars, Double tap toggles zoom (100% <-> 150%)
  // Never turns pages on page surface clicks!
  const handlePageTap = useCallback(() => {
    if (hasMovedPanRef.current || Date.now() - lastPinchTimeRef.current < 450) {
      return;
    }

    const now = Date.now();
    if (now - lastTapTimeRef.current < 320) {
      // Double tap detected: cancel single-tap toolbar toggle and toggle zoom
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      setPageZoom((prev) => {
        if (prev > 105) {
          setPanOffset({ x: 0, y: 0 });
          return 100;
        } else {
          return 150;
        }
      });
    } else {
      lastTapTimeRef.current = now;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        setControlsVisible((prev) => !prev);
        singleTapTimerRef.current = null;
      }, 330);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);


  // Reciter selection handler
  const handleSelectReciter = useCallback((id: number, name: string) => {
    handleUpdateSettings({ selectedReciterId: id });
    const targetSurah = audio.currentSurah > 0 ? audio.currentSurah : (getSurahForPage(currentPage)?.number || 1);
    const surahName = SURAH_NAMES[targetSurah] || `سورة ${targetSurah}`;
    audio.loadAndPlay(targetSurah, id, surahName, name, audio.currentVerseKey || undefined);
  }, [audio, handleUpdateSettings, currentPage]);

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

  // Swipe navigation enabled: swipe left for next page, swipe right for previous page
  const swipeRef = useSwipe({
    onSwipeLeft: nextPage,
    onSwipeRight: previousPage,
    threshold: 40,
    disabled: false,
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

  const juzNumber = verses.length > 0 && verses[0].juzNumber ? verses[0].juzNumber : getJuzForPage(currentPage);
  const hizbNumber = verses.length > 0 && verses[0].hizbNumber ? verses[0].hizbNumber : getHizbForPage(currentPage);

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

  const handleTogglePlayVerseFromDrawer = useCallback((verse: Verse) => {
    const chNum = getChapterNumber(verse);
    if (audio.isPlaying && (audio.currentVerseKey === verse.verseKey || (audio.currentSurah === chNum && !audio.currentVerseKey))) {
      audio.stop();
      return;
    }
    const surahName = SURAH_NAMES[chNum] || `سورة ${chNum}`;
    const reciter = POPULAR_RECITERS.find((r) => r.id === (settings.selectedReciterId || 7));
    const reciterName = reciter?.name || 'مشاري راشد العفاسي';
    audio.loadAndPlay(chNum, settings.selectedReciterId || 7, surahName, reciterName, verse.verseKey);
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
          hizbNumber={hizbNumber}
          onBack={() => router.push('/')}
          onSettings={() => setShowSettings(true)}
          onSearch={() => setShowSearch(true)}
          onOpenPageJump={() => setShowPageJumpModal(true)}
          onOpenOfflineModal={() => setShowOfflineModal(true)}
          onOpenCopyModal={() => setShowCopyModal(true)}
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
        className={`flex-1 ${
          isLandscape
            ? 'px-0 sm:px-1 py-1 max-w-none w-full'
            : 'px-2 sm:px-4 py-2 sm:py-6 md:px-8 lg:px-16 max-w-4xl'
        } mx-auto w-full page-transition landscape:px-0 landscape:py-1 landscape:max-w-none`}
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
                    className="py-4 px-3 rounded-xl mb-2 cursor-pointer transition-colors hover:bg-[#123B2A]/5 select-text"
                    style={{
                      borderBottom: `1px solid ${settings.nightMode ? 'rgba(200,168,91,0.1)' : 'rgba(18,59,42,0.08)'}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const sel = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
                      if (!sel) {
                        setSelectedVerse(verse);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`الآية ${verse.verseKey}`}
                  >
                    <p
                      className="quran-text select-text cursor-text"
                      style={{
                        fontSize: `${Math.round((settings.fontSize * pageZoom) / 100)}px`,
                        color: textColor,
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                      }}
                    >
                      {verse.textUthmani}
                      <span className="verse-number select-none" style={{ backgroundColor: verseNumberBg }}>
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
            <div
              className={`w-full mb-1.5 flex items-center justify-between text-xs font-bold px-2.5 gap-1.5 transition-all ${
                isLandscape ? 'max-w-none bg-[#123B2A]/5 py-1 rounded-lg' : 'max-w-2xl mx-auto'
              }`}
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A] border border-[#123B2A]/20">
                  {mainSurahName}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCopyModal(true)}
                  className="px-2.5 py-1 rounded-full bg-[#C8A85B]/20 hover:bg-[#C8A85B]/35 text-[#123B2A] border border-[#C8A85B]/50 flex items-center gap-1 font-bold text-[11px] active:scale-95 transition cursor-pointer shadow-2xs"
                  title="تحديد ونسخ أي آية أو جزء من صفحة التلاوة"
                >
                  <span>📋</span>
                  <span>تحديد ونسخ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPageZoom(100);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className={`text-[#C8A85B] font-bold ${pageZoom !== 100 ? 'cursor-pointer hover:underline' : ''}`}
                title={pageZoom !== 100 ? 'اضغط لإعادة مقياس الصفحة 100%' : undefined}
              >
                صفحة {currentPage} من 604 {pageZoom !== 100 ? `(تكبير ${pageZoom}%)` : ''}
              </button>
              {juzNumber && (
                <span className="px-3 py-1 rounded-full bg-[#C8A85B]/20 text-[#123B2A] border border-[#C8A85B]/30 shrink-0">
                  الجزء {juzNumber}
                </span>
              )}
            </div>

            {/* Page Container with Touch Pinch-to-Zoom, 1-Finger Panning and Screen Tap Navigation */}
            <div
              ref={pageContainerRef}
              onTouchStart={handlePageTouchStart}
              onTouchMove={handlePageTouchMove}
              onTouchEnd={handlePageTouchEnd}
              onTouchCancel={handlePageTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={handlePageTap}
              className={`relative w-full ${
                isLandscape ? 'max-w-none w-full rounded-none sm:rounded-2xl' : 'max-w-2xl rounded-2xl'
              } mx-auto flex items-center justify-center overflow-hidden shadow-2xl border-2 border-[#C8A85B]/50 bg-[#FBF8EF] landscape:max-w-none select-none ${
                pageZoom > 100 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''
              }`}
              style={{
                touchAction: pageZoom > 100 ? 'none' : 'pan-y',
              }}
            >
              {/* Scaled and Panned Inner Content */}
              <div
                className="w-full flex items-center justify-center relative"
                style={{
                  transform: pageZoom !== 100
                    ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${pageZoom / 100})`
                    : undefined,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 180ms ease-out',
                }}
              >
                {/* Authentic Madinah Mushaf Page Image - in landscape fills full screen width for clear readability */}
                <img
                  src={offlineBlobUrl || `/api/quran/page-image?page=${currentPage}`}
                  alt={`مصحف المدينة المنورة - صفحة ${currentPage}`}
                  onError={() => {
                    if (!offlineBlobUrl) {
                      const directUrl = `https://files.quran.app/hafs/madani/width_1024/page${currentPage.toString().padStart(3, '0')}.png`;
                      const testImg = new Image();
                      testImg.src = directUrl;
                      testImg.onload = () => {
                        setOfflineBlobUrl(directUrl);
                      };
                      testImg.onerror = () => {
                        setPageImageError(true);
                      };
                    } else {
                      setPageImageError(true);
                    }
                  }}
                  className={`w-full h-auto ${
                    isLandscape ? 'max-h-none' : 'max-h-[85vh]'
                  } object-contain transition-all duration-200 pointer-events-none landscape:max-h-none ${
                    settings.nightMode ? 'invert-[0.92] hue-rotate-180 brightness-95 contrast-125' : ''
                  }`}
                  loading="eager"
                />
              </div>
            </div>

            {/* Bottom Page Navigation Controls */}
            <div className={`w-full ${isLandscape ? 'max-w-none' : 'max-w-2xl'} mt-3 flex items-center justify-between px-1 gap-2 text-xs font-bold landscape:max-w-none`}>
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

              {/* Copy Verses Trigger */}
              <button
                type="button"
                onClick={() => setShowCopyModal(true)}
                className="py-3 px-3 sm:px-3.5 rounded-xl border border-[#C8A85B]/70 bg-white/95 text-[#123B2A] hover:bg-[#FBF8EF] active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                title="تحديد ونسخ أي آية أو جزء من نص الصفحة"
              >
                <span>📋</span>
                <span className="hidden xs:inline">نسخ الآيات</span>
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

            {/* نافذة آيات وتفسير الصفحة مع قائمة التفاسير على اليسار واختيار المفسر المباشر */}
            <PageVersesTafsirDrawer
              isOpen={showPageVersesDrawer}
              onClose={() => setShowPageVersesDrawer(false)}
              currentPage={currentPage}
              verses={verses}
              selectedTafsirId={settings.selectedTafsirId || 16}
              onSelectTafsirId={(id) => handleUpdateSettings({ selectedTafsirId: id })}
              onPlayVerse={(v) => handleTogglePlayVerseFromDrawer(v)}
              isPlayingAudio={audio.isPlaying}
              playingVerseKey={audio.isPlaying ? audio.currentVerseKey : null}
              nightMode={settings.nightMode}
              onNextPage={nextPage}
              onPrevPage={previousPage}
              onGoToPage={goToPage}
            />
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
                  className="quran-text-mushaf select-text cursor-text"
                  style={{
                    fontSize: `${Math.round((settings.fontSize * pageZoom) / 100)}px`,
                    color: textColor,
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}
                >
                  {group.verses.map((verse) => (
                    <span
                      key={verse.id || verse.verseKey}
                      className="cursor-pointer hover:bg-[#C8A85B]/10 rounded px-0.5 transition-colors select-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        const sel = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
                        if (!sel) {
                          setSelectedVerse(verse);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`الآية ${verse.verseKey}`}
                    >
                      {verse.textUthmani}
                      <span className="verse-number select-none" style={{ backgroundColor: verseNumberBg }}>
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
          onSetStopMark={handleSetStopMark}
          isBookmarked={isPageBookmarked}
          isOpenModal={showPageJumpModal}
          onCloseModal={() => setShowPageJumpModal(false)}
        />
      )}


      {/* Floating Toast Notification when Reading Stop Mark is saved */}
      {stopMarkToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#123B2A]/95 text-[#F7EED8] px-5 py-2.5 rounded-full shadow-2xl border border-[#C8A85B] text-xs font-bold animate-in fade-in slide-in-from-top-3 flex items-center gap-2 backdrop-blur-md">
          <span>{stopMarkToast}</span>
        </div>
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
          onSkip={audio.skipTime}
          autoPlayNext={audio.autoPlayNext}
          onNextSurah={audio.playNextSurah}
          onPreviousSurah={audio.playPreviousSurah}
          onToggleAutoPlayNext={audio.toggleAutoPlayNext}
          onClose={audio.stop}
          onOpenReciterSelect={() => setShowReciterSelect(true)}
          onOpenOfflineAudio={() => setShowOfflineAudioModal(true)}
          isMultiSurahLoop={audio.isMultiSurahLoop}
          selectedSurahsToLoop={audio.selectedSurahsToLoop}
          currentSurah={audio.currentSurah}
          onToggleMultiSurahLoop={audio.toggleMultiSurahLoop}
          onSetSelectedSurahsToLoop={audio.setSelectedSurahsToLoop}
          onPlaySurah={(surahNum) => {
            const sName = SURAH_NAMES[surahNum] || `سورة ${surahNum}`;
            const reciter = POPULAR_RECITERS.find((r) => r.id === (settings.selectedReciterId || 7));
            const rName = reciter?.name || 'مشاري العفاسي';
            audio.loadAndPlay(surahNum, settings.selectedReciterId || 7, sName, rName);
          }}
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
          onPlayVerse={(v) => handlePlayVerse(v)}
          isPlayingAudio={audio.isPlaying && audio.currentVerseKey === tafsirVerse.verseKey}
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
        onOpenOfflineAudio={() => setShowOfflineAudioModal(true)}
      />

      {/* Offline Audio Modal */}
      {showOfflineAudioModal && (
        <OfflineAudioModal
          isOpen={showOfflineAudioModal}
          selectedReciterId={settings.selectedReciterId || 7}
          currentSurah={audio.currentSurah || getSurahMeta(currentPage)?.number || 1}
          onClose={() => setShowOfflineAudioModal(false)}
          onSelectReciter={(id) => {
            const found = POPULAR_RECITERS.find((r) => r.id === id);
            handleSelectReciter(id, found?.name || `القارئ ${id}`);
          }}
        />
      )}

      {/* Note Modal */}
      {showNoteModal && noteVerse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowNoteModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="إضافة ملاحظة"
        >
          <div
            className="relative w-full max-w-md max-h-[88vh] sm:max-h-[90vh] my-auto rounded-3xl p-6 shadow-2xl border-2 border-[#C8A85B]/60 flex flex-col overflow-y-auto flash-modal-window"
            style={{ backgroundColor: bgColor }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
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
        </div>
      )}

      {/* Offline Download Mushaf Modal */}
      <OfflineDownloadModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        nightMode={settings.nightMode}
      />

      {/* Verse Selection and Copy Modal */}
      <VerseCopyModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        currentPage={currentPage}
        verses={verses}
        surahName={mainSurahName}
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
