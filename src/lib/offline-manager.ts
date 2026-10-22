'use client';

export const PAGES_CACHE_NAME = 'noor-mushaf-pages-v1';
export const TOTAL_QURAN_PAGES = 604;

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

/**
 * Counts how many Quran pages are currently cached in device storage
 */
export async function checkOfflineProgress(): Promise<{
  cachedCount: number;
  totalCount: number;
  isComplete: boolean;
}> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { cachedCount: 0, totalCount: TOTAL_QURAN_PAGES, isComplete: false };
  }

  try {
    const cache = await caches.open(PAGES_CACHE_NAME);
    const keys = await cache.keys();
    // Filter keys matching files.quran.app page images
    const pageKeys = keys.filter((req) => req.url.includes('/width_1024/page'));
    const cachedCount = Math.min(TOTAL_QURAN_PAGES, pageKeys.length);
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
 * can navigate to the Mushaf page without needing an internet connection.
 */
export async function preCacheAppShell(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open('noor-alquran-v16');
    const urlsToCache = ['/', '/mushaf', '/manifest.json'];
    for (const url of urlsToCache) {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) {
          await cache.put(url, res);
        }
      } catch {
        // Ignore single asset failure
      }
    }
  } catch {
    // Ignore cache error
  }
}

/**
 * Downloads and caches all 604 Madinah Mushaf pages with robust pacing and retries.
 * - Uses CONCURRENCY = 2 with gentle delays (50ms) to completely avoid CDN rate-limiting / socket exhaustion.
 * - Retries any failed page up to 3 times with progressive backoff.
 * - Performs a second sequential pass for any pages that had transient network glitches.
 * - Seamlessly resumes from the exact number of pages previously downloaded.
 */
export async function downloadAllPages(
  onProgress: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('متصفحك أو جهازك لا يدعم خاصية التخزين دون اتصال.');
  }

  // Pre-cache app shell first so offline navigation to /mushaf works 100%
  preCacheAppShell().catch(() => {});

  const cache = await caches.open(PAGES_CACHE_NAME);

  // Check which pages are already cached
  const keys = await cache.keys();
  const cachedUrls = new Set(keys.map((k) => k.url));

  let downloadedCount = 0;
  for (let p = 1; p <= TOTAL_QURAN_PAGES; p++) {
    if (cachedUrls.has(getPageImageUrl(p))) {
      downloadedCount++;
    }
  }

  onProgress({
    current: downloadedCount,
    total: TOTAL_QURAN_PAGES,
    percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
    currentPage: 1,
    isCompleted: downloadedCount >= TOTAL_QURAN_PAGES,
    isPaused: false,
  });

  if (downloadedCount >= TOTAL_QURAN_PAGES) {
    return true;
  }

  // Queue of pages that still need to be downloaded
  const pagesToDownload: number[] = [];
  for (let p = 1; p <= TOTAL_QURAN_PAGES; p++) {
    const url = getPageImageUrl(p);
    if (!cachedUrls.has(url)) {
      pagesToDownload.push(p);
    }
  }

  const initialToDownload = pagesToDownload.length;
  let successInThisRun = 0;
  let index = 0;
  const failedPages: number[] = [];

  // Paced concurrency: 2 workers with 50ms pause prevents CDN rate-limits completely
  const CONCURRENCY = 2;

  async function fetchSinglePage(pageNum: number): Promise<boolean> {
    const url = getPageImageUrl(pageNum);
    const retryDelays = [0, 400, 1000];

    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (abortSignal?.aborted) return false;

      if (retryDelays[attempt] > 0) {
        await new Promise((res) => setTimeout(res, retryDelays[attempt]));
        if (abortSignal?.aborted) return false;
      }

      try {
        const response = await fetch(url, {
          mode: 'no-cors',
          signal: abortSignal,
        });

        if (response && (response.type === 'opaque' || response.ok || response.status === 200)) {
          await cache.put(url, response);
          return true;
        }
      } catch (err: unknown) {
        if (abortSignal?.aborted) return false;
        // Continue to next attempt
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

      const success = await fetchSinglePage(pageNum);

      if (success) {
        downloadedCount++;
        successInThisRun++;

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

      // Small 40ms pause between downloads keeps network socket healthy and prevents CDN throttling
      await new Promise((res) => setTimeout(res, 40));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  if (abortSignal?.aborted) {
    return false;
  }

  // Second Pass: If any pages failed during the fast pass, retry them one by one
  if (failedPages.length > 0 && !abortSignal?.aborted) {
    await new Promise((res) => setTimeout(res, 800));

    for (const pageNum of failedPages) {
      if (abortSignal?.aborted) break;

      const success = await fetchSinglePage(pageNum);
      if (success) {
        downloadedCount++;
        successInThisRun++;

        onProgress({
          current: downloadedCount,
          total: TOTAL_QURAN_PAGES,
          percentage: Math.round((downloadedCount / TOTAL_QURAN_PAGES) * 100),
          currentPage: pageNum,
          isCompleted: downloadedCount >= TOTAL_QURAN_PAGES,
          isPaused: false,
        });
      }
      await new Promise((res) => setTimeout(res, 80));
    }
  }

  // Only throw an error if absolutely zero progress was made AND we had pages to download
  if (successInThisRun === 0 && initialToDownload > 0 && !abortSignal?.aborted) {
    throw new Error('تعذر تنزيل صفحات المصحف. يرجى التأكد من اتصال الإنترنت ثم إعادة المحاولة.');
  }

  const finalCheck = await checkOfflineProgress();
  return finalCheck.isComplete;
}

/**
 * Removes all offline stored pages from cache to free up device storage
 */
export async function clearOfflinePages(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    await caches.delete(PAGES_CACHE_NAME);
  } catch (err) {
    console.warn('Failed to delete offline pages cache:', err);
  }
}
