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
 * Downloads and caches all 604 Madinah Mushaf pages with controlled concurrency.
 * Safe, interruptible via AbortController, and resumes automatically from where it left off.
 * Uses mode: 'no-cors' so files.quran.app images can be stored in Cache API without CORS errors.
 */
export async function downloadAllPages(
  onProgress: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('متصفحك أو جهازك لا يدعم خاصية التخزين دون اتصال.');
  }

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
  const CONCURRENCY = 4;

  async function worker(): Promise<void> {
    while (index < pagesToDownload.length) {
      if (abortSignal?.aborted) {
        return;
      }

      const currentIndex = index++;
      if (currentIndex >= pagesToDownload.length) return;

      const pageNum = pagesToDownload[currentIndex];
      if (!pageNum) return;

      const url = getPageImageUrl(pageNum);

      try {
        // Critical: files.quran.app CDN does NOT serve CORS headers.
        // We MUST use mode: 'no-cors' so the browser fetches the image as an opaque response.
        // W3C Cache API standard explicitly permits storing opaque responses in cache.put().
        let response: Response | null = null;
        try {
          response = await fetch(url, {
            mode: 'no-cors',
            signal: abortSignal,
          });
        } catch {
          if (abortSignal?.aborted) return;
          // Retry once after 250ms on transient network drop
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (abortSignal?.aborted) return;
          response = await fetch(url, {
            mode: 'no-cors',
            signal: abortSignal,
          });
        }

        // For opaque responses, response.type === 'opaque' and response.status === 0
        if (response && (response.type === 'opaque' || response.ok || response.status === 200)) {
          await cache.put(url, response);
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
      } catch (err: unknown) {
        if (abortSignal?.aborted) return;
        console.warn(`[OfflineManager] Error fetching page ${pageNum}:`, err);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  if (abortSignal?.aborted) {
    return false;
  }

  // If no pages were downloaded and we had pages to download, there is a connection issue
  if (successInThisRun === 0 && initialToDownload > 0) {
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
