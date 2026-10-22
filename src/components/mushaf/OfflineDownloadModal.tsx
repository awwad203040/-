'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  checkOfflineProgress,
  downloadAllPages,
  clearOfflinePages,
  TOTAL_QURAN_PAGES,
  DownloadProgress,
} from '@/lib/offline-manager';

interface OfflineDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  nightMode?: boolean;
}

export default function OfflineDownloadModal({
  isOpen,
  onClose,
  nightMode = false,
}: OfflineDownloadModalProps) {
  const [cachedCount, setCachedCount] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [currentPageDownloading, setCurrentPageDownloading] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCleared, setIsCleared] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Refresh cache status whenever modal opens
  const refreshStatus = useCallback(async () => {
    try {
      const stats = await checkOfflineProgress();
      setCachedCount(stats.cachedCount);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setErrorMessage(null);
      setIsCleared(false);
    }
  }, [isOpen, refreshStatus]);

  // Clean up controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStartDownload = async () => {
    setErrorMessage(null);
    setIsCleared(false);
    setIsDownloading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const completed = await downloadAllPages((progress: DownloadProgress) => {
        setCachedCount(progress.current);
        setCurrentPageDownloading(progress.currentPage);
      }, controller.signal);

      if (completed) {
        setCachedCount(TOTAL_QURAN_PAGES);
      }
    } catch (err: unknown) {
      if (!abortControllerRef.current?.signal.aborted) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل الصفحات.';
        setErrorMessage(msg);
      }
    } finally {
      setIsDownloading(false);
      abortControllerRef.current = null;
      refreshStatus();
    }
  };

  const handlePauseDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsDownloading(false);
    refreshStatus();
  };

  const handleClearCache = async () => {
    if (isDownloading) {
      handlePauseDownload();
    }
    await clearOfflinePages();
    setCachedCount(0);
    setIsCleared(true);
    setTimeout(() => setIsCleared(false), 3000);
  };

  if (!isOpen) return null;

  const percentage = Math.round((cachedCount / TOTAL_QURAN_PAGES) * 100);
  const isComplete = cachedCount >= TOTAL_QURAN_PAGES;

  const bgColor = nightMode ? '#0D1F17' : '#FBF8EF';
  const cardBg = nightMode ? '#142A1F' : '#FFFFFF';
  const textColor = nightMode ? '#E8E4D9' : '#17231D';
  const subTextColor = nightMode ? '#9EAA9F' : '#5C6B64';
  const borderColor = nightMode ? 'rgba(200, 168, 91, 0.25)' : 'rgba(18, 59, 42, 0.12)';

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={() => {
          if (!isDownloading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 rounded-3xl p-6 shadow-2xl border transition-all"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          direction: 'rtl',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs"
              style={{ backgroundColor: 'rgba(200, 168, 91, 0.18)', color: '#C8A85B' }}
            >
              📥
            </div>
            <div>
              <h2
                id="offline-modal-title"
                className="text-lg font-bold"
                style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
              >
                تحميل المصحف كاملاً
              </h2>
              <p className="text-xs" style={{ color: subTextColor }}>
                للقراءة والتصفح بدون إنترنت نهائياً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-black/5 active:scale-95 transition"
            aria-label="إغلاق"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Status Card */}
        <div
          className="rounded-2xl p-4 mb-4 border shadow-xs"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: textColor }}>
              حالة صفحات المصحف:
            </span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: isComplete
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isDownloading
                  ? 'rgba(200, 168, 91, 0.2)'
                  : 'rgba(18, 59, 42, 0.08)',
                color: isComplete ? '#059669' : '#C8A85B',
              }}
            >
              {isComplete
                ? 'مكتمل 100% جاهز بدون نت'
                : isDownloading
                ? `جاري تحميل صفحة ${currentPageDownloading || cachedCount}... (${percentage}%)`
                : cachedCount > 0
                ? 'تحميل جزئي'
                : 'غير محمل'}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full h-3 rounded-full overflow-hidden mb-2 relative"
            style={{ backgroundColor: nightMode ? '#08140E' : '#E8EFEA' }}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${isDownloading ? 'animate-pulse' : ''}`}
              style={{
                width: `${percentage}%`,
                background: isComplete
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : 'linear-gradient(90deg, #C8A85B, #0B5B43)',
              }}
            />
          </div>

          {/* Progress Stats */}
          <div className="flex items-center justify-between text-xs" style={{ color: subTextColor }}>
            <span>
              {cachedCount} من {TOTAL_QURAN_PAGES} صفحة
            </span>
            <span className="font-bold text-sm" style={{ color: '#123B2A' }}>
              {percentage}%
            </span>
            <span>حجم التقريبي: ~48 ميجابايت</span>
          </div>
        </div>

        {/* Notice & Instructions */}
        <div className="mb-5 space-y-2 text-xs leading-relaxed" style={{ color: subTextColor }}>
          {isComplete ? (
            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#065F46' }}
            >
              <span className="text-base">✅</span>
              <div>
                <p className="font-bold mb-0.5">المصحف كامل ومحفوظ على جهازك!</p>
                <p className="opacity-90">
                  يمكنك الآن قراءة وتصفح جميع سور وصفحات القرآن الـ 604 في أي وقت حتى لو كان جهازك في وضع الطيران وبدون إنترنت تماماً.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ backgroundColor: 'rgba(200, 168, 91, 0.12)', color: '#785610' }}
            >
              <span className="text-base">💡</span>
              <div>
                <p className="font-bold mb-0.5">لماذا ننصح بالتحميل؟</p>
                <p className="opacity-90">
                  عند الضغط على &quot;بدء التحميل&quot;، سيتم حفظ جميع صفحات مجمع الملك فهد بجودة عالية داخل ذاكرة جهازك، ولن تستهلك باقة الإنترنت مجدداً عند القراءة.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-100 text-red-700 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {isCleared && (
            <div className="p-3 rounded-xl bg-green-100 text-green-700 text-xs flex items-center gap-2">
              <span>🗑️</span>
              <span>تم مسح الصفحات المخزنة بنجاح لتوفير المساحة.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {!isComplete && (
            <>
              {!isDownloading ? (
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
                  style={{
                    backgroundColor: '#123B2A',
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{cachedCount > 0 ? 'متابعة تحميل باقي الصفحات' : 'بدء تحميل صفحات المصحف كاملة (604)'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseDownload}
                  className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 active:scale-98 transition bg-amber-600 hover:bg-amber-700 cursor-pointer"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>إيقاف مؤقت للتحميل (صفحة {currentPageDownloading || cachedCount})</span>
                </button>
              )}
            </>
          )}

          {isComplete && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md active:scale-98 transition cursor-pointer"
              style={{
                backgroundColor: '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              تم، العودة للقراءة
            </button>
          )}

          {/* Secondary Action: Clear or Close */}
          <div className="flex items-center gap-2 pt-1">
            {cachedCount > 0 && !isDownloading && (
              <button
                type="button"
                onClick={handleClearCache}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 active:scale-98 transition border border-red-200 cursor-pointer"
              >
                مسح الصفحات المخزنة
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold active:scale-98 transition cursor-pointer"
              style={{
                backgroundColor: 'rgba(18, 59, 42, 0.08)',
                color: '#123B2A',
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
