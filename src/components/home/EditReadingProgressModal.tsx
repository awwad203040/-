'use client';

import { useState, useId } from 'react';
import { getSurahForPage, parseArabicOrWesternNumber } from '@/lib/quran-meta';
import { setRealReadingPosition, setManualPagesReadCount } from '@/lib/storage';

interface EditReadingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  pagesRead: number;
  onProgressUpdated: () => void;
}

export default function EditReadingProgressModal({
  isOpen,
  onClose,
  currentPage,
  pagesRead,
  onProgressUpdated,
}: EditReadingProgressModalProps) {
  const [targetPageInput, setTargetPageInput] = useState<string>(currentPage.toString());
  const [syncPagesRead, setSyncPagesRead] = useState<boolean>(true);
  const [customPagesCount, setCustomPagesCount] = useState<string>(pagesRead.toString());
  const [manualCountMode, setManualCountMode] = useState<boolean>(false);
  const titleId = useId();

  if (!isOpen) return null;

  const parsedPage = parseArabicOrWesternNumber(targetPageInput);
  const isValidPage = !isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= 604;
  const currentSurah = isValidPage ? getSurahForPage(parsedPage) : getSurahForPage(currentPage);

  const handleSave = () => {
    if (!isValidPage) return;

    if (manualCountMode) {
      const parsedCount = parseArabicOrWesternNumber(customPagesCount);
      const validCount = Math.max(0, Math.min(604, isNaN(parsedCount) ? parsedPage : parsedCount));
      setRealReadingPosition(parsedPage, false);
      setManualPagesReadCount(validCount);
    } else {
      setRealReadingPosition(parsedPage, syncPagesRead);
    }

    onProgressUpdated();
    onClose();
  };

  const handleResetKhatmah = () => {
    if (confirm('هل أنت متأكد من بدء ختمة جديدة من الصفحة الأولى؟')) {
      setRealReadingPosition(1, true);
      onProgressUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#123B2A] text-white rounded-3xl p-6 shadow-2xl border border-[#C8A85B]/40 flex flex-col gap-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📱</span>
            <div>
              <h3 id={titleId} className="font-bold text-base text-[#F7EED8]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                ضبط تقدمك الحقيقي في القراءة
              </h3>
              <p className="text-[11px] text-white/70">
                مرتبط بجهازك لمتابعة موضعك الفعلي في المصحف بدقة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Current State Info */}
        <div className="bg-black/25 rounded-2xl p-3.5 border border-[#C8A85B]/20 flex items-center justify-between text-xs">
          <div>
            <span className="text-white/60 block text-[11px]">موضع التوقف الحالي:</span>
            <span className="text-[#C8A85B] font-bold text-sm">
              صفحة {currentPage} {currentSurah ? `(${currentSurah.name})` : ''}
            </span>
          </div>
          <div className="text-left">
            <span className="text-white/60 block text-[11px]">الصفحات المقروءة:</span>
            <span className="text-white font-bold text-sm">
              {pagesRead} من 604
            </span>
          </div>
        </div>

        {/* New Page Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[#F7EED8] flex items-center justify-between">
            <span>اختر الصفحة التي وقفت عندها فعلياً:</span>
            {isValidPage && currentSurah && (
              <span className="text-[#C8A85B] font-medium text-[11px]">
                سورة {currentSurah.name} (الجزء {currentSurah.startPage})
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={604}
              value={targetPageInput}
              onChange={(e) => setTargetPageInput(e.target.value)}
              className="flex-1 bg-black/40 border border-[#C8A85B]/50 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-[#C8A85B] focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
              placeholder="رقم الصفحة (1 - 604)"
            />
            <span className="text-xs text-white/60 font-mono">/ 604</span>
          </div>
        </div>

        {/* Sync Options */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-white/90">
            <input
              type="checkbox"
              checked={syncPagesRead && !manualCountMode}
              onChange={(e) => {
                setSyncPagesRead(e.target.checked);
                if (e.target.checked) setManualCountMode(false);
              }}
              className="w-4 h-4 rounded text-[#C8A85B] accent-[#C8A85B] cursor-pointer"
            />
            <span>
              مزامنة عدد الصفحات المقروءة تلقائياً لتساوي صفحة التوقف{' '}
              {isValidPage ? `(${parsedPage} صفحة)` : ''}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-white/90">
            <input
              type="checkbox"
              checked={manualCountMode}
              onChange={(e) => {
                setManualCountMode(e.target.checked);
                if (e.target.checked) setSyncPagesRead(false);
              }}
              className="w-4 h-4 rounded text-[#C8A85B] accent-[#C8A85B] cursor-pointer"
            />
            <span>تحديد عدد الصفحات المقروءة يدوياً</span>
          </label>

          {manualCountMode && (
            <div className="flex items-center gap-2 mt-1 pr-6">
              <span className="text-[11px] text-white/70">عدد الصفحات المقروءة:</span>
              <input
                type="number"
                min={0}
                max={604}
                value={customPagesCount}
                onChange={(e) => setCustomPagesCount(e.target.value)}
                className="w-24 bg-black/30 border border-white/20 rounded-lg px-2 py-1 text-center font-bold text-white text-xs"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValidPage}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 active:scale-95 transition shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>✓</span>
            <span>حفظ صفحة التوقف والتقدم</span>
          </button>
          <button
            type="button"
            onClick={handleResetKhatmah}
            className="py-3 px-3 rounded-xl font-bold text-xs bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition cursor-pointer"
            title="بدء ختمة جديدة من البداية"
          >
            🔄 بداية جديدة
          </button>
        </div>
      </div>
    </div>
  );
}
