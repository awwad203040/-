'use client';

import { checkOfflineProgress, downloadAllPages } from '@/lib/offline-manager';
import { downloadSurahAudio, isAudioKeyDownloaded, getDownloadedSurahsForReciter } from '@/lib/offline-audio-manager';

const SYNC_STORAGE_KEY = 'noor_auto_offline_sync_v1';
const MINSHAWI_RECITER_ID = 9; // Mohamed Siddiq Al-Minshawi (Murattal)

// Priority surahs to download first for Sheikh Al-Minshawi
const PRIORITY_SURAHS = [
  1,   // Al-Fatihah
  74,  // Al-Muddaththir (shown in user playback screen)
  18,  // Al-Kahf
  36,  // Yasin
  67,  // Al-Mulk
  56,  // Al-Waqi'ah
  55,  // Ar-Rahman
  2,   // Al-Baqarah
  3,   // Ali 'Imran
  // Juz Amma (78-114)
  ...Array.from({ length: 37 }, (_, i) => 78 + i),
];

// All 114 surahs ordered by priority
const ALL_114_SURAHS: number[] = Array.from(
  new Set([...PRIORITY_SURAHS, ...Array.from({ length: 114 }, (_, i) => i + 1)])
);

let isSyncRunning = false;
let syncAbortController: AbortController | null = null;

export interface AutoSyncStatus {
  mushafPagesCached: number;
  mushafPagesTotal: number;
  mushafComplete: boolean;
  minshawiSurahsCached: number;
  minshawiSurahsTotal: number;
  minshawiComplete: boolean;
  isSyncing: boolean;
  currentTask?: string;
}

export function getAutoSyncStatus(): AutoSyncStatus {
  if (typeof window === 'undefined') {
    return {
      mushafPagesCached: 0,
      mushafPagesTotal: 604,
      mushafComplete: false,
      minshawiSurahsCached: 0,
      minshawiSurahsTotal: 114,
      minshawiComplete: false,
      isSyncing: false,
    };
  }

  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    mushafPagesCached: 0,
    mushafPagesTotal: 604,
    mushafComplete: false,
    minshawiSurahsCached: 0,
    minshawiSurahsTotal: 114,
    minshawiComplete: false,
    isSyncing: false,
  };
}

function saveAutoSyncStatus(status: Partial<AutoSyncStatus>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getAutoSyncStatus();
    const updated = { ...current, ...status };
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('noor-auto-sync-updated', { detail: updated }));
  } catch {}
}

/**
 * Automatically download and cache the readable Mushaf (604 pages)
 * and Sheikh Al-Minshawi's full Quran recitation for 100% offline access.
 * Runs silently in the background with zero UI disruption and zero lag.
 */
export async function startAutomaticOfflineSync(): Promise<void> {
  if (typeof window === 'undefined' || isSyncRunning) return;
  if (!navigator.onLine) {
    console.log('NoorAlQuran: Offline sync waiting for internet connection.');
    return;
  }

  isSyncRunning = true;
  syncAbortController = new AbortController();
  const signal = syncAbortController.signal;

  try {
    // 1. Check Readable Mushaf Pages
    const pagesProgress = await checkOfflineProgress();
    saveAutoSyncStatus({
      mushafPagesCached: pagesProgress.cachedCount,
      mushafPagesTotal: 604,
      mushafComplete: pagesProgress.isComplete,
      isSyncing: true,
      currentTask: pagesProgress.isComplete ? 'تحميل مصحف المنشاوي...' : 'تحميل صفحات المصحف الشريف...',
    });

    if (!pagesProgress.isComplete && !signal.aborted) {
      console.log(`NoorAlQuran: Auto-syncing readable Mushaf (${pagesProgress.cachedCount}/604)...`);
      try {
        await downloadAllPages((progress) => {
          saveAutoSyncStatus({
            mushafPagesCached: progress.current,
            mushafComplete: progress.isCompleted,
            currentTask: `تحميل المصحف المقروء (${progress.percentage}%)...`,
          });
        }, signal);
      } catch (err) {
        console.warn('Auto-sync Mushaf pages notice:', err);
      }
    }

    if (signal.aborted) return;

    // 2. Check and Download Sheikh Al-Minshawi Audio
    const downloadedSurahs = await getDownloadedSurahsForReciter(MINSHAWI_RECITER_ID);
    const downloadedSet = new Set(downloadedSurahs);

    saveAutoSyncStatus({
      minshawiSurahsCached: downloadedSet.size,
      minshawiSurahsTotal: 114,
      minshawiComplete: downloadedSet.size >= 114,
      currentTask: downloadedSet.size >= 114 ? 'اكتمل التحميل' : 'تحميل مصحف الشيخ المنشاوي...',
    });

    if (downloadedSet.size < 114 && !signal.aborted) {
      console.log(`NoorAlQuran: Auto-syncing Sheikh Al-Minshawi audio (${downloadedSet.size}/114 surahs cached)...`);

      for (const surahNum of ALL_114_SURAHS) {
        if (signal.aborted || !navigator.onLine) break;

        if (downloadedSet.has(surahNum) || isAudioKeyDownloaded(MINSHAWI_RECITER_ID, surahNum)) {
          continue;
        }

        try {
          saveAutoSyncStatus({
            currentTask: `تحميل سورة رقم ${surahNum} بصوت الشيخ المنشاوي...`,
          });

          const ok = await downloadSurahAudio(MINSHAWI_RECITER_ID, surahNum);
          if (ok) {
            downloadedSet.add(surahNum);
            saveAutoSyncStatus({
              minshawiSurahsCached: downloadedSet.size,
              minshawiComplete: downloadedSet.size >= 114,
            });
          }

          // Polite pacing: 300ms pause between audio downloads to keep network and device cool
          await new Promise((r) => setTimeout(r, 300));
        } catch (e) {
          console.warn(`Auto-sync audio surah ${surahNum} notice:`, e);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    saveAutoSyncStatus({
      isSyncing: false,
      currentTask: 'اكتملت المزامنة وحفظ المصحف بدون إنترنت',
    });
  } catch (err) {
    console.warn('Auto-offline sync general notice:', err);
  } finally {
    isSyncRunning = false;
  }
}

export function stopAutomaticOfflineSync(): void {
  if (syncAbortController) {
    syncAbortController.abort();
    syncAbortController = null;
  }
  isSyncRunning = false;
  saveAutoSyncStatus({ isSyncing: false });
}
