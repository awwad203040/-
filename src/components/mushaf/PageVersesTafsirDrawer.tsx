'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Verse } from '@/types/quran';

export interface TafsirOption {
  id: number;
  name: string;
  author: string;
  description: string;
}

export const TAFSIR_RESOURCES: TafsirOption[] = [
  {
    id: 16,
    name: 'التفسير الميسر',
    author: 'مجمع الملك فهد لطباعة المصحف الشريف',
    description: 'تفسير واضح وميسر باللغة العربية صادر عن مجمع الملك فهد',
  },
  {
    id: 91,
    name: 'تفسير السعدي',
    author: 'الشيخ عبد الرحمن بن ناصر السعدي',
    description: 'تيسير الكريم الرحمن في تفسير كلام المنان — من أسهل وأجلّ كتب التفسير',
  },
  {
    id: 14,
    name: 'تفسير ابن كثير',
    author: 'الإمام الحافظ عماد الدين ابن كثير',
    description: 'تفسير القرآن العظيم — أشهر كتب التفسير بالمأثور',
  },
  {
    id: 15,
    name: 'تفسير الطبري',
    author: 'الإمام محمد بن جرير الطبري',
    description: 'جامع البيان عن تأويل آي القرآن — إمام المفسرين وشيخهم',
  },
  {
    id: 90,
    name: 'تفسير القرطبي',
    author: 'الإمام شمس الدين القرطبي',
    description: 'الجامع لأحكام القرآن — التفسير الشامل للأحكام الفقهية',
  },
  {
    id: 94,
    name: 'تفسير البغوي',
    author: 'الإمام الحسين بن مسعود البغوي',
    description: 'معالم التنزيل في تفسير القرآن — تفسير متوسط جامع',
  },
  {
    id: 93,
    name: 'التفسير الوسيط',
    author: 'د. محمد سيد طنطاوي',
    description: 'التفسير الوسيط للقرآن الكريم بأسلوب عصري رصين',
  },
];

interface PageVersesTafsirDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  verses: Verse[];
  selectedTafsirId: number;
  onSelectTafsirId: (id: number) => void;
  onPlayVerse?: (verse: Verse) => void;
  nightMode?: boolean;
}

// In-memory cache for fast verse switching on the page
const tafsirCache = new Map<string, string>();

/**
 * Universal Tafsir fetcher:
 * 1. Direct from official Quran.com API (CORS enabled, works natively inside Capacitor Mobile APK)
 * 2. Fallback to local Next.js proxy route
 */
async function fetchTafsirText(tafsirId: number, verseKey: string): Promise<string> {
  const cacheKey = `${verseKey}_${tafsirId}`;
  if (tafsirCache.has(cacheKey)) {
    return tafsirCache.get(cacheKey)!;
  }

  // 1. Direct fetch from official Quran Foundation Content API
  try {
    const directRes = await fetch(
      `https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}?language=ar`
    );
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.tafsir?.text) {
        tafsirCache.set(cacheKey, data.tafsir.text);
        return data.tafsir.text;
      }
    }
  } catch (err) {
    console.warn('Direct tafsir fetch failed, attempting local proxy fallback:', err);
  }

  // 2. Fallback to local proxy
  try {
    const proxyRes = await fetch(`/api/quran/tafsir/${verseKey}?tafsir_id=${tafsirId}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data?.tafsir?.text) {
        tafsirCache.set(cacheKey, data.tafsir.text);
        return data.tafsir.text;
      }
    }
  } catch (err) {
    console.error('All tafsir fetch attempts failed:', err);
  }

  throw new Error('تعذر تحميل نص التفسير، تأكد من اتصال الإنترنت وحاول مجدداً.');
}

export default function PageVersesTafsirDrawer({
  isOpen,
  onClose,
  currentPage,
  verses,
  selectedTafsirId,
  onSelectTafsirId,
  onPlayVerse,
  nightMode = false,
}: PageVersesTafsirDrawerProps) {
  const [selectedVerseIndex, setSelectedVerseIndex] = useState(0);
  const [activeTafsirId, setActiveTafsirId] = useState(selectedTafsirId || 16);
  const [tafsirText, setTafsirText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync activeTafsirId when prop changes
  useEffect(() => {
    if (selectedTafsirId) {
      setActiveTafsirId(selectedTafsirId);
    }
  }, [selectedTafsirId]);

  // Reset selected verse index when verses or page changes
  useEffect(() => {
    setSelectedVerseIndex(0);
  }, [currentPage, verses]);

  const selectedVerse: Verse | undefined = verses[selectedVerseIndex] || verses[0];

  // Fetch tafsir whenever selectedVerse or activeTafsirId changes
  useEffect(() => {
    if (!selectedVerse || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchTafsirText(activeTafsirId, selectedVerse.verseKey)
      .then((text) => {
        if (!isMounted) return;
        setTafsirText(text);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'تعذر تحميل التفسير');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedVerse, activeTafsirId, isOpen]);

  const handleTafsirChange = (id: number) => {
    setActiveTafsirId(id);
    onSelectTafsirId(id);
  };

  const handleNextAyah = () => {
    if (selectedVerseIndex < verses.length - 1) {
      setSelectedVerseIndex((prev) => prev + 1);
    }
  };

  const handlePrevAyah = () => {
    if (selectedVerseIndex > 0) {
      setSelectedVerseIndex((prev) => prev - 1);
    }
  };

  const handleCopy = () => {
    if (!selectedVerse) return;
    const currentTafsir = TAFSIR_RESOURCES.find((t) => t.id === activeTafsirId);
    const plainTafsir = tafsirText.replace(/<[^>]*>?/gm, '').trim();
    const content = `﴿ ${selectedVerse.textUthmani} ﴾ [${selectedVerse.verseKey}]\n\n【${currentTafsir?.name || 'التفسير'}】:\n${plainTafsir}\n\n— تطبيق نور القرآن`;
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTafsirMeta = useMemo(() => {
    return TAFSIR_RESOURCES.find((t) => t.id === activeTafsirId) || TAFSIR_RESOURCES[0];
  }, [activeTafsirId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className={`w-full max-w-5xl h-[92vh] max-h-[94vh] rounded-3xl shadow-2xl border-2 border-[#C8A85B]/70 flex flex-col overflow-hidden ${
          nightMode ? 'bg-[#0D1F17] text-[#E8E4D9]' : 'bg-[#FBF8EF] text-[#17231D]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between border-b border-[#C8A85B]/40 shrink-0 select-none"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl text-[#C8A85B]">📖</span>
            <div>
              <h2
                className="text-sm sm:text-lg font-bold leading-tight flex items-center gap-2"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span>آيات وتفسير صفحة {currentPage}</span>
                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-[#C8A85B] text-[#123B2A] font-bold">
                  {verses.length} آيات
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-white/75 mt-0.5 hidden xs:block" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                الآيات يميناً، وقائمة التفاسير المعتمدة ونَصّ التفسير يساراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15 active:scale-95 text-lg transition cursor-pointer"
            aria-label="إغلاق النافذة"
            title="إغلاق (✕)"
          >
            ✕
          </button>
        </div>

        {/* ========================================================================= */}
        {/* DUAL-COLUMN BODY: ALWAYS SIDE-BY-SIDE (RIGHT = VERSES, LEFT = TAFSIRS)   */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-row overflow-hidden min-h-0 divide-x divide-x-reverse divide-[#C8A85B]/30">
          
          {/* ======================================================================= */}
          {/* RIGHT COLUMN (اليمين): قائمة آيات الصفحة                                */}
          {/* ======================================================================= */}
          <div className="w-[38%] xs:w-[40%] sm:w-[42%] md:w-[35%] lg:w-[32%] flex flex-col h-full bg-black/5 shrink-0 overflow-hidden">
            {/* Column Header */}
            <div className="px-2.5 sm:px-3 py-2 bg-[#123B2A]/10 border-b border-[#C8A85B]/30 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#123B2A] select-none shrink-0">
              <span className="flex items-center gap-1" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                <span>📜</span>
                <span>الآيات ({verses.length})</span>
              </span>
              <span className="text-[10px] text-gray-500 font-sans hidden sm:inline">
                اضغط للتحديد
              </span>
            </div>

            {/* Scrollable Verses List */}
            <div className="flex-1 overflow-y-auto p-1.5 sm:p-2.5 space-y-1.5 sm:space-y-2">
              {verses.map((verse, idx) => {
                const isSelected = idx === selectedVerseIndex;
                return (
                  <div
                    key={verse.id || verse.verseKey}
                    onClick={() => setSelectedVerseIndex(idx)}
                    role="button"
                    tabIndex={0}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer border text-right select-none ${
                      isSelected
                        ? 'bg-[#123B2A] text-white border-[#C8A85B] shadow-md scale-[1.01]'
                        : nightMode
                        ? 'bg-[#142A1F] text-[#E8E4D9] border-[#C8A85B]/20 hover:border-[#C8A85B]/60'
                        : 'bg-white text-[#17231D] border-[#C8A85B]/30 hover:border-[#C8A85B]/70 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                          isSelected
                            ? 'bg-[#C8A85B] text-[#123B2A]'
                            : 'bg-[#123B2A]/10 text-[#123B2A]'
                        }`}
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        الآية {verse.verseKey}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-[#C8A85B] font-bold">
                          ✓ نشطة
                        </span>
                      )}
                    </div>

                    <p
                      className="text-xs sm:text-sm md:text-base leading-relaxed font-bold line-clamp-3"
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {verse.textUthmani}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================================= */}
          {/* LEFT COLUMN (اليسار): قائمة التفاسير وعرض تفسير الآية المختارة          */}
          {/* ======================================================================= */}
          <div className="w-[62%] xs:w-[60%] sm:w-[58%] md:w-[65%] lg:w-[68%] flex flex-col h-full flex-1 overflow-hidden bg-transparent">
            
            {/* Top Bar: Tafsir Source Selector (قائمة التفاسير المعتمدة) */}
            <div className="p-2 sm:p-3.5 bg-white/80 border-b border-[#C8A85B]/30 shrink-0 space-y-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <label
                  htmlFor="tafsir-selector"
                  className="text-xs sm:text-sm font-bold text-[#123B2A] flex items-center gap-1 shrink-0"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  <span className="text-sm sm:text-base text-[#C8A85B]">📚</span>
                  <span className="hidden xs:inline">المفسر:</span>
                </label>

                {/* Dropdown Selector */}
                <select
                  id="tafsir-selector"
                  value={activeTafsirId}
                  onChange={(e) => handleTafsirChange(parseInt(e.target.value, 10))}
                  className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 text-[11px] sm:text-xs md:text-sm font-bold shadow-xs cursor-pointer focus:outline-none transition-all truncate"
                  style={{
                    borderColor: '#C8A85B',
                    color: '#123B2A',
                    backgroundColor: '#FBF8EF',
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  {TAFSIR_RESOURCES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.author}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Tafsir Chips for 1-Click Access */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                {TAFSIR_RESOURCES.map((t) => {
                  const isCur = t.id === activeTafsirId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTafsirChange(t.id)}
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isCur
                          ? 'bg-[#123B2A] text-[#C8A85B] shadow-xs scale-105'
                          : 'bg-black/5 hover:bg-black/10 text-gray-700'
                      }`}
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Verse Header Preview */}
            {selectedVerse && (
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-[#123B2A]/5 border-b border-[#C8A85B]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-[#123B2A] text-white" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      الآية {selectedVerse.verseKey}
                    </span>
                    <span className="text-[10px] sm:text-xs text-[#C8A85B] font-bold truncate" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      {currentTafsirMeta.name}
                    </span>
                  </div>
                  <p
                    className="text-xs sm:text-sm md:text-base font-bold text-[#123B2A] leading-relaxed line-clamp-2"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    ﴿ {selectedVerse.textUthmani} ﴾
                  </p>
                </div>

                {/* Actions: Play Verse Audio & Copy */}
                <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                  {onPlayVerse && (
                    <button
                      type="button"
                      onClick={() => onPlayVerse(selectedVerse)}
                      className="px-2.5 py-1 rounded-lg bg-[#123B2A] hover:bg-[#0B5B43] text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition shadow-2xs cursor-pointer"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                      title="استماع لتلاوة هذه الآية"
                    >
                      <span>▶</span>
                      <span className="hidden xs:inline">استماع</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-lg bg-[#C8A85B] hover:bg-[#b5954a] text-[#123B2A] text-[11px] font-bold flex items-center gap-1 active:scale-95 transition shadow-2xs cursor-pointer"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                    title="نسخ الآية وتفسيرها"
                  >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span className="hidden xs:inline">{copied ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tafsir Body Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
              {isLoading && (
                <div className="space-y-3 py-6">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#123B2A]">
                    <div className="w-5 h-5 border-2 border-[#C8A85B] border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ تحميل تفسير {currentTafsirMeta.name}...</span>
                  </div>
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-3.5 bg-[#123B2A]/10 rounded-full animate-pulse"
                      style={{ width: `${95 - (i % 3) * 12}%` }}
                    />
                  ))}
                </div>
              )}

              {error && !isLoading && (
                <div className="text-center py-6 bg-red-50 rounded-2xl border border-red-200 p-3">
                  <p className="text-xs sm:text-sm font-bold text-red-700 mb-1" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    ⚠️ {error}
                  </p>
                  <p className="text-[11px] text-red-600 mb-3" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    تأكد من تشغيل الإنترنت أو اختر مفسراً آخر من القائمة أعلاه
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTafsirChange(activeTafsirId)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#123B2A] text-white text-xs font-bold hover:bg-[#0B5B43] active:scale-95 transition cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {!isLoading && !error && tafsirText && (
                <div className="animate-fadeIn">
                  <div
                    className="prose prose-sm sm:prose-base max-w-none text-[#17231D] leading-relaxed sm:leading-loose text-justify font-normal"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '1.15rem',
                      lineHeight: '2.2',
                      color: nightMode ? '#E8E4D9' : '#17231D',
                    }}
                    dangerouslySetInnerHTML={{ __html: tafsirText }}
                  />
                  <div className="mt-6 pt-3 border-t border-[#C8A85B]/30 flex items-center justify-between text-[11px] text-gray-500 font-sans">
                    <span>المصدر: {currentTafsirMeta.author}</span>
                    <span className="font-bold text-[#C8A85B]">نور القرآن</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Verse Navigation Controls */}
            <div className="p-2 sm:p-2.5 bg-white/80 border-t border-[#C8A85B]/30 flex items-center justify-between gap-2 shrink-0 select-none">
              <button
                type="button"
                onClick={handleNextAyah}
                disabled={selectedVerseIndex >= verses.length - 1}
                className="flex-1 py-1.5 sm:py-2 px-2 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span>◀ الآية التالية</span>
              </button>

              <span className="text-[11px] sm:text-xs font-bold text-[#123B2A] px-2 select-none" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                {selectedVerseIndex + 1} / {verses.length}
              </span>

              <button
                type="button"
                onClick={handlePrevAyah}
                disabled={selectedVerseIndex <= 0}
                className="flex-1 py-1.5 sm:py-2 px-2 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span>الآية السابقة ▶</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
