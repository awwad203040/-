'use client';

import { useState, useEffect } from 'react';
import { POPULAR_RECITERS, type ReciterInfo } from '@/lib/quran-meta';

interface ReciterModalProps {
  isOpen: boolean;
  selectedReciterId: number;
  onSelectReciter: (id: number, name: string) => void;
  onClose: () => void;
  nightMode?: boolean;
}

export default function ReciterModal({
  isOpen,
  selectedReciterId,
  onSelectReciter,
  onClose,
  nightMode = false,
}: ReciterModalProps) {
  const [reciters, setReciters] = useState<ReciterInfo[]>(POPULAR_RECITERS);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Try to fetch additional reciters from API if available
    fetch('/api/quran/reciters')
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          reciters?: Array<{
            id: number;
            name?: string;
            reciter_name?: string;
            englishName?: string;
            style?: string;
          }>;
        }>;
      })
      .then((data) => {
        if (data?.reciters && Array.isArray(data.reciters) && data.reciters.length > 0) {
          const mapped: ReciterInfo[] = data.reciters
            .filter((r) => r && typeof r.id === 'number')
            .map((r) => ({
              id: r.id,
              name: r.name || r.reciter_name || `قارئ ${r.id}`,
              englishName: r.englishName || r.reciter_name || r.style || '',
            }));

          // Merge avoiding duplicates
          const ids = new Set(POPULAR_RECITERS.map((p) => p.id));
          const additions = mapped.filter((m) => !ids.has(m.id) && m.name);
          setReciters([...POPULAR_RECITERS, ...additions]);
        }
      })
      .catch(() => {
        // Fallback to default popular reciters
      });
  }, []);

  if (!isOpen) return null;

  const query = (search || '').toLowerCase().trim();
  const filtered = reciters.filter((r) => {
    if (!r) return false;
    if (!query) return true;
    const nameStr = (r.name || '').toLowerCase();
    const engStr = (r.englishName || '').toLowerCase();
    return nameStr.includes(query) || engStr.includes(query);
  });

  const bgColor = nightMode ? '#142A1F' : '#FBF8EF';
  const textColor = nightMode ? '#E8E4D9' : '#17231D';

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
        className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: bgColor, color: textColor }}
        dir="rtl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙️</span>
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              اختيار القارئ
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

        {/* Search */}
        <div className="p-3 border-b" style={{ borderColor: 'rgba(200,168,91,0.2)' }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن قارئ..."
            className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{
              borderColor: '#C8A85B',
              backgroundColor: nightMode ? '#0D1F17' : 'white',
              color: textColor,
              fontFamily: "'Tajawal', sans-serif",
            }}
          />
        </div>

        {/* Reciters List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map((reciter) => {
            const isSelected = reciter.id === selectedReciterId;
            return (
              <button
                key={reciter.id}
                onClick={() => {
                  onSelectReciter(reciter.id, reciter.name);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-right transition-all border"
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(200,168,91,0.18)'
                    : nightMode ? '#0D1F17' : 'white',
                  borderColor: isSelected ? '#C8A85B' : 'rgba(18,59,42,0.08)',
                }}
              >
                <div>
                  <p
                    className="font-bold text-base"
                    style={{
                      fontFamily: "'Tajawal', sans-serif",
                      color: isSelected ? '#C8A85B' : textColor,
                    }}
                  >
                    {reciter.name}
                  </p>
                  {reciter.englishName && (
                    <p className="text-xs opacity-60 mt-0.5">{reciter.englishName}</p>
                  )}
                </div>

                {isSelected && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: '#C8A85B' }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
