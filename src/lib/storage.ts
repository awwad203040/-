'use client';

import type { Bookmark, ReadingProgress, UserSettings, Khatmah, DailyWird } from '@/types/quran';
import type { AutoAthkarSettings } from '@/types/athkar';
import { DEFAULT_ATHKAR_SETTINGS } from '@/types/athkar';

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
  return getItem<ReadingProgress | null>(STORAGE_KEYS.READING_PROGRESS, null);
}

export function saveReadingProgress(progress: ReadingProgress): void {
  setItem(STORAGE_KEYS.READING_PROGRESS, progress);
}

// Pages Visited (for stats tracking)
export function getPagesVisited(): number[] {
  return getItem<number[]>(STORAGE_KEYS.PAGES_VISITED, []);
}

export function addPageVisited(page: number): void {
  const pages = getPagesVisited();
  if (!pages.includes(page)) {
    pages.push(page);
    setItem(STORAGE_KEYS.PAGES_VISITED, pages);
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
  return getItem<Khatmah | null>(STORAGE_KEYS.KHATMAH, null);
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

export function updateKhatmahProgress(currentPage: number): void {
  const current = getKhatmah();
  if (current) {
    const completed = currentPage >= 604;
    saveKhatmah({
      ...current,
      currentPage: Math.max(current.currentPage, currentPage),
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
  return getItem<AutoAthkarSettings>(STORAGE_KEYS.AUTO_ATHKAR, DEFAULT_ATHKAR_SETTINGS);
}

export function saveAutoAthkarSettings(settings: Partial<AutoAthkarSettings>): void {
  const current = getAutoAthkarSettings();
  setItem(STORAGE_KEYS.AUTO_ATHKAR, { ...current, ...settings });
}
