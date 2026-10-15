'use client';

import { useState, useEffect } from 'react';
import type { Verse } from '@/types/quran';

interface TafsirModalProps {
  verse: Verse;
  onClose: () => void;
}

interface TafsirData {
  text: string;
  resourceName?: string;
}

export default function TafsirModal({ verse, onClose }: TafsirModalProps) {
  const [tafsir, setTafsir] = useState<TafsirData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tafsirId, setTafsirId] = useState(169);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch(`/api/quran/tafsir/${verse.verseKey}?tafsir_id=${tafsirId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load tafsir');
        return res.json() as Promise<{ tafsir: TafsirData }>;
      })
      .then((data) => {
        setTafsir(data.tafsir);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'تعذر تحميل التفسير');
        setIsLoading(false);
      });
  }, [verse.verseKey, tafsirId]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: '#FBF8EF' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              تفسير الآية {verse.verseKey}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-full hover:bg-white/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tafsir source selector */}
        <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(200,168,91,0.3)' }}>
          <select
            value={tafsirId}
            onChange={(e) => setTafsirId(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: '#C8A85B',
              color: '#17231D',
              backgroundColor: 'white',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <option value={169}>تفسير الميسر</option>
            <option value={91}>تفسير الطبري</option>
            <option value={92}>تفسير ابن كثير</option>
            <option value={93}>تفسير القرطبي</option>
          </select>
        </div>

        {/* Verse text */}
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: 'rgba(200,168,91,0.3)', backgroundColor: 'rgba(18,59,42,0.03)' }}
        >
          <p
            dir="rtl"
            className="text-center"
            style={{
              fontFamily: "'Amiri', serif",
              fontSize: '1.3rem',
              lineHeight: 2.2,
              color: '#123B2A',
            }}
          >
            {verse.textUthmani}
          </p>
        </div>

        {/* Tafsir content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-4 rounded" style={{ width: `${90 - i * 10}%` }} />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-3" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                {error}
              </p>
              <button
                onClick={() => { setIsLoading(true); setError(null); }}
                className="px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#123B2A' }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {tafsir && !isLoading && (
            <div
              dir="rtl"
              className="prose prose-lg max-w-none"
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: '1.1rem',
                lineHeight: 2,
                color: '#17231D',
              }}
              dangerouslySetInnerHTML={{ __html: tafsir.text }}
            />
          )}
        </div>
      </div>
    </>
  );
}
