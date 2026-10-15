'use client';

interface ReadingProgressProps {
  currentPage: number;
  totalPages: number;
  pagesRead: number;
}

export default function ReadingProgress({ currentPage, totalPages, pagesRead }: ReadingProgressProps) {
  const percentage = Math.round((pagesRead / totalPages) * 1000) / 10;
  const progressWidth = Math.min((currentPage / totalPages) * 100, 100);

  return (
    <div className="px-4 py-3" style={{ backgroundColor: 'rgba(18,59,42,0.03)' }}>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-1">
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(18,59,42,0.1)' }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progressWidth}%`, backgroundColor: '#C8A85B' }}
          />
        </div>
        <span
          className="text-xs font-medium min-w-[3rem] text-left"
          style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
          dir="ltr"
        >
          {percentage}%
        </span>
      </div>

      <div className="flex justify-between text-xs" style={{ color: '#17231D', opacity: 0.6, fontFamily: "'Tajawal', sans-serif" }}>
        <span>صفحة {currentPage} من {totalPages}</span>
        <span>{pagesRead} صفحة مقروءة</span>
      </div>
    </div>
  );
}
