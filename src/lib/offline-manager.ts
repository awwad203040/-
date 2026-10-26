'use client';

export const PAGES_CACHE_NAME = 'noor-mushaf-pages-v2';
export const TOTAL_QURAN_PAGES = 604;
const IDB_NAME = 'NoorQuranPagesDB';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'pages';

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  currentPage: number;
  isCompleted: boolean;
  isPaused: boolean;
  error?: string;
}

export function getPageImageUrl(page: number): string {
  const pad = page.toString().padStart(3, '0');
  return `https://files.quran.app/hafs/madani/width_1024/page${pad}.png`;
}

export function getProxyPageImageUrl(page: number): string {
  return `/api/quran/page-image?page=${page}`;
}

/**
 * Open or initialize the IndexedDB database for offline Quran page blobs.
 * Universal support across iOS Safari, Android Chrome, Samsung Internet, WebViews.
 */
function openPagesDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Stores a page Blob into IndexedDB
 */
export async function savePageToIDB(pageNum: number, blob: Blob): Promise<boolean> {
  const db = await openPagesDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(blob, pageNum);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Retrieves a page Blob from IndexedDB
 */
export async function getPageFromIDB(pageNum: number): Promise<Blob | null> {
  const db = await openPagesDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(pageNum);

      req.onsuccess = () => {
        if (req.result instanceof Blob) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Get all cached page numbers from IndexedDB
 */
export async function getCachedPageNumbersFromIDB(): Promise<Set<number>> {
  const db = await openPagesDB();
  const set = new Set<number>();
  if (!db) return set;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        if (Array.isArray(req.result)) {
          req.result.forEach((key) => {
            const num = typeof key === 'number' ? key : parseInt(String(key), 10);
            if (!isNaN(num) && num >= 1 && num <= TOTAL_QURAN_PAGES) {
              set.add(num);
            }
          });
        }
        resolve(set);
      };
      req.onerror = () => resolve(set);
    } catch {
      resolve(set);
    }
  });
}

/**
 * Counts how many Quran pages are currently cached in device storage (IndexedDB + CacheStorage)
 */
export async function checkOfflineProgress(): Promise<{
  cachedCount: number;
  totalCount: number;
  isComplete: boolean;
}> {
  if (typeof window === 'undefined') {
    return { cachedCount: 0, totalCount: TOTAL_QURAN_PAGES, isComplete: false };
  }

  try {
    const idbPages = await getCachedPageNumbersFromIDB();

    // Also check CacheStorage if available
    let cacheCount = 0;
    if ('caches' in window) {
      try {
        const cache = await caches.open(PAGES_CACHE_NAME);
        const keys = await cache.keys();
        const pageKeys = keys.filter((req) => req.url.includes('/width_1024/page') || req.url.includes('/api/quran/page-image'));
        cacheCount = pageKeys.length;
      } catch {}
    }

    const cachedCount = Math.min(TOTAL_QURAN_PAGES, Math.max(idbPages.size, cacheCount));
    return {
      cachedCount,
      totalCount: TOTAL_QURAN_PAGES,
      isComplete: cachedCount >= TOTAL_QURAN_PAGES,
    };
  } catch {
    return { cachedCount: 0, totalCount: TOTAL_QURAN_PAGES, isComplete: false };
  }
}

/**
 * Pre-caches critical app routes (HTML and basic assets) so the reader
 * can navigate to any surah or page without needing an internet connection.
 */
export async function preCacheAppShell(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open('noor-alquran-v17');
    const urlsToCache = ['/', '/mushaf', '/manifest.json'];
    for (const url of urlsToCache) {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) {
          await cache.put(url, res);
        }
      } catch {}
    }
  } catch {}
}

/**
 * Universal download engine that works on ALL mobile systems (iOS, Android, Capacitor WebViews).
 * - Saves each page as a compact PNG Blob (~35KB) in IndexedDB (Total: ~21 MB for all 604 pages).
 * - Avoids the 7MB per opaque response padding penalty that exhausts storage quota on phones.
 * - Also stores in CacheStorage for ServiceWorker acceleration where supported.
 * - Paced concurrency prevents device freeze and network throttling.
 */
export async function downloadAllPages(
  onProgress: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<boolean> {
  if (typeof window === 'undefined') {
    throw new Error('بيئة غير صالحة للتحميل.');
  }

  // Pre-cache app shell
  preCacheAppShell().catch(() => {});

  // 1. Identify which pages are already in IndexedDB
  const cachedPages = await getCachedPageNumbersFromIDB();
  let downloadedCount = cachedPages.size;

  const pagesToDownload: number[] = [];
  for (let p = 1; p <= TOTAL_QURAN_PAGES; p++) {
    if (!cachedPages.has(p)) {
      pagesToDownload.push(p);
    }
  }

  onProgress({
    current: downloadedCount,
    total: TOTAL_QURAN_PAGES,
    percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
    currentPage: pagesToDownload[0] || 1,
    isCompleted: downloadedCount >= TOTAL_QURAN_PAGES,
    isPaused: false,
  });

  if (downloadedCount >= TOTAL_QURAN_PAGES) {
    return true;
  }

  let index = 0;
  const failedPages: number[] = [];
  const CONCURRENCY = 3;

  async function fetchAndStoreSinglePage(pageNum: number): Promise<boolean> {
    const proxyUrl = getProxyPageImageUrl(pageNum);
    const directUrl = getPageImageUrl(pageNum);
    const fallbackUrl = `https://android.quran.com/data/width_1024/page${pageNum.toString().padStart(3, '0')}.png`;

    const candidates = [proxyUrl, directUrl, fallbackUrl];

    for (const url of candidates) {
      if (abortSignal?.aborted) return false;

      const timeoutController = new AbortController();
      const timeoutTimer = setTimeout(() => timeoutController.abort(), 7000);

      const abortHandler = () => timeoutController.abort();
      if (abortSignal) {
        abortSignal.addEventListener('abort', abortHandler, { once: true });
      }

      try {
        const response = await fetch(url, {
          signal: timeoutController.signal,
          mode: url.startsWith('/') ? 'same-origin' : 'cors',
        });
        clearTimeout(timeoutTimer);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }

        if (response.ok) {
          const blob = await response.blob();
          if (blob && blob.size > 1000) {
            // 1. Save to IndexedDB (safe, permanent, ~35KB)
            await savePageToIDB(pageNum, blob);

            // 2. Also cache in CacheStorage if supported
            if ('caches' in window) {
              try {
                const cache = await caches.open(PAGES_CACHE_NAME);
                const cacheRes = new Response(blob, {
                  headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                  },
                });
                await cache.put(directUrl, cacheRes);
              } catch {}
            }

            return true;
          }
        }
      } catch {
        clearTimeout(timeoutTimer);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }
      }
    }

    return false;
  }

  async function worker(): Promise<void> {
    while (index < pagesToDownload.length) {
      if (abortSignal?.aborted) return;

      const currentIndex = index++;
      if (currentIndex >= pagesToDownload.length) return;

      const pageNum = pagesToDownload[currentIndex];
      if (!pageNum) return;

      onProgress({
        current: downloadedCount,
        total: TOTAL_QURAN_PAGES,
        percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
        currentPage: pageNum,
        isCompleted: false,
        isPaused: false,
      });

      const success = await fetchAndStoreSinglePage(pageNum);

      if (success) {
        downloadedCount++;
        onProgress({
          current: downloadedCount,
          total: TOTAL_QURAN_PAGES,
          percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
          currentPage: pageNum,
          isCompleted: downloadedCount >= TOTAL_QURAN_PAGES,
          isPaused: false,
        });
      } else {
        failedPages.push(pageNum);
      }

      // Small throttle to keep UI ultra responsive
      await new Promise((res) => setTimeout(res, 25));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  if (abortSignal?.aborted) {
    return false;
  }

  // Second pass for failed pages
  if (failedPages.length > 0 && !abortSignal?.aborted) {
    for (const pageNum of failedPages) {
      if (abortSignal?.aborted) break;

      onProgress({
        current: downloadedCount,
        total: TOTAL_QURAN_PAGES,
        percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
        currentPage: pageNum,
        isCompleted: false,
        isPaused: false,
      });

      const success = await fetchAndStoreSinglePage(pageNum);
      if (success) {
        downloadedCount++;
        onProgress({
          current: downloadedCount,
          total: TOTAL_QURAN_PAGES,
          percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
          currentPage: pageNum,
          isCompleted: downloadedCount >= TOTAL_QURAN_PAGES,
          isPaused: false,
        });
      }
      await new Promise((res) => setTimeout(res, 40));
    }
  }

  const finalCheck = await checkOfflineProgress();
  return finalCheck.isComplete;
}

/**
 * Removes all offline stored pages from both IndexedDB and CacheStorage
 */
export async function clearOfflinePages(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('indexedDB' in window) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(IDB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }

    if ('caches' in window) {
      await caches.delete(PAGES_CACHE_NAME);
    }
  } catch (err) {
    console.warn('Failed to clear offline pages:', err);
  }
}
