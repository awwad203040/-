'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Verse } from '@/types/quran';

interface VerseCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  verses: Verse[];
  surahName: string;
  nightMode?: boolean;
}

export default function VerseCopyModal({
  isOpen,
  onClose,
  currentPage,
  verses,
  surahName,
  nightMode = false,
}: VerseCopyModalProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Listen to text selection changes within the window
  useEffect(() => {
    if (!isOpen) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      const txt = sel ? sel.toString().trim() : '';
      setSelectedText(txt);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [isOpen]);

  // Copy specific custom text
  const copyTextToClipboard = useCallback(async (textToCopy: string, successLabel: string, key?: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older webviews
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      if (key) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      }
      showToast(successLabel);
    } catch (err) {
      console.error('Failed to copy text:', err);
      showToast('⚠️ تعذر النسخ، يرجى المحاولة يدوياً');
    }
  }, [showToast]);

  // Copy user-selected highlighted snippet
  const handleCopySelectedSnippet = useCallback(() => {
    if (!selectedText) return;
    copyTextToClipboard(selectedText, '✓ تم نسخ النص المحدد بنجاح');
  }, [selectedText, copyTextToClipboard]);

  // Copy full single ayah
  const handleCopySingleVerse = useCallback((verse: Verse) => {
    const formatted = `﴿ ${verse.textUthmani} ﴾ [${verse.verseKey}] — ${surahName}`;
    copyTextToClipboard(formatted, `✓ تم نسخ الآية (${verse.verseKey}) بنجاح`, verse.verseKey);
  }, [surahName, copyTextToClipboard]);

  // Copy all verses on the current page
  const handleCopyAllPage = useCallback(() => {
    if (verses.length === 0) return;
    const allVersesText = verses
      .map((v) => `﴿ ${v.textUthmani} ﴾ [${v.verseKey}]`)
      .join('\n\n');
    const fullText = `【${surahName} — صـ ${currentPage}】\n\n${allVersesText}\n\n— تطبيق نور القرآن`;
    copyTextToClipboard(fullText, `✓ تم نسخ جميع آيات صفحة ${currentPage} كاملة بنجاح`, 'all_page');
  }, [verses, surahName, currentPage, copyTextToClipboard]);

  // Filter verses if search input is used
  const filteredVerses = verses.filter((v) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.trim();
    return (
      v.textUthmani.includes(q) ||
      v.verseKey.includes(q) ||
      v.verseNumber.toString() === q
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="تحديد ونسخ الآيات"
      dir="rtl"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] my-auto rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-[#C8A85B]/60 flex flex-col overflow-hidden flash-modal-window"
        style={{
          backgroundColor: nightMode ? '#0D1F17' : '#FBF8EF',
          color: nightMode ? '#E8E4D9' : '#17231D',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C8A85B]/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📋</span>
            <div>
              <h2
                className="text-base sm:text-lg font-bold text-[#123B2A] dark:text-[#C8A85B] leading-tight"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                تحديد ونسخ الآيات
              </h2>
              <p
                className="text-xs text-[#0B5B43] dark:text-gray-300 font-medium"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                {surahName} • صفحة {currentPage} (ظلل أي كلمة أو آية لنسخها)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer text-[#123B2A] dark:text-[#C8A85B]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Action Bar (Copy selected snippet / Copy all page) */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#C8A85B]/20 shrink-0">
          {/* Copy highlighted selection button (prominent when user selects text) */}
          {selectedText ? (
            <button
              type="button"
              onClick={handleCopySelectedSnippet}
              className="flex-1 py-2 px-3 rounded-xl bg-[#C8A85B] hover:bg-[#b5954a] text-[#123B2A] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all animate-bounce cursor-pointer"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <span>✂️</span>
              <span>نسخ الجزء المظلل: &quot;{selectedText.length > 25 ? selectedText.slice(0, 25) + '...' : selectedText}&quot;</span>
            </button>
          ) : (
            <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
              <span>💡</span>
              <span>اضغط مع الاستمرار على أي كلمة أو آية بالأسفل لتظليلها ونسخها</span>
            </div>
          )}

          {/* Copy Entire Page button */}
          <button
            type="button"
            onClick={handleCopyAllPage}
            className="py-1.5 px-3 rounded-xl bg-[#123B2A] hover:bg-[#0B5B43] text-[#C8A85B] text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-xs cursor-pointer shrink-0"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
            title="نسخ جميع آيات هذه الصفحة كاملة دفعة واحدة"
          >
            <span>📄</span>
            <span>{copiedKey === 'all_page' ? '✓ تم النسخ' : `نسخ كامل صـ ${currentPage}`}</span>
          </button>
        </div>

        {/* Search filter input */}
        {verses.length > 3 && (
          <div className="pt-2 shrink-0">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="ابحث عن كلمة أو رقم آية في هذه الصفحة..."
              className="w-full px-3 py-1.5 rounded-xl border border-[#C8A85B]/60 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8A85B] bg-white dark:bg-[#142A1F] text-gray-800 dark:text-gray-100 placeholder-gray-400"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            />
          </div>
        )}

        {/* Verses Scrollable List - 100% Selectable */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 mt-1 pr-0.5">
          {filteredVerses.map((verse) => {
            const isCopied = copiedKey === verse.verseKey;
            return (
              <div
                key={verse.id || verse.verseKey}
                id={`copy-verse-${verse.verseKey}`}
                className="p-3 sm:p-4 rounded-2xl border border-[#C8A85B]/40 bg-white/80 dark:bg-[#142A1F]/80 shadow-2xs hover:border-[#C8A85B] transition-all"
              >
                {/* Verse Card Header */}
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#C8A85B]/20">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#123B2A] text-[#C8A85B]"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    الآية {verse.verseKey}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopySingleVerse(verse)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs ${
                      isCopied
                        ? 'bg-[#C8A85B] text-[#123B2A] ring-2 ring-[#C8A85B]/60'
                        : 'bg-[#123B2A] hover:bg-[#0B5B43] text-white'
                    }`}
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                    title="نسخ هذه الآية كاملة"
                  >
                    <span>{isCopied ? '✓' : '📋'}</span>
                    <span>{isCopied ? 'تم نسخ الآية' : 'نسخ الآية كاملة'}</span>
                  </button>
                </div>

                {/* Verse Arabic Text - Fully Selectable by user cursor or touch */}
                <p
                  className="quran-text text-lg sm:text-xl font-bold leading-loose select-text cursor-text text-right px-1"
                  style={{
                    fontFamily: "'Amiri', serif",
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    color: nightMode ? '#E8E4D9' : '#17231D',
                  }}
                  dir="rtl"
                >
                  {verse.textUthmani}
                  <span
                    className="verse-number inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#C8A85B] text-[#123B2A] text-xs font-bold mx-1 align-middle"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    {verse.verseNumber}
                  </span>
                </p>
              </div>
            );
          })}

          {filteredVerses.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-xs">
              لا توجد آيات مطابقة للبحث في هذه الصفحة
            </div>
          )}
        </div>

        {/* Toast notification */}
        {toastMessage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#123B2A] text-[#C8A85B] text-xs font-bold shadow-xl border border-[#C8A85B] animate-fadeIn flex items-center gap-2">
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
