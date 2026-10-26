'use client';

import { useState } from 'react';
import MultiSurahLoopModal from './MultiSurahLoopModal';

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
  // Multi-Surah Group Repetition
  isMultiSurahLoop?: boolean;
  selectedSurahsToLoop?: number[];
  currentSurah?: number;
  onToggleMultiSurahLoop?: (enabled?: boolean) => void;
  onSetSelectedSurahsToLoop?: (surahs: number[], enabled?: boolean) => void;
  onPlaySurah?: (surahNumber: number) => void;
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
  onOpenOfflineAudio?: () => void;
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
  isAyahRangeLooping = false,
  ayahRangeStart = null,
  ayahRangeEnd = null,
  currentAyahNumber = null,
  autoPlayNext = true,
  isMultiSurahLoop = false,
  selectedSurahsToLoop = [],
  currentSurah = 0,
  onToggleMultiSurahLoop,
  onSetSelectedSurahsToLoop,
  onPlaySurah,
  onTogglePlay,
  onSeek,
  onSetSpeed,
  onToggleRepeat,
  onSetRepeatCount,
  onStopAyahRangeLoop,
  onSkip,
  onNextSurah,
  onPreviousSurah,
  onToggleAutoPlayNext,
  onClose,
  onOpenReciterSelect,
  onOpenOfflineAudio,
}: AudioPlayerProps) {
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [showMultiSurahModal, setShowMultiSurahModal] = useState(false);

  const speeds = [0.75, 1, 1.25, 1.5];
  const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length] || 1;

  const repeatOptions = [
    { count: 1, label: 'بدون تكرار (تشغيل مرة)' },
    { count: 3, label: 'تكرار 3 مرات (سورة)' },
    { count: 5, label: 'تكرار 5 مرات' },
    { count: 7, label: 'تكرار 7 مرات' },
    { count: 10, label: 'تكرار 10 مرات' },
    { count: 999, label: 'تكرار مستمر (∞)' },
  ];

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 px-3 py-2.5 md:px-6 md:py-3 shadow-2xl border-t border-[#C8A85B]/30 backdrop-blur-md"
      style={{ backgroundColor: '#123B2Aee', color: 'white' }}
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
        {/* Track / Surah Info & Ayah-Range Badge */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C8A85B]/20 flex items-center justify-center text-[#C8A85B] text-sm shrink-0">
              🔊
            </div>
            <div className="text-right">
              <div className="font-bold text-xs md:text-sm text-[#C8A85B] leading-tight flex items-center gap-1.5 flex-wrap">
                <span>سورة {surahName}</span>

                {/* Multi-Surah Loop Active Badge */}
                {isMultiSurahLoop && selectedSurahsToLoop.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMultiSurahModal(true)}
                    className="text-[10px] bg-[#C8A85B] text-[#123B2A] font-extrabold px-1.5 py-0.5 rounded-full hover:bg-white transition-colors cursor-pointer"
                    title="تكرار مجموعة سور مفعل"
                  >
                    🔁 تكرار {selectedSurahsToLoop.length} سور
                  </button>
                )}

                {/* Ayah Range Repetition Active Banner */}
                {isAyahRangeLooping && ayahRangeStart && ayahRangeEnd && (
                  <span className="text-[10px] bg-emerald-600/40 text-emerald-200 border border-emerald-400/50 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                    <span>🔁 الآيات {ayahRangeStart}-{ayahRangeEnd}</span>
                    {repeatCount > 1 && (
                      <span className="text-[9px] opacity-80">
                        (متبقي {repeatCount === 999 ? '∞' : remainingRepeats})
                      </span>
                    )}
                    {onStopAyahRangeLoop && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStopAyahRangeLoop();
                        }}
                        className="ml-1 text-[9px] bg-red-500/30 hover:bg-red-500/50 text-red-200 px-1 rounded cursor-pointer"
                        title="إلغاء التكرار"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                )}
              </div>

              {/* Reciter Name with Quick Change Button */}
              {onOpenReciterSelect ? (
                <button
                  type="button"
                  onClick={onOpenReciterSelect}
                  className="text-[11px] text-white/70 hover:text-[#C8A85B] transition-colors flex items-center gap-1 cursor-pointer group text-right"
                  title="اضغط لتغيير القارئ"
                >
                  <span className="underline decoration-dotted decoration-white/30 group-hover:decoration-[#C8A85B]">
                    {reciterName}
                  </span>
                  <span className="text-[9px] opacity-60 group-hover:opacity-100">▼</span>
                </button>
              ) : (
                <div className="text-[11px] text-white/70">{reciterName}</div>
              )}
            </div>
          </div>

          {/* Close button (Mobile view) */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="إغلاق المشغل"
            aria-label="إغلاق المشغل"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Playback Controls & Repeat Selector */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Repeat Selector Dropdown Button */}
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
                repeatCount > 1 || isRepeat || (isMultiSurahLoop && selectedSurahsToLoop.length > 0)
                  ? 'bg-[#C8A85B]/20 text-[#C8A85B] border-[#C8A85B] font-bold shadow-xs'
                  : 'bg-white/5 text-white/60 border-transparent hover:text-white hover:bg-white/10'
              }`}
              title="خيارات تكرار السور والآيات"
              aria-label="خيارات تكرار الاستماع"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {isMultiSurahLoop && selectedSurahsToLoop.length > 0 ? (
                <span className="text-[10px] font-bold px-1 rounded bg-[#C8A85B] text-[#123B2A]">
                  {selectedSurahsToLoop.length} سور
                </span>
              ) : repeatCount > 1 ? (
                <span className="text-[10px] font-bold px-1 rounded bg-[#C8A85B] text-[#123B2A]">
                  {repeatCount === 999 ? '∞' : `${repeatCount}x`}
                </span>
              ) : null}
            </button>

            {/* Repeat Dropdown Menu */}
            {showRepeatMenu && onSetRepeatCount && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRepeatMenu(false)} />
                <div
                  className="absolute bottom-full mb-2 right-0 w-60 rounded-2xl shadow-2xl p-2 z-50 border border-[#C8A85B]/50"
                  style={{ backgroundColor: '#123B2A', color: 'white' }}
                >
                  <div className="px-2 py-1 text-[11px] font-bold text-[#C8A85B] border-b border-white/10 mb-1">
                    🔁 خيارات التكرار:
                  </div>

                  {/* Multi-Surah Group Loop Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRepeatMenu(false);
                      setShowMultiSurahModal(true);
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer mb-1 border ${
                      isMultiSurahLoop && selectedSurahsToLoop.length > 0
                        ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                        : 'bg-white/10 text-[#C8A85B] border-[#C8A85B]/40 hover:bg-white/20'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>✨</span>
                      <span>تكرار مجموعة سور محددة</span>
                    </span>
                    {isMultiSurahLoop && selectedSurahsToLoop.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-extrabold bg-[#123B2A] text-[#C8A85B]">
                        {selectedSurahsToLoop.length} سور ✓
                      </span>
                    )}
                  </button>

                  <div className="px-2 py-1 text-[10px] text-white/60 border-t border-white/10 mt-1 mb-0.5">
                    أو تكرار السورة الحالية فقط:
                  </div>

                  {repeatOptions.map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => {
                        onSetRepeatCount(opt.count);
                        if (onToggleMultiSurahLoop && isMultiSurahLoop) {
                          onToggleMultiSurahLoop(false);
                        }
                        setShowRepeatMenu(false);
                      }}
                      className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        repeatCount === opt.count && !isMultiSurahLoop
                          ? 'bg-[#C8A85B] text-[#123B2A]'
                          : 'hover:bg-white/10 text-white/90'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {repeatCount === opt.count && !isMultiSurahLoop && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Previous Surah Button */}
          {onPreviousSurah && (
            <button
              type="button"
              onClick={onPreviousSurah}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="السورة السابقة"
              aria-label="السورة السابقة"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          )}

          {/* Skip -10s */}
          {onSkip && (
            <button
              type="button"
              onClick={() => onSkip(-10)}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="ترجيع 10 ثواني"
              aria-label="ترجيع 10 ثواني"
            >
              <span className="text-xs">10-</span>
            </button>
          )}

          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLoading}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: '#C8A85B', color: '#123B2A' }}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-0.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Skip +10s */}
          {onSkip && (
            <button
              type="button"
              onClick={() => onSkip(10)}
              className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-bold"
              title="تقديم 10 ثواني"
              aria-label="تقديم 10 ثواني"
            >
              <span className="text-xs">10+</span>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" y1="19" x2="5" y2="5" />
              </svg>
            </button>
          )}

          {/* Auto-Play Next Surah Toggle */}
          {onToggleAutoPlayNext && (
            <button
              type="button"
              onClick={onToggleAutoPlayNext}
              className={`p-1.5 md:p-2 rounded-xl transition-all text-xs font-bold border cursor-pointer ${
                autoPlayNext
                  ? 'bg-[#C8A85B]/20 text-[#C8A85B] border-[#C8A85B]'
                  : 'bg-white/5 text-white/40 border-transparent hover:text-white hover:bg-white/10'
              }`}
              title={autoPlayNext ? 'التشغيل التلقائي للسورة التالية مفعّل' : 'التشغيل التلقائي معطل'}
              aria-label="التشغيل التلقائي للسورة التالية"
            >
              <span className="text-[11px] font-bold">التالي: {autoPlayNext ? 'تلقائي' : 'يدوي'}</span>
            </button>
          )}

          {/* Speed Selector */}
          <button
            type="button"
            onClick={() => onSetSpeed(nextSpeed)}
            className="p-1.5 md:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-bold cursor-pointer"
            title="سرعة القراءة"
            aria-label="سرعة القراءة"
          >
            {playbackRate}x
          </button>

          {/* Offline Audio Download Button */}
          {onOpenOfflineAudio && (
            <button
              type="button"
              onClick={onOpenOfflineAudio}
              className="p-1.5 md:p-2 rounded-xl bg-white/5 hover:bg-[#C8A85B]/20 text-[#C8A85B] border border-[#C8A85B]/40 hover:border-[#C8A85B] transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="تنزيل تلاوات المشايخ للاستماع بدون إنترنت"
              aria-label="تنزيل تلاوات المشايخ للاستماع بدون إنترنت"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="text-[10px] hidden sm:inline">بدون نت</span>
            </button>
          )}
        </div>

        {/* Progress Bar & Timing */}
        <div className="w-full md:w-56 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#C8A85B]"
            aria-label="موقع التلاوة"
          />
          <div className="text-[10px] md:text-xs text-white/60 font-mono shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Desktop Close button */}
        <button
          type="button"
          onClick={onClose}
          className="hidden md:flex p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="إغلاق المشغل"
          aria-label="إغلاق المشغل"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Multi-Surah Loop Modal */}
      <MultiSurahLoopModal
        isOpen={showMultiSurahModal}
        onClose={() => setShowMultiSurahModal(false)}
        selectedSurahs={selectedSurahsToLoop}
        isMultiSurahLoop={isMultiSurahLoop}
        currentPlayingSurah={currentSurah}
        onSave={(surahs, enabled) => {
          if (onSetSelectedSurahsToLoop) {
            onSetSelectedSurahsToLoop(surahs, enabled);
          }
        }}
        onStartPlayback={(surahNum) => {
          if (onPlaySurah) {
            onPlaySurah(surahNum);
          }
        }}
      />
    </div>
  );
}
