'use client';

import { useState } from 'react';
import { SURAH_NAMES, SURAH_PAGES, getSurahName } from '@/lib/quran-meta';

interface SearchResultItem {
  verseKey: string;
  verse_key?: string;
  text?: string;
  text_uthmani?: string;
  pageNumber?: number;
  page_number?: number;
  highlighted?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPage: (page: number) => void;
  nightMode?: boolean;
}

export default function SearchModal({
  isOpen,
  onClose,
  onNavigateToPage,
  nightMode = false,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalResults, setTotalResults] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(null);

    // Check for direct surah:ayah reference, e.g. "2:255" or "1:1"
    const ayahMatch = trimmed.match(/^(\d{1,3}):(\d{1,3})$/);
    if (ayahMatch) {
      const surahNum = parseInt(ayahMatch[1], 10);
      const ayahNum = parseInt(ayahMatch[2], 10);
      if (surahNum >= 1 && surahNum <= 114) {
        const page = SURAH_PAGES[surahNum] || 1;
        onNavigateToPage(page);
        onClose();
        return;
      }
    }

    // Check for surah number directly, e.g. "18"
    const surahOnlyMatch = trimmed.match(/^(\d{1,3})$/);
    if (surahOnlyMatch) {
      const surahNum = parseInt(surahOnlyMatch[1], 10);
      if (surahNum >= 1 && surahNum <= 114) {
        const page = SURAH_PAGES[surahNum] || 1;
        onNavigateToPage(page);
        onClose();
        return;
      }
    }

    setIsLoading(true);
    setResults([]);
    setTotalResults(null);

    try {
      const res = await fetch(`/api/quran/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error('تعذر إتمام البحث');
      }
      const data = await res.json() as {
        search?: {
          results?: SearchResultItem[];
          total_results?: number;
        };
      };

      const rawResults = data.search?.results || [];
      const total = data.search?.total_results ?? rawResults.length;

      setResults(rawResults);
      setTotalResults(total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء البحث';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    const key = item.verseKey || item.verse_key || '';
    const pageNum = item.pageNumber || item.page_number;

    if (pageNum && pageNum >= 1 && pageNum <= 604) {
      onNavigateToPage(pageNum);
      onClose();
      return;
    }

    if (key) {
      const [surahStr] = key.split(':');
      const surahNum = parseInt(surahStr, 10);
      if (surahNum >= 1 && surahNum <= 114) {
        const page = SURAH_PAGES[surahNum] || 1;
        onNavigateToPage(page);
        onClose();
        return;
      }
    }

    onClose();
  };

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

      {/* Modal Container */}
      <div
        className="fixed inset-x-4 top-[8%] bottom-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: bgColor, color: textColor }}
        dir="rtl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              البحث في القرآن الكريم
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

        {/* Search Input Bar */}
        <div className="p-4 border-b" style={{ borderColor: 'rgba(200,168,91,0.25)' }}>
          <div className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="اكتب كلمة، أو رقم سورة وآية مثل 2:255..."
              className="flex-1 px-4 py-3 rounded-xl border-2 text-base focus:outline-none"
              style={{
                borderColor: '#C8A85B',
                color: textColor,
                backgroundColor: nightMode ? '#0D1F17' : 'white',
                fontFamily: "'Tajawal', sans-serif",
              }}
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 rounded-xl text-white font-bold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
            >
              {isLoading ? '...' : 'بحث'}
            </button>
          </div>
          <p className="text-xs mt-2 opacity-60" style={{ fontFamily: "'Tajawal', sans-serif" }}>
            أمثلة: «الله نور السماوات» أو «2:255» (سورة:آية) أو رقم السورة مباشرة.
          </p>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="w-8 h-8 border-3 rounded-full animate-spin"
                style={{ borderColor: '#C8A85B', borderTopColor: 'transparent' }}
              />
              <p className="text-sm opacity-70" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                جارٍ البحث في آيات الذكر الحكيم...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2 font-medium" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                {error}
              </p>
              <p className="text-xs opacity-60" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تأكد من إعداد بيانات الاعتماد أو اتصال الإنترنت
              </p>
            </div>
          )}

          {totalResults !== null && !isLoading && results.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-base font-medium opacity-75" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                لم يتم العثور على نتائج لـ «{query}»
              </p>
            </div>
          )}

          {totalResults !== null && totalResults > 0 && !isLoading && (
            <div className="text-xs font-semibold px-1 py-1 opacity-70" style={{ color: '#C8A85B' }}>
              تم العثور على {totalResults} نتيجة:
            </div>
          )}

          {results.map((item, idx) => {
            const key = item.verseKey || item.verse_key || '';
            const surahNum = key ? parseInt(key.split(':')[0], 10) : 0;
            const ayahNum = key ? key.split(':')[1] : '';
            const surahName = surahNum ? getSurahName(surahNum) : '';
            const text = item.text || item.text_uthmani || '';

            return (
              <div
                key={key || idx}
                onClick={() => handleSelectResult(item)}
                className="p-4 rounded-xl border transition-all cursor-pointer hover:border-[#C8A85B] hover:shadow-md"
                style={{
                  backgroundColor: nightMode ? '#0D1F17' : 'white',
                  borderColor: 'rgba(200,168,91,0.2)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(18,59,42,0.1)', color: '#123B2A' }}
                  >
                    سورة {surahName} : آية {ayahNum}
                  </span>
                  <span className="text-xs opacity-60 font-medium">
                    انتقال للمصحف ←
                  </span>
                </div>
                <p
                  className="leading-loose"
                  style={{
                    fontFamily: "'Amiri', serif",
                    fontSize: '1.2rem',
                    color: textColor,
                  }}
                  dangerouslySetInnerHTML={item.highlighted ? { __html: item.highlighted } : undefined}
                >
                  {!item.highlighted && text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
