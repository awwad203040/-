'use client';

import type { Bookmark, ReadingProgress, UserSettings, Khatmah, DailyWird } from '@/types/quran';
import type { AutoAthkarSettings, ThikrCategory } from '@/types/athkar';
import { DEFAULT_ATHKAR_SETTINGS } from '@/types/athkar';
import { getSurahForPage } from '@/lib/quran-meta';

const STORAGE_KEYS = {
  BOOKMARKS: 'noor_bookmarks',
  READING_PROGRESS: 'noor_reading_progress',
  SETTINGS: 'noor_settings',
  PAGES_VISITED: 'noor_pages_visited',
  KHATMAH: 'noor_khatmah',
  DAILY_WIRD: 'noor_daily_wird',
  AUTO_ATHKAR: 'noor_auto_athkar_settings',
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

// Bookmarks
export function getBookmarks(): Bookmark[] {
  return getItem<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, []);
}

export function addBookmark(bookmark: Bookmark): void {
  const bookmarks = getBookmarks();
  const exists = bookmarks.some(
    (b) => b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber
  );
  if (!exists) {
    bookmarks.push(bookmark);
    setItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
  }
}

export function removeBookmark(id: string): void {
  const bookmarks = getBookmarks().filter((b) => b.id !== id);
  setItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
}

export function updateBookmarkNote(id: string, note: string): void {
  const bookmarks = getBookmarks().map((b) =>
    b.id === id ? { ...b, note } : b
  );
  setItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
}

export function isBookmarked(surahNumber: number, ayahNumber: number): boolean {
  return getBookmarks().some(
    (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
  );
}

// Reading Progress
export function getReadingProgress(): ReadingProgress | null {
  const prog = getItem<ReadingProgress | null>(STORAGE_KEYS.READING_PROGRESS, null);
  if (!prog) {
    return {
      pageNumber: 1,
      surahNumber: 1,
      ayahNumber: 1,
      updatedAt: new Date().toISOString(),
    };
  }
  return prog;
}

export function saveReadingProgress(progress: ReadingProgress): void {
  const page = Math.max(1, Math.min(604, progress.pageNumber));
  const surahMeta = getSurahForPage(page);
  const sanitized: ReadingProgress = {
    ...progress,
    pageNumber: page,
    surahNumber: progress.surahNumber || (surahMeta ? surahMeta.number : 1),
    surahName: progress.surahName || (surahMeta ? surahMeta.name : 'الفاتحة'),
    updatedAt: progress.updatedAt || new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.READING_PROGRESS, sanitized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noor-reading-progress-updated', { detail: sanitized }));
  }
}

// Pages Visited (for stats tracking)
export function getPagesVisited(): number[] {
  return getItem<number[]>(STORAGE_KEYS.PAGES_VISITED, []);
}

export function addPageVisited(page: number): void {
  if (page < 1 || page > 604) return;
  const pages = getPagesVisited();
  if (!pages.includes(page)) {
    pages.push(page);
    setItem(STORAGE_KEYS.PAGES_VISITED, pages);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noor-pages-visited-updated', { detail: pages }));
    }
  }
}

/**
 * Set the user's real reading position (linked to mobile user).
 * Optionally syncs pages visited so pagesRead count matches reality.
 */
export function setRealReadingPosition(targetPage: number, syncPagesVisited: boolean = false): ReadingProgress {
  const page = Math.max(1, Math.min(604, targetPage));
  const surahMeta = getSurahForPage(page);
  const surahNum = surahMeta ? surahMeta.number : 1;
  const surahName = surahMeta ? surahMeta.name : 'الفاتحة';

  const updated: ReadingProgress = {
    pageNumber: page,
    surahNumber: surahNum,
    surahName: surahName,
    ayahNumber: 1,
    updatedAt: new Date().toISOString(),
  };

  saveReadingProgress(updated);
  addPageVisited(page);

  if (syncPagesVisited) {
    const newPages: number[] = [];
    for (let p = 1; p <= page; p++) {
      newPages.push(p);
    }
    setItem(STORAGE_KEYS.PAGES_VISITED, newPages);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noor-pages-visited-updated', { detail: newPages }));
    }
  }

  return updated;
}

/**
 * Manually set the count of pages read.
 */
export function setManualPagesReadCount(count: number): void {
  const validCount = Math.max(0, Math.min(604, count));
  const arr: number[] = [];
  for (let i = 1; i <= validCount; i++) {
    arr.push(i);
  }
  setItem(STORAGE_KEYS.PAGES_VISITED, arr);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noor-pages-visited-updated', { detail: arr }));
  }
}

// Settings
export function getSettings(): UserSettings {
  return getItem<UserSettings>(STORAGE_KEYS.SETTINGS, {
    fontSize: 28,
    nightMode: false,
    readingMode: 'mushaf',
    selectedReciterId: 7,
    selectedTafsirId: 169,
  });
}

export function saveSettings(settings: Partial<UserSettings>): void {
  const current = getSettings();
  setItem(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
}

// Khatmah Planner
export function getKhatmah(): Khatmah | null {
  const k = getItem<Khatmah | null>(STORAGE_KEYS.KHATMAH, null);
  if (!k) return null;

  // Auto-heal: If existing Khatmah got corrupted and stuck at page 604 while user hasn't actually read the whole Quran
  const visited = getPagesVisited();
  if (k.currentPage >= 600 && visited.length < 500 && !k.completed) {
    const fixed: Khatmah = {
      ...k,
      currentPage: k.startPage && k.startPage < 600 ? k.startPage : 1,
      startPage: k.startPage && k.startPage < 600 ? k.startPage : 1,
    };
    setItem(STORAGE_KEYS.KHATMAH, fixed);
    return fixed;
  }

  return k;
}

export function saveKhatmah(khatmah: Khatmah): void {
  setItem(STORAGE_KEYS.KHATMAH, khatmah);
}

export function deleteKhatmah(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.KHATMAH);
  } catch {
    console.error('Failed to remove Khatmah');
  }
}

export function updateKhatmahProgress(pageNumber: number): void {
  const current = getKhatmah();
  if (!current || current.completed) return;

  // Only advance khatmah if reading sequentially forward within a natural range (current page to current + 5)
  // This prevents jumping hundreds of pages to 604 when simply browsing short surahs!
  if (pageNumber >= current.currentPage && pageNumber <= current.currentPage + 5) {
    const completed = pageNumber >= 604;
    saveKhatmah({
      ...current,
      currentPage: pageNumber,
      completed,
    });
  }
}

// Daily Wird
export function getDailyWird(): DailyWird {
  const today = new Date().toISOString().split('T')[0];
  const defaultWird: DailyWird = {
    date: today,
    pagesRead: 0,
    targetPages: 20,
  };
  const stored = getItem<DailyWird | null>(STORAGE_KEYS.DAILY_WIRD, null);
  if (stored && stored.date === today) {
    return stored;
  }
  return defaultWird;
}

export function recordWirdProgress(pagesCount = 1): void {
  const wird = getDailyWird();
  const updated: DailyWird = {
    ...wird,
    pagesRead: wird.pagesRead + pagesCount,
  };
  setItem(STORAGE_KEYS.DAILY_WIRD, updated);
}

// Auto Voice Athkar Settings
export function getAutoAthkarSettings(): AutoAthkarSettings {
  const stored = getItem<AutoAthkarSettings | null>(STORAGE_KEYS.AUTO_ATHKAR, null);
  if (!stored || typeof stored !== 'object') {
    return DEFAULT_ATHKAR_SETTINGS;
  }
  const validCategories: ThikrCategory[] = ['tasbeeh', 'tahmeed', 'hawqala', 'salawat', 'istighfar'];
  const filtered = Array.isArray(stored.activeCategories)
    ? (stored.activeCategories.filter((c) => validCategories.includes(c as ThikrCategory)) as ThikrCategory[])
    : DEFAULT_ATHKAR_SETTINGS.activeCategories;

  const validThikrIds = [
    'tasbeeh-azeem',
    'tawheed-1',
    'hawqala-1',
    'salawat-nabi',
    'tasbeeh-quddoos',
    'baqiyat-1',
    'istighfar-custom',
  ];
  let filteredThikrs = Array.isArray(stored.activeThikrIds)
    ? stored.activeThikrIds.filter((id) => validThikrIds.includes(id))
    : validThikrIds;

  if (filteredThikrs.length === 0) {
    filteredThikrs = validThikrIds;
  } else {
    // Automatically ensure the two newly added athkar are included for the user
    for (const newId of ['baqiyat-1', 'istighfar-custom']) {
      if (!filteredThikrs.includes(newId)) {
        filteredThikrs.push(newId);
      }
    }
  }

  return {
    ...DEFAULT_ATHKAR_SETTINGS,
    ...stored,
    activeCategories: filtered.length > 0 ? filtered : DEFAULT_ATHKAR_SETTINGS.activeCategories,
    activeThikrIds: filteredThikrs,
  };
}

export function saveAutoAthkarSettings(settings: Partial<AutoAthkarSettings>): void {
  const current = getAutoAthkarSettings();
  setItem(STORAGE_KEYS.AUTO_ATHKAR, { ...current, ...settings });
}

export function isAutoVoiceAssistantOnLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('noor_auto_voice_launch') === 'true';
  } catch {
    return false;
  }
}

export function setAutoVoiceAssistantOnLaunch(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('noor_auto_voice_launch', enabled ? 'true' : 'false');
  } catch {}
}

