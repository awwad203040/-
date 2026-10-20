'use client';

import { useState } from 'react';
import type { Verse } from '@/types/quran';

interface AyahActionsProps {
  verse: Verse;
  isBookmarked: boolean;
  onClose: () => void;
  onPlay: () => void;
  onPlayRepeat?: (count: number) => void;
  onPlayRangeRepeat?: (startAyah: number, endAyah: number, repeats: number) => void;
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
  onPlayRangeRepeat,
  onCorrection,
  onTafsir,
  onBookmark,
  onCopy,
  onShare,
  onAddNote,
}: AyahActionsProps) {
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [rangeStart, setRangeStart] = useState<number>(verse.verseNumber);
  const [rangeEnd, setRangeEnd] = useState<number>(verse.verseNumber + 2);
  const [repeatsCount, setRepeatsCount] = useState<number>(3);

  const actions = [
    { label: 'تشغيل', icon: '▶', onClick: onPlay },
    {
      label: 'تكرار الآية (3x)',
      icon: '🔂',
      onClick: () => (onPlayRepeat ? onPlayRepeat(3) : onPlay()),
    },
    {
      label: 'تكرار مقطع بالآيات',
      icon: '🔁',
      onClick: () => setShowRangePicker(!showRangePicker),
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
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-6 pt-4 pb-8 max-h-[85vh] overflow-y-auto"
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
          className="text-center mb-5 px-4 line-clamp-2"
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

        {/* Range Looping Picker Box if user clicked 'تكرار مقطع بالآيات' */}
        {showRangePicker && (
          <div className="mb-5 p-4 rounded-2xl bg-[#123B2A] text-white border border-[#C8A85B]/50 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-xs text-[#C8A85B] flex items-center gap-1.5">
                <span>🔁</span>
                <span>تحديد بداية ونهاية المقطع للتكرار:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRangePicker(false)}
                className="text-white/60 hover:text-white text-xs"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-white/80 block mb-1">من الآية (البداية):</label>
                <input
                  type="number"
                  min={1}
                  value={rangeStart}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) || 1;
                    setRangeStart(v);
                    if (rangeEnd < v) setRangeEnd(v);
                  }}
                  className="w-full bg-[#0D281C] text-[#C8A85B] font-bold text-center text-sm py-2 rounded-xl border border-[#C8A85B]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/80 block mb-1">إلى الآية (النهاية):</label>
                <input
                  type="number"
                  min={rangeStart}
                  value={rangeEnd}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) || rangeStart;
                    setRangeEnd(Math.max(rangeStart, v));
                  }}
                  className="w-full bg-[#0D281C] text-[#C8A85B] font-bold text-center text-sm py-2 rounded-xl border border-[#C8A85B]/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="text-[10px] text-white/80 mb-1">عدد مرات التكرار:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { count: 3, label: '3 مرات' },
                  { count: 5, label: '5 مرات' },
                  { count: 7, label: '7 مرات' },
                  { count: 10, label: '10 مرات' },
                  { count: 999, label: 'مستمر ∞' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setRepeatsCount(item.count)}
                    className={`text-[10px] px-2 py-1 rounded-lg font-bold border transition ${
                      repeatsCount === item.count
                        ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                        : 'bg-white/10 text-white border-white/20'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onPlayRangeRepeat) {
                  onPlayRangeRepeat(rangeStart, rangeEnd, repeatsCount);
                } else if (onPlayRepeat) {
                  onPlayRepeat(repeatsCount);
                }
                onClose();
              }}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] transition shadow-sm cursor-pointer"
            >
              بدء تكرار الآيات ({rangeStart} إلى {rangeEnd}) • {repeatsCount === 999 ? 'مستمر ∞' : `${repeatsCount} مرات`}
            </button>
          </div>
        )}

        {/* Actions grid */}
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors hover:bg-[#123B2A]/5 cursor-pointer"
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
