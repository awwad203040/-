'use client';

import { useState } from 'react';

interface AudioPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  surahName: string;
  reciterName: string;
  playbackRate: number;
  isRepeat: boolean;
  repeatCount?: number;
  remainingRepeats?: number;
  segmentA?: number | null;
  segmentB?: number | null;
  isSegmentLooping?: boolean;
  isAyahRangeLooping?: boolean;
  ayahRangeStart?: number | null;
  ayahRangeEnd?: number | null;
  currentAyahNumber?: number | null;
  autoPlayNext?: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSetSpeed: (speed: number) => void;
  onToggleRepeat: () => void;
  onSetRepeatCount?: (count: number) => void;
  onSetSegmentA?: () => void;
  onSetSegmentB?: () => void;
  onClearSegment?: () => void;
  onToggleSegmentLoop?: () => void;
  onStopAyahRangeLoop?: () => void;
  onSkip?: (seconds: number) => void;
  onNextSurah?: () => void;
  onPreviousSurah?: () => void;
  onToggleAutoPlayNext?: () => void;
  onClose: () => void;
  onOpenReciterSelect?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  isPlaying,
  currentTime,
  duration,
  isLoading,
  surahName,
  reciterName,
  playbackRate,
  isRepeat,
  repeatCount = 1,
  remainingRepeats = 1,
  segmentA = null,
  segmentB = null,
  isSegmentLooping = false,
  isAyahRangeLooping = false,
  ayahRangeStart = null,
  ayahRangeEnd = null,
  currentAyahNumber = null,
  autoPlayNext = true,
  onTogglePlay,
  onSeek,
  onSetSpeed,
  onToggleRepeat,
  onSetRepeatCount,
  onSetSegmentA,
  onSetSegmentB,
  onClearSegment,
  onToggleSegmentLoop,
  onStopAyahRangeLoop,
  onSkip,
  onNextSurah,
  onPreviousSurah,
  onToggleAutoPlayNext,
  onClose,
  onOpenReciterSelect,
}: AudioPlayerProps) {
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [showSegmentTools, setShowSegmentTools] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length] || 1;

  const repeatOptions = [
    { count: 1, label: 'بدون تكرار (مرة واحدة)' },
    { count: 3, label: 'تكرار 3 مرات (للحفظ)' },
    { count: 5, label: 'تكرار 5 مرات' },
    { count: 7, label: 'تكرار 7 مرات' },
    { count: 10, label: 'تكرار 10 مرات' },
    { count: 999, label: 'تكرار مستمر (∞)' },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-3 py-2.5 md:px-4 md:py-3 shadow-[0_-4px_25px_rgba(0,0,0,0.25)] border-t border-[#C8A85B]/40"
      style={{ backgroundColor: '#123B2A', color: 'white' }}
      dir="rtl"
    >
      {/* Interactive Progress bar with Loop region highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 cursor-pointer bg-white/20 hover:h-2.5 transition-all"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          // In RTL or LTR calculation: clientX is from left
          const ratio = (e.clientX - rect.left) / rect.width;
          onSeek(Math.max(0, Math.min(duration, ratio * duration)));
        }}
      >
        {/* Highlighted A-B Loop Segment */}
        {segmentA !== null && segmentB !== null && duration > 0 && segmentB > segmentA && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-400 opacity-70 pointer-events-none"
            style={{
              left: `${(segmentA / duration) * 100}%`,
              width: `${Math.max(0.5, ((segmentB - segmentA) / duration) * 100)}%`,
            }}
          />
        )}

        {/* Current playback progress */}
        <div
          className="h-full transition-[width] duration-150"
          style={{ width: `${progress}%`, backgroundColor: '#C8A85B' }}
        />
      </div>

      {/* Main Player Row */}
      <div className="flex items-center justify-between gap-2 md:gap-4 mt-0.5">
        {/* Info & Reciter */}
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-bold truncate text-[#FBF8EF]" style={{ fontFamily: "'Amiri', serif" }}>
            {surahName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              type="button"
              onClick={onOpenReciterSelect}
              className="text-[11px] opacity-80 hover:opacity-100 truncate hover:underline flex items-center gap-1 cursor-pointer text-[#C8A85B]"
              title="تغيير القارئ"
            >
              <span>{reciterName}</span>
              <span className="text-[9px]">▾</span>
            </button>

            {/* Loop indicator pill */}
            {isSegmentLooping && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/40 animate-pulse">
                🔁 مقطع مكرر {remainingRepeats > 1 ? `(${remainingRepeats})` : ''}
              </span>
            )}

            {/* Ayah Range Loop indicator pill */}
            {isAyahRangeLooping && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A85B]/30 text-[#FBF8EF] font-bold border border-[#C8A85B]/60 animate-pulse flex items-center gap-1">
                <span>🔁 آيات {ayahRangeStart}-{ayahRangeEnd}</span>
                {currentAyahNumber && <span className="text-[#C8A85B]">(آية {currentAyahNumber})</span>}
                {remainingRepeats > 1 && <span>• متبقي {remainingRepeats}</span>}
                {onStopAyahRangeLoop && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopAyahRangeLoop();
                    }}
                    className="ml-1 text-[9px] bg-red-500/30 hover:bg-red-500/50 text-red-200 px-1 rounded cursor-pointer"
                    title="إيقاف التكرار"
                  >
                    ⏹
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 relative">
          {/* Skip Back 5s (إرجاع 5 ثوانٍ للإعادة السريعة) */}
          {onSkip && (
            <button
              type="button"
              onClick={() => onSkip(-5)}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="إرجاع 5 ثوانٍ"
              aria-label="إرجاع 5 ثوانٍ"
            >
              ↺ 5ث
            </button>
          )}

          {/* Repeat Ayah / Segment Icon Button with Counter Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (onSetRepeatCount) {
                  setShowRepeatMenu(!showRepeatMenu);
                } else {
                  onToggleRepeat();
                }
              }}
              className={`p-1.5 md:p-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                repeatCount > 1 || isRepeat
                  ? 'bg-[#C8A85B]/20 text-[#C8A85B] border-[#C8A85B] font-bold shadow-xs'
                  : 'bg-white/5 text-white/60 border-transparent hover:text-white hover:bg-white/10'
              }`}
              title="تكرار الآية أو المقطع للقارئ المختار"
              aria-label="خيارات تكرار الاستماع"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {repeatCount > 1 && (
                <span className="text-[10px] font-bold px-1 rounded bg-[#C8A85B] text-[#123B2A]">
                  {repeatCount === 999 ? '∞' : `${repeatCount}x`}
                </span>
              )}
            </button>

            {/* Repeat Count Selection Dropdown Menu */}
            {showRepeatMenu && onSetRepeatCount && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRepeatMenu(false)} />
                <div
                  className="absolute bottom-full mb-2 right-0 w-52 rounded-2xl shadow-2xl p-2 z-50 border border-[#C8A85B]/50"
                  style={{ backgroundColor: '#123B2A', color: 'white' }}
                >
                  <div className="px-2 py-1 text-[11px] font-bold text-[#C8A85B] border-b border-white/10 mb-1">
                    🔁 اختر عدد مرات التكرار:
                  </div>
                  {repeatOptions.map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => {
                        onSetRepeatCount(opt.count);
                        setShowRepeatMenu(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        repeatCount === opt.count
                          ? 'bg-[#C8A85B] text-[#123B2A]'
                          : 'hover:bg-white/10 text-white/90'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {repeatCount === opt.count && <span>✓</span>}
                    </button>
                  ))}
                  <div className="pt-1 mt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSegmentTools(true);
                        setShowRepeatMenu(false);
                      }}
                      className="w-full text-center px-2 py-1.5 rounded-lg text-[11px] font-bold text-[#C8A85B] hover:bg-white/10 cursor-pointer"
                    >
                      ✂️ تحديد مقطع مخصص (A - B)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Toggle A-B Segment Loop Tools */}
          {onToggleSegmentLoop && (
            <button
              type="button"
              onClick={() => setShowSegmentTools(!showSegmentTools)}
              className={`p-1.5 md:p-2 rounded-xl transition-all text-xs font-bold border cursor-pointer ${
                isSegmentLooping || showSegmentTools || segmentA !== null
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-400'
                  : 'bg-white/5 text-white/60 border-transparent hover:text-white hover:bg-white/10'
              }`}
              title="تكرار مقطع محدد A-B"
              aria-label="تكرار مقطع محدد"
            >
              [A-B]
            </button>
          )}

          {/* Previous Surah Button */}
          {onPreviousSurah && (
            <button
              type="button"
              onClick={onPreviousSurah}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="السورة السابقة"
              aria-label="السورة السابقة"
            >
              ⏮
            </button>
          )}

          {/* Skip Backward 5s */}
          {onSkip && (
            <button
              type="button"
              onClick={() => onSkip(-5)}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="ترجيع 5 ثوانٍ"
              aria-label="ترجيع 5 ثوانٍ"
            >
              ⟲ 5ث
            </button>
          )}

          {/* Play / Pause Primary Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLoading}
            className="p-2.5 md:p-3 rounded-full transition-transform active:scale-95 shadow-md cursor-pointer"
            style={{ backgroundColor: '#C8A85B' }}
            aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#123B2A">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#123B2A">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Skip Forward 5s */}
          {onSkip && (
            <button
              type="button"
              onClick={() => onSkip(5)}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="تقديم 5 ثوانٍ"
              aria-label="تقديم 5 ثوانٍ"
            >
              ⟳ 5ث
            </button>
          )}

          {/* Next Surah Button */}
          {onNextSurah && (
            <button
              type="button"
              onClick={onNextSurah}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="السورة التالية"
              aria-label="السورة التالية"
            >
              ⏭
            </button>
          )}

          {/* Auto-Play Next Surah Toggle */}
          {onToggleAutoPlayNext && (
            <button
              type="button"
              onClick={onToggleAutoPlayNext}
              className={`p-1.5 md:p-2 rounded-xl transition-all text-[11px] font-bold border cursor-pointer ${
                autoPlayNext
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400'
                  : 'bg-white/5 text-white/40 border-transparent hover:text-white hover:bg-white/10'
              }`}
              title={autoPlayNext ? 'الانتقال التلقائي للسورة التالية: مفعّل' : 'الانتقال التلقائي للسورة التالية: متوقف'}
              aria-label="الانتقال التلقائي للسورة التالية"
            >
              {autoPlayNext ? '⏭ تتابع' : '⏭ توقف'}
            </button>
          )}

          {/* Speed Button */}
          <button
            type="button"
            onClick={() => onSetSpeed(nextSpeed)}
            className="text-[11px] px-2 py-1 rounded-full font-bold cursor-pointer"
            style={{ backgroundColor: 'rgba(200,168,91,0.2)', color: '#C8A85B' }}
            aria-label={`سرعة ${playbackRate}x`}
            title="سرعة التلاوة"
          >
            {playbackRate}x
          </button>

          {/* Close Player */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
            aria-label="إغلاق المشغل"
            title="إغلاق المشغل"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Time display */}
        <div className="text-[11px] opacity-75 min-w-[65px] text-left hidden sm:block" dir="ltr">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* A-B Segment Repetition Tray (شريط تكرار المقطع المحدد) */}
      {showSegmentTools && (
        <div className="mt-2.5 pt-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#C8A85B] font-bold text-[11px]">✂️ تكرار مقطع مخصص:</span>

            {/* Set A (بداية المقطع) */}
            <button
              type="button"
              onClick={onSetSegmentA}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                segmentA !== null
                  ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title="تحديد بداية المقطع عند الثانية الحالية"
            >
              بداية [A]: {segmentA !== null ? formatTime(segmentA) : 'اضغط للتحديد'}
            </button>

            {/* Set B (نهاية المقطع) */}
            <button
              type="button"
              onClick={onSetSegmentB}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                segmentB !== null
                  ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title="تحديد نهاية المقطع عند الثانية الحالية"
            >
              نهاية [B]: {segmentB !== null ? formatTime(segmentB) : 'اضغط للتحديد'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Start / Stop Segment Loop */}
            {onToggleSegmentLoop && (
              <button
                type="button"
                onClick={onToggleSegmentLoop}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                  isSegmentLooping
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span>{isSegmentLooping ? '⏹️ إيقاف التكرار' : '🔁 تكرار هذا المقطع'}</span>
              </button>
            )}

            {/* Clear Segment */}
            {segmentA !== null && onClearSegment && (
              <button
                type="button"
                onClick={onClearSegment}
                className="text-[11px] text-white/60 hover:text-white underline cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
