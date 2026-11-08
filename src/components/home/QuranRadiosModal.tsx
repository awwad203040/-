'use client';

import { useState, useMemo } from 'react';
import { QURAN_RADIO_STATIONS, type QuranRadioStation } from '@/lib/quran-radios';
import { useQuranRadio } from '@/hooks/useQuranRadio';
import { triggerHaptic } from '@/lib/accessibility';

interface QuranRadiosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuranRadiosModal({ isOpen, onClose }: QuranRadiosModalProps) {
  const {
    currentStation,
    isPlaying,
    isLoading,
    volume,
    error,
    playStation,
    togglePlayPause,
    stopRadio,
    setVolume,
  } = useQuranRadio();

  const [activeCategory, setActiveCategory] = useState<'all' | 'country' | 'reciter' | 'tafsir'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStations = useMemo(() => {
    return QURAN_RADIO_STATIONS.filter((s) => {
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] border-2 border-[#C8A85B]/60 flash-modal-window"
        style={{ backgroundColor: '#FBF8EF', color: '#17231D' }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div
          className="p-4 sm:p-5 text-white flex items-center justify-between shadow-md relative flash-modal-header"
          style={{ backgroundColor: '#123B2A' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#C8A85B]/20 border border-[#C8A85B]/60 flex items-center justify-center text-2xl shadow-inner">
              📻
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  إذاعات القرآن الكريم المباشرة
                </h2>
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  بث مباشر LIVE
                </span>
              </div>
              <p className="text-xs text-[#C8A85B] opacity-90 mt-0.5">
                إذاعات مصر والسعودية والدول الإسلامية وتلاوات كبار القراء على مدار 24 ساعة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer text-lg font-bold"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-3 sm:p-4 bg-white/60 border-b border-[#C8A85B]/20 space-y-2.5">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن إذاعة (مثل: مصر، السعودية، الشارقة، عبد الباسط، المنشاوي)..."
              className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-[#C8A85B]/40 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C8A85B] shadow-inner"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#123B2A]/60">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs bg-gray-200 hover:bg-gray-300 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'all', label: 'جميع الإذاعات', icon: '🌍' },
              { id: 'country', label: 'إذاعات الدول الإسلامية', icon: '🏛️' },
              { id: 'reciter', label: 'كبار القراء (24 ساعة)', icon: '🎙️' },
              { id: 'tafsir', label: 'التفسير والأذكار', icon: '📚' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setActiveCategory(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  activeCategory === tab.id
                    ? 'bg-[#123B2A] text-[#C8A85B] border border-[#C8A85B]'
                    : 'bg-white text-[#123B2A]/80 hover:bg-[#123B2A]/5 border border-gray-200'
                }`}
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (currentStation) playStation(currentStation);
              }}
              className="px-2 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px]"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Stations List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredStations.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <span className="text-3xl">📻</span>
              <p className="text-sm font-bold">لم نجد إذاعات مطابقة لبحثك</p>
              <p className="text-xs text-gray-400">جرب البحث باسم دولة أو قارئ آخر</p>
            </div>
          ) : (
            filteredStations.map((station) => {
              const isCurrent = currentStation?.id === station.id;
              const isCurrentlyPlaying = isCurrent && isPlaying;
              const isCurrentlyLoading = isCurrent && isLoading;

              return (
                <div
                  key={station.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    playStation(station);
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-[#C8A85B] bg-gradient-to-r from-[#123B2A] to-[#1a4a35] text-white shadow-md'
                      : 'border-gray-200 bg-white hover:border-[#C8A85B]/60 hover:shadow-xs'
                  }`}
                >
                  {/* Left (RTL Start): Flag, Name & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm border ${
                        isCurrent
                          ? 'bg-[#C8A85B]/25 border-[#C8A85B] text-white'
                          : 'bg-[#123B2A]/5 border-gray-100'
                      }`}
                    >
                      {station.flag}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`font-bold text-sm sm:text-base leading-tight truncate ${
                            isCurrent ? 'text-[#F7EED8]' : 'text-[#123B2A]'
                          }`}
                          style={{ fontFamily: "'Tajawal', sans-serif" }}
                        >
                          {station.name}
                        </h3>

                        {isCurrentlyPlaying && (
                          <span className="flex items-center gap-1 bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>يعمل الآن</span>
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-xs mt-1 leading-relaxed line-clamp-1 ${
                          isCurrent ? 'text-white/80' : 'text-gray-500'
                        }`}
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        {station.description}
                      </p>
                    </div>
                  </div>

                  {/* Right (RTL End): Play / Pause Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('tap');
                      playStation(station);
                    }}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg transition active:scale-95 shadow-md shrink-0 cursor-pointer border ${
                      isCurrentlyPlaying
                        ? 'bg-[#0B5B43] text-white border-emerald-400 ring-2 ring-emerald-400/40'
                        : isCurrent
                        ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                        : 'bg-[#123B2A] text-[#C8A85B] border-[#C8A85B]/30 hover:bg-[#1b4b38]'
                    }`}
                    title={isCurrentlyPlaying ? 'إيقاف مؤقت' : 'استماع الآن'}
                    aria-label={isCurrentlyPlaying ? 'إيقاف مؤقت' : 'استماع الآن'}
                  >
                    {isCurrentlyLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isCurrentlyPlaying ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Active Radio Sticky Bar at Bottom when a station is selected */}
        {currentStation && (
          <div
            className="p-3 sm:p-4 text-white border-t-2 border-[#C8A85B] flex flex-wrap items-center justify-between gap-3 shadow-lg"
            style={{ backgroundColor: '#102F22' }}
          >
            {/* Station info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-2xl shrink-0">{currentStation.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#C8A85B] font-bold">بث مباشر:</span>
                  <p className="text-sm font-bold truncate text-[#F7EED8]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    {currentStation.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/70">
                  <span>{currentStation.country}</span>
                  <span>•</span>
                  <span>متصل بصوت الوسائط (STREAM_MUSIC)</span>
                </div>
              </div>
            </div>

            {/* Play/Pause & Volume & Stop Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Volume Slider */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-black/30 px-2.5 py-1.5 rounded-xl border border-white/10">
                <span>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-[#C8A85B] cursor-pointer"
                  title="مستوى الصوت"
                />
              </div>

              {/* Main Play / Pause Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  togglePlayPause();
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#d6b76c] transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
                    <span>جاري الاتصال...</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <span>⏸</span>
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <span>▶️</span>
                    <span>استئناف البث</span>
                  </>
                )}
              </button>

              {/* Stop & Close Radio Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  stopRadio();
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-red-900/60 text-white/80 hover:text-white transition cursor-pointer"
                title="إيقاف الإذاعة تماماً"
              >
                ⏹
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
