'use client';

import type { Verse } from '@/types/quran';

interface AyahActionsProps {
  verse: Verse;
  isBookmarked: boolean;
  onClose: () => void;
  onPlay: () => void;
  onPlayRepeat?: (count: number) => void;
  onCorrection: () => void;
  onTafsir: () => void;
  onBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  onAddNote: () => void;
}

export default function AyahActions({
  verse,
  isBookmarked,
  onClose,
  onPlay,
  onPlayRepeat,
  onCorrection,
  onTafsir,
  onBookmark,
  onCopy,
  onShare,
  onAddNote,
}: AyahActionsProps) {
  const actions = [
    { label: 'تشغيل', icon: '▶', onClick: onPlay },
    {
      label: 'تكرار (3 مرات للحفظ)',
      icon: '🔁',
      onClick: () => (onPlayRepeat ? onPlayRepeat(3) : onPlay()),
    },
    { label: 'تصحيح التلاوة', icon: '🎙️', onClick: onCorrection },
    { label: 'تفسير', icon: '📖', onClick: onTafsir },
    { label: isBookmarked ? 'إزالة العلامة' : 'حفظ علامة', icon: '🔖', onClick: onBookmark },
    { label: 'ملاحظة', icon: '✏️', onClick: onAddNote },
    { label: 'نسخ', icon: '📋', onClick: onCopy },
    { label: 'مشاركة', icon: '🔗', onClick: onShare },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-6 pt-4 pb-8"
        style={{ backgroundColor: '#FBF8EF', animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: '#C8A85B' }} />

        {/* Verse reference */}
        <div className="text-center mb-4">
          <span
            className="text-sm font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(18,59,42,0.1)', color: '#123B2A' }}
          >
            الآية {verse.verseKey}
          </span>
        </div>

        {/* Verse preview */}
        <p
          className="text-center mb-6 px-4 line-clamp-2"
          dir="rtl"
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: '1.2rem',
            lineHeight: 2,
            color: '#17231D',
          }}
        >
          {verse.textUthmani}
        </p>

        {/* Actions grid */}
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors hover:bg-[#123B2A]/5"
            >
              <span className="text-2xl">{action.icon}</span>
              <span
                className="text-xs font-medium"
                style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
