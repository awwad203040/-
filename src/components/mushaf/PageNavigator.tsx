'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  SURAH_METADATA,
  JUZ_METADATA,
  getSurahForPage,
  parseArabicOrWesternNumber,
} from '@/lib/quran-meta';

interface PageNavigatorProps {
  currentPage: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  onBookmarkPage: () => void;
  isBookmarked: boolean;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

const MILESTONE_PAGES = [
  { page: 1, label: 'صفحة 1 (الفاتحة)' },
  { page: 2, label: 'صفحة 2 (البقرة)' },
  { page: 50, label: 'صفحة 50 (آل عمران)' },
  { page: 77, label: 'صفحة 77 (النساء)' },
  { page: 106, label: 'صفحة 106 (المائدة)' },
  { page: 208, label: 'صفحة 208 (يونس)' },
  { page: 293, label: 'صفحة 293 (الكهف)' },
  { page: 302, label: 'صفحة 302 (نصف القرآن)' },
  { page: 440, label: 'صفحة 440 (يس)' },
  { page: 500, label: 'صفحة 500' },
  { page: 562, label: 'صفحة 562 (الملك)' },
  { page: 582, label: 'صفحة 582 (جزء عم)' },
  { page: 604, label: 'صفحة 604 (الختام)' },
];

export default function PageNavigator({
  currentPage,
  onPrevious,
  onNext,
  onGoToPage,
  onBookmarkPage,
  isBookmarked,
  isOpenModal,
  onCloseModal,
}: PageNavigatorProps) {
  const [internalShowGoTo, setInternalShowGoTo] = useState(false);
  const showGoTo = isOpenModal !== undefined ? isOpenModal : internalShowGoTo;

  const setShowGoTo = (open: boolean) => {
    if (isOpenModal !== undefined && onCloseModal && !open) {
      onCloseModal();
    }
    setInternalShowGoTo(open);
  };

  const [activeTab, setActiveTab] = useState<'number' | 'surah' | 'juz'>('number');
  const [inputPage, setInputPage] = useState('');
  const [surahSearch, setSurahSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Whenever modal opens, initialize input with current page
  useEffect(() => {
    if (showGoTo) {
      setInputPage(currentPage.toString());
      setErrorMsg('');
    }
  }, [showGoTo, currentPage]);

  const handleNavigate = (targetPage: number) => {
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= 604) {
      onGoToPage(targetPage);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      setShowGoTo(false);
      setInputPage('');
      setErrorMsg('');
    } else {
      setErrorMsg('يرجى اختيار رقم صفحة بين 1 و 604');
    }
  };

  const handleInputSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseArabicOrWesternNumber(inputPage);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 604) {
      handleNavigate(parsed);
    } else {
      setErrorMsg('يرجى إدخال رقم صفحة صحيح بين 1 و 604');
    }
  };

  const handleStep = (step: number) => {
    const currentVal = parseArabicOrWesternNumber(inputPage) || currentPage;
    const nextVal = Math.max(1, Math.min(604, currentVal + step));
    setInputPage(nextVal.toString());
    setErrorMsg('');
  };

  // Surahs filtered for Tab 2
  const filteredSurahs = useMemo(() => {
    const list = Object.values(SURAH_METADATA);
    if (!surahSearch.trim()) return list;
    const query = surahSearch.trim().toLowerCase();
    const queryNum = parseArabicOrWesternNumber(query);
    return list.filter((s) => {
      return (
        s.name.includes(query) ||
        s.englishName.toLowerCase().includes(query) ||
        (!isNaN(queryNum) && (s.number === queryNum || s.startPage === queryNum))
      );
    });
  }, [surahSearch]);

  const currentSurahOnPage = getSurahForPage(currentPage);

  return (
    <>
      <nav
        className="sticky bottom-0 z-20 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.15)] border-t border-[#C8A85B]/30"
        style={{ backgroundColor: '#123B2A', color: 'white' }}
        aria-label="تنقل الصفحات"
      >
        {/* Next page (RTL: right arrow on left side) */}
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= 604}
          aria-label="الصفحة التالية"
          title="الصفحة التالية (▶)"
          style={{ touchAction: 'manipulation' }}
          className="p-2.5 sm:p-3 rounded-full hover:bg-white/10 active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center border border-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Center controls: Bookmark + Choose Page Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Bookmark */}
          <button
            onClick={onBookmarkPage}
            aria-label={isBookmarked ? 'إزالة العلامة' : 'حفظ علامة'}
            title={isBookmarked ? 'إزالة العلامة من هذه الصفحة' : 'حفظ علامة على هذه الصفحة'}
            className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? '#C8A85B' : 'none'} stroke={isBookmarked ? '#C8A85B' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Page number / Go to specific page trigger */}
          <button
            onClick={() => setShowGoTo(true)}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 border border-[#C8A85B]/60 shadow-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(200,168,91,0.25) 0%, rgba(18,59,42,0.6) 100%)',
              color: '#F7EED8',
              fontFamily: "'Tajawal', sans-serif",
            }}
            aria-label="الانتقال إلى صفحة محددة"
            title="اضغط لاختيار أو كتابة رقم الصفحة والانتقال إليها مباشرة"
          >
            <span className="text-xs text-[#C8A85B]">📖</span>
            <span>صفحة {currentPage}</span>
            <span className="text-[10px] text-[#C8A85B]/80 font-normal">/ 604</span>
            <span className="text-[11px] text-[#C8A85B] mr-0.5">▾</span>
          </button>
        </div>

        {/* Previous page (RTL: left arrow on right side) */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          aria-label="الصفحة السابقة"
          title="الصفحة السابقة (◀)"
          style={{ touchAction: 'manipulation' }}
          className="p-2.5 sm:p-3 rounded-full hover:bg-white/10 active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center border border-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>

      {/* Comprehensive "الانتقال إلى صفحة محددة" Modal */}
      {showGoTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowGoTo(false)}
        >
          <div
            className="rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border-2 border-[#C8A85B]/50 flex flex-col max-h-[90vh]"
            style={{ backgroundColor: '#FBF8EF', color: '#17231D' }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between border-b border-[#C8A85B]/30"
              style={{ backgroundColor: '#123B2A', color: 'white' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl text-[#C8A85B]">📖</span>
                <div>
                  <h3
                    className="text-base sm:text-lg font-bold leading-tight"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    الانتقال إلى صفحة محددة
                  </h3>
                  <p className="text-[11px] text-white/70">
                    أنت الآن في صفحة {currentPage} {currentSurahOnPage ? `(سورة ${currentSurahOnPage.name})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoTo(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15 text-lg transition cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Mode Tabs: برقم الصفحة / بالسورة / بالجزء */}
            <div className="flex border-b border-[#123B2A]/10 bg-white/60">
              <button
                type="button"
                onClick={() => { setActiveTab('number'); setErrorMsg(''); }}
                className="flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer"
                style={{
                  color: activeTab === 'number' ? '#123B2A' : '#17231D70',
                  borderBottom: activeTab === 'number' ? '3px solid #C8A85B' : '3px solid transparent',
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                🔢 برقم الصفحة
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('surah'); setErrorMsg(''); }}
                className="flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer"
                style={{
                  color: activeTab === 'surah' ? '#123B2A' : '#17231D70',
                  borderBottom: activeTab === 'surah' ? '3px solid #C8A85B' : '3px solid transparent',
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                📜 بالسورة (114)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('juz'); setErrorMsg(''); }}
                className="flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all cursor-pointer"
                style={{
                  color: activeTab === 'juz' ? '#123B2A' : '#17231D70',
                  borderBottom: activeTab === 'juz' ? '3px solid #C8A85B' : '3px solid transparent',
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                📚 بالجزء (30)
              </button>
            </div>

            {/* Tab Contents (Scrollable) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: By Page Number */}
              {activeTab === 'number' && (
                <div className="space-y-4">
                  {/* Direct input and navigation */}
                  <form onSubmit={handleInputSubmit} className="space-y-3">
                    <label
                      className="block text-xs font-bold text-[#123B2A]"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      اكتب رقم الصفحة (1 إلى 604):
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={inputPage}
                        onChange={(e) => {
                          setInputPage(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="1 - 604"
                        className="flex-1 px-4 py-3 rounded-2xl border-2 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#C8A85B] bg-white text-[#17231D] shadow-inner"
                        style={{ borderColor: '#C8A85B' }}
                        autoFocus
                      />

                      <button
                        type="submit"
                        className="px-6 py-3 rounded-2xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[#123B2A] to-[#0B5B43] hover:brightness-110 active:scale-95 transition shadow-md cursor-pointer border border-[#C8A85B]/60"
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        انتقال ◀
                      </button>
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-600 font-bold text-center animate-shake">
                        ⚠️ {errorMsg}
                      </p>
                    )}

                    {/* Quick Steppers (+1, -1, +10, -10) */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStep(-10)}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-[#123B2A]/8 hover:bg-[#123B2A]/15 text-[#123B2A] border border-[#123B2A]/10 transition active:scale-95 cursor-pointer"
                        title="ترجيع 10 صفحات"
                      >
                        -10 صفحات
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStep(-1)}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-[#123B2A]/8 hover:bg-[#123B2A]/15 text-[#123B2A] border border-[#123B2A]/10 transition active:scale-95 cursor-pointer"
                        title="ترجيع صفحة واحدة"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStep(1)}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-[#123B2A]/8 hover:bg-[#123B2A]/15 text-[#123B2A] border border-[#123B2A]/10 transition active:scale-95 cursor-pointer"
                        title="تقديم صفحة واحدة"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStep(10)}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-[#123B2A]/8 hover:bg-[#123B2A]/15 text-[#123B2A] border border-[#123B2A]/10 transition active:scale-95 cursor-pointer"
                        title="تقديم 10 صفحات"
                      >
                        +10 صفحات
                      </button>
                    </div>
                  </form>

                  {/* Dropdown selection: Choose directly from list of all 604 pages */}
                  <div className="pt-2 border-t border-[#123B2A]/10">
                    <label
                      className="block text-xs font-bold text-[#123B2A] mb-1.5"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      أو اختر الصفحة مباشرة من القائمة:
                    </label>
                    <select
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleNavigate(val);
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#C8A85B] bg-white text-[#17231D] text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C8A85B] cursor-pointer shadow-xs"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      {Array.from({ length: 604 }, (_, i) => i + 1).map((p) => {
                        const surah = getSurahForPage(p);
                        return (
                          <option key={p} value={p}>
                            صفحة {p} {surah ? `(سورة ${surah.name})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Milestone Page Chips */}
                  <div className="pt-2 border-t border-[#123B2A]/10">
                    <p className="text-[11px] font-bold text-[#123B2A]/70 mb-2">
                      محطات وانتقالات سريعة:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {MILESTONE_PAGES.map((m) => (
                        <button
                          key={m.page}
                          type="button"
                          onClick={() => handleNavigate(m.page)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                            currentPage === m.page
                              ? 'bg-[#123B2A] text-[#C8A85B] border-[#123B2A] shadow-xs'
                              : 'bg-white hover:bg-[#C8A85B]/20 text-[#123B2A] border-[#C8A85B]/40'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: By Surah */}
              {activeTab === 'surah' && (
                <div className="space-y-3">
                  <input
                    type="search"
                    value={surahSearch}
                    onChange={(e) => setSurahSearch(e.target.value)}
                    placeholder="ابحث عن اسم السورة أو رقمها..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#C8A85B]/60 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  />

                  <div className="divide-y divide-[#123B2A]/8 max-h-72 overflow-y-auto rounded-xl border border-[#123B2A]/10 bg-white">
                    {filteredSurahs.map((meta) => (
                      <button
                        key={meta.number}
                        type="button"
                        onClick={() => handleNavigate(meta.startPage)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-right hover:bg-[#123B2A]/6 transition cursor-pointer text-xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-[#123B2A]/8 text-[#123B2A] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {meta.number}
                          </span>
                          <div>
                            <span
                              className="font-bold text-sm text-[#17231D]"
                              style={{ fontFamily: "'Amiri', serif" }}
                            >
                              سورة {meta.name}
                            </span>
                            <span className="text-[10px] text-gray-500 mr-2">
                              {meta.revelationPlace === 'makkah' ? 'مكية' : 'مدنية'} • {meta.versesCount} آية
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-[#123B2A] bg-[#C8A85B]/20 px-2 py-0.5 rounded-md border border-[#C8A85B]/30 group-hover:bg-[#123B2A] group-hover:text-[#C8A85B] transition">
                          صفحة {meta.startPage} ◀
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: By Juz */}
              {activeTab === 'juz' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {JUZ_METADATA.map((j) => (
                    <button
                      key={j.juzNumber}
                      type="button"
                      onClick={() => handleNavigate(j.startPage)}
                      className="p-2.5 rounded-xl border border-[#C8A85B]/40 bg-white hover:bg-[#C8A85B]/15 transition cursor-pointer text-right flex flex-col justify-between group active:scale-98 shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                          الجزء {j.juzNumber}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#123B2A] text-[#C8A85B]">
                          صفحة {j.startPage} ◀
                        </span>
                      </div>
                      <div className="text-[11px] text-[#17231D] opacity-90 truncate" style={{ fontFamily: "'Amiri', serif" }}>
                        {j.name}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        يبدأ من سورة {j.startSurah}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#123B2A]/5 border-t border-[#123B2A]/10 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowGoTo(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl text-[#123B2A] hover:bg-black/5 transition cursor-pointer"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
