'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Verse } from '@/types/quran';

interface MushafPageData {
  pageNumber: number;
  verses: Verse[];
  isLoading: boolean;
  error: string | null;
}

const pageCache = new Map<number, Verse[]>();

export function normalizeVerse(raw: Record<string, unknown>): Verse {
  const vNum = (raw.verse_number as number) ?? (raw.verseNumber as number) ?? 0;
  const vKey = (raw.verse_key as string) ?? (raw.verseKey as string) ?? '';
  const text = (raw.text_uthmani as string) ?? (raw.textUthmani as string) ?? '';
  const pNum = (raw.page_number as number) ?? (raw.pageNumber as number) ?? 0;
  const jNum = (raw.juz_number as number) ?? (raw.juzNumber as number) ?? 0;
  const hNum = (raw.hizb_number as number) ?? (raw.hizbNumber as number) ?? 0;
  const rNum = (raw.rub_el_hizb_number as number) ?? (raw.rubElHizbNumber as number) ?? 0;
  const chId = (raw.chapter_id as number) ?? (raw.chapterId as number) ?? (raw.chapterNumber as number) ?? (vKey ? parseInt(vKey.split(':')[0], 10) : 1);
  return {
    id: (raw.id as number) ?? 0,
    verseNumber: vNum,
    verseKey: vKey,
    hizbNumber: hNum,
    rubElHizbNumber: rNum,
    sajdahNumber: (raw.sajdah_number as number | null) ?? (raw.sajdahNumber as number | null) ?? null,
    sajdahType: (raw.sajdah_type as string | null) ?? (raw.sajdahType as string | null) ?? null,
    pageNumber: pNum,
    juzNumber: jNum,
    textUthmani: text,
    textImlaei: (raw.text_imlaei as string) ?? (raw.textImlaei as string) ?? undefined,
    chapterNumber: chId,
    chapterId: chId,
    text_uthmani: text,
    verse_number: vNum,
    verse_key: vKey,
    page_number: pNum,
    juz_number: jNum,
    hizb_number: hNum,
    rub_el_hizb_number: rNum,
    chapter_id: chId,
  };
}

export function useMushafPage(initialPage: number) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [data, setData] = useState<MushafPageData>({
    pageNumber: initialPage,
    verses: [],
    isLoading: true,
    error: null,
  });

  const fetchPage = useCallback(async (page: number) => {
    // Check cache first
    if (pageCache.has(page)) {
      setData({
        pageNumber: page,
        verses: pageCache.get(page)!,
        isLoading: false,
        error: null,
      });
      return;
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(`/api/quran/pages/${page}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json() as { verses?: Record<string, unknown>[] };
      const rawVerses = json.verses || [];
      const verses = rawVerses.map(normalizeVerse);
      
      // Cache the result
      pageCache.set(page, verses);
      
      setData({
        pageNumber: page,
        verses,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: `تعذر تحميل الصفحة: ${message}`,
      }));
    }
  }, []);

  // Prefetch next page
  const prefetchPage = useCallback(async (page: number) => {
    if (page >= 1 && page <= 604 && !pageCache.has(page)) {
      try {
        const res = await fetch(`/api/quran/pages/${page}`);
        if (res.ok) {
          const json = await res.json() as { verses?: Record<string, unknown>[] };
          const verses = (json.verses || []).map(normalizeVerse);
          pageCache.set(page, verses);
        }
      } catch {
        // Silent prefetch failure is ok
      }
    }
  }, []);

  useEffect(() => {
    fetchPage(currentPage);
    // Prefetch adjacent pages
    if (currentPage < 604) prefetchPage(currentPage + 1);
    if (currentPage > 1) prefetchPage(currentPage - 1);
  }, [currentPage, fetchPage, prefetchPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= 604) {
      setCurrentPage(page);
    }
  }, []);

  const nextPage = useCallback(() => {
    if (currentPage < 604) {
      setCurrentPage((p) => p + 1);
    }
  }, [currentPage]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  return {
    ...data,
    currentPage,
    goToPage,
    nextPage,
    previousPage,
    refetch: () => fetchPage(currentPage),
  };
}
