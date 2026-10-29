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

    const cacheKey = `${selectedVerse.verseKey}_${activeTafsirId}`;
    if (tafsirCache.has(cacheKey)) {
      setTafsirText(tafsirCache.get(cacheKey)!);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/quran/tafsir/${selectedVerse.verseKey}?tafsir_id=${activeTafsirId}`)
      .then((res) => {
        if (!res.ok) throw new Error('تعذر تحميل نص التفسير');
        return res.json() as Promise<{ tafsir?: { text?: string }; error?: string }>;
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.tafsir && data.tafsir.text) {
          tafsirCache.set(cacheKey, data.tafsir.text);
          setTafsirText(data.tafsir.text);
        } else if (data.error) {
          setError(data.error);
        } else {
          setTafsirText('لا يتوفر تفسير مسجل لهذه الآية حالياً في هذا المصدر.');
        }
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
    // Strip HTML tags for clipboard
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className={`w-full max-w-5xl rounded-3xl shadow-2xl border-2 border-[#C8A85B]/60 flex flex-col overflow-hidden max-h-[92vh] ${
          nightMode ? 'bg-[#0D1F17] text-[#E8E4D9]' : 'bg-[#FBF8EF] text-[#17231D]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#C8A85B]/40 shrink-0 select-none"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#C8A85B]">📖</span>
            <div>
              <h2
                className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span>آيات وتفسير الصفحة {currentPage}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#C8A85B] text-[#123B2A] font-bold">
                  {verses.length} آيات
                </span>
              </h2>
              <p className="text-[11px] text-white/75 mt-0.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                اختر الآية من القائمة يميناً، واختر المفسر المفضل لديك من القائمة يساراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15 active:scale-95 text-lg transition cursor-pointer"
            aria-label="إغلاق النافذة"
            title="إغلاق (✕)"
          >
            ✕
          </button>
        </div>

        {/* Dual-Column Body: Right = Verses List, Left = Tafsir List & Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#C8A85B]/30">
          
          {/* ============================================================== */}
          {/* RIGHT SIDE (اليمين): قائمة آيات الصفحة                          */}
          {/* ============================================================== */}
          <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col bg-black/5 shrink-0 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[#123B2A]/10 border-b border-[#C8A85B]/30 flex items-center justify-between text-xs font-bold text-[#123B2A] select-none">
              <span className="flex items-center gap-1.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                <span>📜</span>
                <span>آيات الصفحة ({verses.length})</span>
              </span>
              <span className="text-[10px] text-gray-500 font-sans">
                اضغط للتحديد
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {verses.map((verse, idx) => {
                const isSelected = idx === selectedVerseIndex;
                return (
                  <div
                    key={verse.id || verse.verseKey}
                    onClick={() => setSelectedVerseIndex(idx)}
                    role="button"
                    tabIndex={0}
                    className={`p-3 rounded-2xl transition-all cursor-pointer border text-right select-none ${
                      isSelected
                        ? 'bg-[#123B2A] text-white border-[#C8A85B] shadow-lg scale-[1.01]'
                        : nightMode
                        ? 'bg-[#142A1F] text-[#E8E4D9] border-[#C8A85B]/20 hover:border-[#C8A85B]/60'
                        : 'bg-white text-[#17231D] border-[#C8A85B]/30 hover:border-[#C8A85B]/70 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          isSelected
                            ? 'bg-[#C8A85B] text-[#123B2A]'
                            : 'bg-[#123B2A]/10 text-[#123B2A]'
                        }`}
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        الآية {verse.verseKey}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] text-[#C8A85B] font-bold">
                          ✓ المحددة حالياً
                        </span>
                      )}
                    </div>

                    <p
                      className="text-sm sm:text-base leading-relaxed font-bold line-clamp-2"
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {verse.textUthmani}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ============================================================== */}
          {/* LEFT SIDE (اليسار): قائمة التفاسير وعرض تفسير الآية المختارة    */}
          {/* ============================================================== */}
          <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col flex-1 overflow-hidden bg-transparent">
            
            {/* Top Toolbar: Tafsir Selector (قائمة التفاسير المعتمدة) */}
            <div className="p-3 sm:p-4 bg-white/70 border-b border-[#C8A85B]/30 shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="tafsir-selector"
                  className="text-xs sm:text-sm font-bold text-[#123B2A] flex items-center gap-1.5 shrink-0"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  <span className="text-base text-[#C8A85B]">📚</span>
                  <span>المفسر:</span>
                </label>

                {/* Dropdown Selector */}
                <select
                  id="tafsir-selector"
                  value={activeTafsirId}
                  onChange={(e) => handleTafsirChange(parseInt(e.target.value, 10))}
                  className="flex-1 px-3 py-2 rounded-xl border-2 text-xs sm:text-sm font-bold shadow-xs cursor-pointer focus:outline-none transition-all"
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                {TAFSIR_RESOURCES.map((t) => {
                  const isCur = t.id === activeTafsirId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTafsirChange(t.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isCur
                          ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm scale-105'
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

            {/* Selected Verse Banner */}
            {selectedVerse && (
              <div className="px-4 py-3 bg-[#123B2A]/5 border-b border-[#C8A85B]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#123B2A] text-white" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      الآية {selectedVerse.verseKey}
                    </span>
                    <span className="text-xs text-[#C8A85B] font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      {currentTafsirMeta.name}
                    </span>
                  </div>
                  <p
                    className="text-base sm:text-lg font-bold text-[#123B2A] leading-relaxed"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    ﴿ {selectedVerse.textUthmani} ﴾
                  </p>
                </div>

                {/* Actions: Play Verse Audio & Copy */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {onPlayVerse && (
                    <button
                      type="button"
                      onClick={() => onPlayVerse(selectedVerse)}
                      className="px-3 py-1.5 rounded-xl bg-[#123B2A] hover:bg-[#0B5B43] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-xs cursor-pointer"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                      title="استماع لتلاوة هذه الآية"
                    >
                      <span>▶</span>
                      <span>استماع</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-[#C8A85B] hover:bg-[#b5954a] text-[#123B2A] text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-xs cursor-pointer"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                    title="نسخ الآية وتفسيرها"
                  >
                    <span>{copied ? '✓ تم النسخ' : '📋 نسخ'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tafsir Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {isLoading && (
                <div className="space-y-3 py-6">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#123B2A]">
                    <div className="w-5 h-5 border-2 border-[#C8A85B] border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ تحميل تفسير {currentTafsirMeta.name}...</span>
                  </div>
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 bg-[#123B2A]/10 rounded-full animate-pulse"
                      style={{ width: `${95 - (i % 3) * 12}%` }}
                    />
                  ))}
                </div>
              )}

              {error && !isLoading && (
                <div className="text-center py-8 bg-red-50 rounded-2xl border border-red-200 p-4">
                  <p className="text-sm font-bold text-red-700 mb-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    ⚠️ {error}
                  </p>
                  <p className="text-xs text-red-600 mb-4" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    تأكد من اتصال الإنترنت أو جرّب اختيار مفسر آخر من القائمة أعلاه
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTafsirChange(activeTafsirId)}
                    className="px-4 py-2 rounded-xl bg-[#123B2A] text-white text-xs font-bold hover:bg-[#0B5B43] active:scale-95 transition cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {!isLoading && !error && tafsirText && (
                <div className="animate-fadeIn">
                  <div
                    className="prose prose-sm sm:prose-base max-w-none text-[#17231D] leading-loose text-justify font-normal"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '1.25rem',
                      lineHeight: '2.4',
                      color: nightMode ? '#E8E4D9' : '#17231D',
                    }}
                    dangerouslySetInnerHTML={{ __html: tafsirText }}
                  />
                  <div className="mt-8 pt-4 border-t border-[#C8A85B]/30 flex items-center justify-between text-xs text-gray-500 font-sans">
                    <span>المصدر: {currentTafsirMeta.author}</span>
                    <span className="font-bold text-[#C8A85B]">نور القرآن</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Verse Navigation Controls */}
            <div className="p-3 bg-white/80 border-t border-[#C8A85B]/30 flex items-center justify-between gap-2 shrink-0 select-none">
              <button
                type="button"
                onClick={handleNextAyah}
                disabled={selectedVerseIndex >= verses.length - 1}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span>◀ الآية التالية</span>
              </button>

              <span className="text-xs font-bold text-[#123B2A] px-3 select-none" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                {selectedVerseIndex + 1} / {verses.length}
              </span>

              <button
                type="button"
                onClick={handlePrevAyah}
                disabled={selectedVerseIndex <= 0}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white hover:bg-[#0B5B43] active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
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
