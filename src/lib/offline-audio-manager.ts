'use client';

import { getDirectReciterAudioUrl } from '@/lib/quran-meta';

const DB_NAME = 'NoorReciterAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

export interface OfflineAudioRecord {
  key: string; // `${reciterId}_${surahNumber}`
  reciterId: number;
  surahNumber: number;
  blob: Blob;
  size: number;
  createdAt: string;
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is undefined'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('reciterId', 'reciterId', { unique: false });
        store.createIndex('surahNumber', 'surahNumber', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get stored offline audio blob if available
 */
export async function getOfflineAudioBlob(
  reciterId: number,
  surahNumber: number
): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    const key = `${reciterId}_${surahNumber}`;

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as OfflineAudioRecord | undefined;
        resolve(result?.blob || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Check if a specific Surah for a reciter is stored offline
 */
export async function isAudioDownloaded(
  reciterId: number,
  surahNumber: number
): Promise<boolean> {
  const blob = await getOfflineAudioBlob(reciterId, surahNumber);
  return blob !== null && blob.size > 0;
}

/**
 * Save an audio blob offline in IndexedDB
 */
export async function saveOfflineAudioBlob(
  reciterId: number,
  surahNumber: number,
  blob: Blob
): Promise<void> {
  const db = await openAudioDB();
  const key = `${reciterId}_${surahNumber}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: OfflineAudioRecord = {
      key,
      reciterId,
      surahNumber,
      blob,
      size: blob.size,
      createdAt: new Date().toISOString(),
    };

    const request = store.put(record);
    request.onsuccess = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('noor-offline-audio-updated', {
            detail: { reciterId, surahNumber, downloaded: true },
          })
        );
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a specific Surah offline audio
 */
export async function deleteOfflineAudio(
  reciterId: number,
  surahNumber: number
): Promise<void> {
  try {
    const db = await openAudioDB();
    const key = `${reciterId}_${surahNumber}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('noor-offline-audio-updated', {
              detail: { reciterId, surahNumber, downloaded: false },
            })
          );
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to delete offline audio:', err);
  }
}

/**
 * Get all downloaded Surah numbers for a given reciter
 */
export async function getDownloadedSurahsForReciter(
  reciterId: number
): Promise<number[]> {
  try {
    const db = await openAudioDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('reciterId');
      const request = index.getAll(reciterId);

      request.onsuccess = () => {
        const records = (request.result as OfflineAudioRecord[]) || [];
        resolve(records.map((r) => r.surahNumber).sort((a, b) => a - b));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Download a Surah audio file and store it in IndexedDB for offline play
 */
export async function downloadSurahAudio(
  reciterId: number,
  surahNumber: number,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  try {
    // 1. Check if already downloaded
    const existing = await getOfflineAudioBlob(reciterId, surahNumber);
    if (existing && existing.size > 0) {
      if (onProgress) onProgress(100);
      return true;
    }

    if (onProgress) onProgress(10);

    // 2. Fetch audio URL
    let targetUrl = getDirectReciterAudioUrl(reciterId, surahNumber);
    try {
      const apiRes = await fetch(`/api/quran/audio?chapter=${surahNumber}&reciter=${reciterId}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        const candidate = data.audioUrl || data.audio_file?.audio_url || data.audio_file?.url;
        if (candidate) targetUrl = candidate;
      }
    } catch {
      // Fallback to direct CDN
    }

    if (onProgress) onProgress(25);

    // 3. Fetch binary audio file
    const response = await fetch(targetUrl);
    if (!response.ok) {
      // If primary failed, try direct CDN
      const fallbackUrl = getDirectReciterAudioUrl(reciterId, surahNumber);
      const fbRes = await fetch(fallbackUrl);
      if (!fbRes.ok) throw new Error('فشل تنزيل ملف التلاوة');
      const blob = await fbRes.blob();
      await saveOfflineAudioBlob(reciterId, surahNumber, blob);
      if (onProgress) onProgress(100);
      return true;
    }

    if (onProgress) onProgress(60);

    const blob = await response.blob();
    if (onProgress) onProgress(85);

    await saveOfflineAudioBlob(reciterId, surahNumber, blob);
    if (onProgress) onProgress(100);

    return true;
  } catch (err) {
    console.error(`Error downloading audio for reciter ${reciterId}, surah ${surahNumber}:`, err);
    return false;
  }
}

/**
 * Get total storage used by downloaded audio in bytes
 */
export async function getDownloadedAudioTotalSize(): Promise<number> {
  try {
    const db = await openAudioDB();

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as OfflineAudioRecord[]) || [];
        const total = records.reduce((acc, curr) => acc + (curr.size || 0), 0);
        resolve(total);
      };
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
