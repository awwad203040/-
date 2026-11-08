'use client';

import React from 'react';
import { SURAH_METADATA, POPULAR_RECITERS, type ReciterInfo } from '@/lib/quran-meta';
import { triggerHaptic, announceToScreenReader } from '@/lib/accessibility';

interface AudioControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number;
  selectedSurahForAudio: number;
  selectedReciterId: number;
  currentReciter: ReciterInfo;
  autoPlayNext: boolean;
  repeatCount: number;
  remainingRepeats: number;
  isAyahRangeLooping: boolean;
  ayahRangeStart: number;
  ayahRangeEnd: number;
  currentAyahNumber?: number | null;
  rangeRepeatCount: number;
  repeatTab: 'ayahs' | 'surah' | 'multi';
  isMultiSurahLoop: boolean;
  selectedSurahsToLoop: number[];
  onTogglePlay: () => void;
  onPlaySurah: (surahNumber: number) => void;
  onReciterChange: (newId: number) => void;
  onOpenReciterModal: () => void;
  onOpenOfflineAudioModal: () => void;
  onToggleAutoPlayNext: () => void;
  onStopAyahRangeLoop: () => void;
  onStartAyahRangeLoop: () => void;
  setAyahRangeStart: (val: number) => void;
  setAyahRangeEnd: (val: number) => void;
  setRangeRepeatCount: (val: number) => void;
  setRepeatTab: (tab: 'ayahs' | 'surah' | 'multi') => void;
  setRepeatCount: (count: number) => void;
  onOpenMultiSurahModal: () => void;
  onToggleMultiSurahLoop: (enable?: boolean) => void;
}

export default function AudioControlModal({
  isOpen,
  onClose,
  isPlaying,
  isLoading,
  currentSurah,
  selectedSurahForAudio,
  selectedReciterId,
  currentReciter,
  autoPlayNext,
  repeatCount,
  remainingRepeats,
  isAyahRangeLooping,
  ayahRangeStart,
  ayahRangeEnd,
  currentAyahNumber,
  rangeRepeatCount,
  repeatTab,
  isMultiSurahLoop,
  selectedSurahsToLoop,
  onTogglePlay,
  onPlaySurah,
  onReciterChange,
  onOpenReciterModal,
  onOpenOfflineAudioModal,
  onToggleAutoPlayNext,
  onStopAyahRangeLoop,
  onStartAyahRangeLoop,
  setAyahRangeStart,
  setAyahRangeEnd,
  setRangeRepeatCount,
  setRepeatTab,
  setRepeatCount,
  onOpenMultiSurahModal,
  onToggleMultiSurahLoop,
}: AudioControlModalProps) {
  if (!isOpen) return null;

  const currentSurahMeta = SURAH_METADATA[selectedSurahForAudio] || SURAH_METADATA[1];
  const totalVerses = currentSurahMeta?.versesCount || 7;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="الاستماع للقرآن الكريم والتحكم الصوتي والتكرار"
      dir="rtl"
    >
      <div
        className="w-full sm:max-w-xl max-h-[90vh] bg-[#123B2A] border-t-2 sm:border-2 border-[#C8A85B] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto flex flex-col text-white animate-slide-up flash-modal-window"
        style={{ fontFamily: "'Tajawal', sans-serif" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0E2E21] px-5 py-4 border-b border-[#C8A85B]/40 flex items-center justify-between flash-modal-header">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎧</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                استمع للقرآن الكريم
              </h2>
              <p className="text-[11px] text-[#C8A85B]">
                اختيار القارئ • تكرار الآيات والسور • الحفظ المتقن
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
            aria-label="إغلاق نافذة الاستماع"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Main Play / Pause and Sheikh Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-black/40 via-white/5 to-black/40 border border-[#C8A85B]/40 flex items-center gap-3.5">
            {/* Play Button */}
            <button
              type="button"
              onClick={onTogglePlay}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-95 shadow-xl flex-shrink-0 cursor-pointer border ${
                isPlaying
                  ? 'bg-[#0B5B43] text-white border-emerald-400/50 ring-4 ring-emerald-500/25 animate-pulse'
                  : isLoading
                  ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] animate-pulse'
                  : 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] hover:bg-[#d4b66d]'
              }`}
              aria-label={isLoading ? 'جاري التحميل' : isPlaying ? 'إيقاف الاستماع' : 'استمع الآن للقرآن الكريم'}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            {/* Current Listening Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isPlaying && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                )}
                <span className="text-xs font-bold text-white/90 truncate">
                  {isPlaying ? 'جاري الاستماع الآن' : 'جاهز للاستماع'}
                </span>
                {isPlaying && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold shrink-0">
                    نشط
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-[#FFD700] truncate">
                سورة {currentSurahMeta.name}
              </h3>
              <p className="text-xs text-[#F7EED8]/80 truncate">
                بصوت الشيخ: {currentReciter.name}
              </p>
            </div>
          </div>

          {/* Sheikh / Reciter Selector */}
          <div className="p-3.5 rounded-2xl bg-[#0E2E21] border border-[#C8A85B]/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#C8A85B] flex items-center gap-1.5">
                <span>👳‍♂️</span>
                <span>اختر الشيخ / القارئ:</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOfflineAudioModal();
                  }}
                  className="text-[10px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer font-bold transition-all shadow-xs"
                  title="تنزيل صوت الشيخ بدون إنترنت"
                >
                  <span>📥</span>
                  <span>تنزيل بدون نت</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReciterModal();
                  }}
                  className="text-[10px] text-[#C8A85B] hover:underline cursor-pointer font-bold"
                >
                  بحث في القراء 🔍
                </button>
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedReciterId}
                onChange={(e) => onReciterChange(parseInt(e.target.value, 10))}
                className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C8A85B] cursor-pointer shadow-inner appearance-none"
              >
                {POPULAR_RECITERS.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#123B2A] text-white py-1">
                    الشيخ: {r.name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#C8A85B] pointer-events-none">
                👳‍♂️
              </span>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#C8A85B] pointer-events-none">
                ▾
              </span>
            </div>
          </div>

          {/* Surah Selector with Next/Prev Controls */}
          <div className="p-3.5 rounded-2xl bg-[#0E2E21] border border-[#C8A85B]/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#C8A85B] flex items-center gap-1.5">
                <span>📖</span>
                <span>سورة التلاوة:</span>
              </label>
              <span className="text-[11px] text-white/70">
                {currentSurahMeta.versesCount} آية • {currentSurahMeta.revelationPlace === 'makkah' ? 'مكية' : 'مدنية'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(114, selectedSurahForAudio + 1);
                  onPlaySurah(next);
                }}
                disabled={selectedSurahForAudio >= 114}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C8A85B] text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition border border-white/10 shrink-0"
                title="السورة التالية"
              >
                ⏭ السورة التالية
              </button>

              <select
                value={selectedSurahForAudio}
                onChange={(e) => onPlaySurah(parseInt(e.target.value, 10))}
                className="flex-1 bg-[#123B2A] text-[#FFD700] font-bold text-xs sm:text-sm px-3 py-2 rounded-xl border border-[#C8A85B]/60 focus:outline-none cursor-pointer truncate"
              >
                {Object.values(SURAH_METADATA).map((s) => (
                  <option key={s.number} value={s.number} className="bg-[#123B2A] text-white">
                    {s.number}. سورة {s.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const prev = Math.max(1, selectedSurahForAudio - 1);
                  onPlaySurah(prev);
                }}
                disabled={selectedSurahForAudio <= 1}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C8A85B] text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition border border-white/10 shrink-0"
                title="السورة السابقة"
              >
                ⏮ السابقة
              </button>
            </div>
          </div>

          {/* Auto-play Next Surah Toggle */}
          <div className="p-3 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⏭</span>
              <div>
                <p className="font-bold text-white/90">الانتقال التلقائي للسورة التالية</p>
                <p className="text-[10px] text-white/60">متابعة التلاوة تلقائياً بعد نهاية السورة</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleAutoPlayNext}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer border ${
                autoPlayNext
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                  : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20'
              }`}
            >
              {autoPlayNext ? 'مفعّل ✓' : 'معطّل'}
            </button>
          </div>

          {/* Repetition Section (Tabs for Ayahs, Surah, Multi-Surah) */}
          <div className="p-3.5 rounded-2xl bg-[#0E2E21] border border-[#C8A85B]/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#C8A85B] flex items-center gap-1.5">
                <span className="text-base">🔁</span>
                <span>تكرار التلاوة للحفظ والمراجعة:</span>
              </span>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setRepeatTab('ayahs')}
                className={`py-2 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                  repeatTab === 'ayahs'
                    ? 'bg-[#C8A85B] text-[#123B2A] shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                📖 تكرار بالآيات
              </button>
              <button
                type="button"
                onClick={() => setRepeatTab('surah')}
                className={`py-2 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                  repeatTab === 'surah'
                    ? 'bg-[#C8A85B] text-[#123B2A] shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                🔁 كامل السورة
              </button>
              <button
                type="button"
                onClick={() => setRepeatTab('multi')}
                className={`py-2 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                  repeatTab === 'multi'
                    ? 'bg-[#C8A85B] text-[#123B2A] shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                📚 عدة سور
              </button>
            </div>

            {/* TAB 1: Ayah Range */}
            {repeatTab === 'ayahs' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/80 font-bold flex items-center gap-1">
                      <span>🟢</span>
                      <span>من الآية:</span>
                    </label>
                    <select
                      value={ayahRangeStart}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setAyahRangeStart(val);
                        if (ayahRangeEnd < val) setAyahRangeEnd(val);
                      }}
                      className="w-full bg-[#123B2A] text-[#FFD700] font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/50 focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: totalVerses }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num} className="bg-[#123B2A] text-white">
                          الآية {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/80 font-bold flex items-center gap-1">
                      <span>🛑</span>
                      <span>إلى الآية:</span>
                    </label>
                    <select
                      value={ayahRangeEnd}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setAyahRangeEnd(Math.max(ayahRangeStart, val));
                      }}
                      className="w-full bg-[#123B2A] text-[#FFD700] font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/50 focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: totalVerses - ayahRangeStart + 1 }, (_, i) => ayahRangeStart + i).map((num) => (
                        <option key={num} value={num} className="bg-[#123B2A] text-white">
                          الآية {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Repeat Count Stepper */}
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2">
                  <span className="text-xs text-white/90 font-bold shrink-0">مرات التكرار:</span>
                  <button
                    type="button"
                    onClick={() => setRangeRepeatCount(Math.max(1, rangeRepeatCount - 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={rangeRepeatCount === 999 ? '' : rangeRepeatCount}
                    placeholder={rangeRepeatCount === 999 ? '∞' : '1'}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) setRangeRepeatCount(Math.min(500, val));
                      else if (e.target.value === '') setRangeRepeatCount(1);
                    }}
                    className="flex-1 bg-black/40 text-[#FFD700] text-center font-bold text-sm py-1 rounded-lg border border-[#C8A85B]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setRangeRepeatCount(Math.min(500, rangeRepeatCount + 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeRepeatCount(rangeRepeatCount === 999 ? 3 : 999)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      rangeRepeatCount === 999
                        ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                        : 'bg-white/10 text-white/70 border-white/20'
                    }`}
                  >
                    مستمر ∞
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onStartAyahRangeLoop();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🔁</span>
                  <span>تشغيل وتكرار من آية {ayahRangeStart} إلى {ayahRangeEnd}</span>
                  <span className="bg-[#123B2A]/15 px-2 py-0.5 rounded text-xs font-black">
                    ({rangeRepeatCount === 999 ? 'مستمر ∞' : `${rangeRepeatCount} مرات`})
                  </span>
                </button>
              </div>
            )}

            {/* TAB 2: Full Surah */}
            {repeatTab === 'surah' && (
              <div className="space-y-3 pt-1">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2">
                  <span className="text-xs text-white/90 font-bold shrink-0">مرات التكرار:</span>
                  <button
                    type="button"
                    onClick={() => setRepeatCount(Math.max(1, repeatCount - 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={repeatCount === 999 ? '' : repeatCount}
                    placeholder={repeatCount === 999 ? '∞' : '1'}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) setRepeatCount(Math.min(500, val));
                      else if (e.target.value === '') setRepeatCount(1);
                    }}
                    className="flex-1 bg-black/40 text-[#FFD700] text-center font-bold text-sm py-1 rounded-lg border border-[#C8A85B]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setRepeatCount(Math.min(500, repeatCount + 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-[#C8A85B] font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatCount(repeatCount === 999 ? 3 : 999)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      repeatCount === 999
                        ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                        : 'bg-white/10 text-white/70 border-white/20'
                    }`}
                  >
                    مستمر ∞
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isPlaying ? '⏸ إيقاف مؤقت' : `▶ تشغيل سورة ${currentSurahMeta.name} كاملة`}</span>
                </button>
              </div>
            )}

            {/* TAB 3: Multi-Surah Loop */}
            {repeatTab === 'multi' && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-white/80 leading-relaxed">
                  تكرار مجموعة سور محددة تتابعاً (مثل المعوذات، جزء عم، يس والواقعة والملك) للمراجعة والحفظ.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMultiSurahModal();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>⚙️</span>
                    <span>
                      {selectedSurahsToLoop.length > 0
                        ? `تعديل السور المحددة (${selectedSurahsToLoop.length})`
                        : 'تحديد السور للتكرار'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleMultiSurahLoop()}
                    disabled={selectedSurahsToLoop.length === 0}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer border ${
                      isMultiSurahLoop
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : selectedSurahsToLoop.length > 0
                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        : 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {isMultiSurahLoop ? 'إيقاف التكرار' : 'بدء التكرار'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E2E21] border-t border-white/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
