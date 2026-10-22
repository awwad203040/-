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
 */
export async function downloadAllPages(
  onProgress: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('متصفحك لا يدعم ميزة حفظ البيانات للقراءة بدون اتصال.');
  }

  const cache = await caches.open(PAGES_CACHE_NAME);
  let downloadedCount = 0;

  // First check which pages are already cached
  const keys = await cache.keys();
  const cachedUrls = new Set(keys.map((k) => k.url));

  const initialCached = Array.from({ length: TOTAL_QURAN_PAGES }, (_, i) => i + 1)
    .filter((p) => cachedUrls.has(getPageImageUrl(p))).length;

  downloadedCount = initialCached;

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

  // Queue of pages to download
  const pagesToDownload: number[] = [];
  for (let p = 1; p <= TOTAL_QURAN_PAGES; p++) {
    const url = getPageImageUrl(p);
    if (!cachedUrls.has(url)) {
      pagesToDownload.push(p);
    }
  }

  const CONCURRENCY = 4;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < pagesToDownload.length) {
      if (abortSignal?.aborted) {
        return;
      }

      const currentIndex = index++;
      const pageNum = pagesToDownload[currentIndex];
      const url = getPageImageUrl(pageNum);

      try {
        const response = await fetch(url, {
          cache: 'force-cache',
          signal: abortSignal,
        });

        if (response.ok) {
          await cache.put(url, response.clone());
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
      } catch (err: unknown) {
        if (abortSignal?.aborted) return;
        console.warn(`Failed to prefetch page ${pageNum}:`, err);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

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
