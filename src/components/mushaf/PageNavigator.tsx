'use client';

import { useState } from 'react';

interface PageNavigatorProps {
  currentPage: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  onBookmarkPage: () => void;
  isBookmarked: boolean;
}

export default function PageNavigator({
  currentPage,
  onPrevious,
  onNext,
  onGoToPage,
  onBookmarkPage,
  isBookmarked,
}: PageNavigatorProps) {
  const [showGoTo, setShowGoTo] = useState(false);
  const [inputPage, setInputPage] = useState('');

  const handleGoTo = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 1 && page <= 604) {
      onGoToPage(page);
      setShowGoTo(false);
      setInputPage('');
    }
  };

  return (
    <>
      <nav
        className="sticky bottom-0 z-20 flex items-center justify-between px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
        style={{ backgroundColor: '#123B2A', color: 'white' }}
        aria-label="تنقل الصفحات"
      >
        {/* Next page (RTL: right arrow on left side) */}
        <button
          onClick={onNext}
          disabled={currentPage >= 604}
          aria-label="الصفحة التالية"
          className="p-3 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Center controls */}
        <div className="flex items-center gap-4">
          {/* Bookmark */}
          <button
            onClick={onBookmarkPage}
            aria-label={isBookmarked ? 'إزالة العلامة' : 'حفظ علامة'}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? '#C8A85B' : 'none'} stroke={isBookmarked ? '#C8A85B' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Page number / Go to */}
          <button
            onClick={() => setShowGoTo(!showGoTo)}
            className="px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: 'rgba(200,168,91,0.2)', color: '#C8A85B' }}
            aria-label="انتقل إلى صفحة"
          >
            {currentPage} / 604
          </button>
        </div>

        {/* Previous page (RTL: left arrow on right side) */}
        <button
          onClick={onPrevious}
          disabled={currentPage <= 1}
          aria-label="الصفحة السابقة"
          className="p-3 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </nav>

      {/* Go to page modal */}
      {showGoTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-2xl p-6 mx-4 w-full max-w-sm shadow-xl"
            style={{ backgroundColor: '#FBF8EF' }}
          >
            <h3
              className="text-lg font-bold text-center mb-4"
              style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
            >
              انتقل إلى صفحة
            </h3>
            <div className="flex gap-3">
              <input
                type="number"
                min={1}
                max={604}
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoTo()}
                placeholder="1 - 604"
                className="flex-1 px-4 py-3 rounded-xl border-2 text-center text-lg focus:outline-none"
                style={{ borderColor: '#C8A85B', color: '#17231D', direction: 'ltr' }}
                autoFocus
              />
              <button
                onClick={handleGoTo}
                className="px-6 py-3 rounded-xl font-bold text-white"
                style={{ backgroundColor: '#123B2A' }}
              >
                انتقل
              </button>
            </div>
            <button
              onClick={() => { setShowGoTo(false); setInputPage(''); }}
              className="w-full mt-3 py-2 text-sm rounded-xl"
              style={{ color: '#123B2A' }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </>
  );
}
