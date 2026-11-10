'use client';

import React from 'react';
import {
  POPULAR_CITIES,
  CALCULATION_METHODS,
  CalculationMethod,
} from '@/lib/prayer-times';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { triggerHaptic } from '@/lib/accessibility';

interface PrayerTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayerHook: ReturnType<typeof usePrayerTimes>;
}

export default function PrayerTimesModal({
  isOpen,
  onClose,
  prayerHook,
}: PrayerTimesModalProps) {
  if (!isOpen) return null;

  const {
    prayerData,
    settings,
    isGpsLoading,
    gpsError,
    isTestAdhanPlaying,
    requestGpsLocation,
    selectCity,
    setMethod,
    toggleMasterAdhan,
    togglePrayerAdhan,
    testAdhan,
    stopTestAdhan,
  } = prayerHook;

  const prayers = [
    { key: 'fajr' as const, name: 'الفجر', icon: '🌌', time: prayerData.fajr12, hasAdhan: true },
    { key: 'sunrise' as const, name: 'الشروق', icon: '🌅', time: prayerData.sunrise12, hasAdhan: false },
    { key: 'dhuhr' as const, name: 'الظهر', icon: '☀️', time: prayerData.dhuhr12, hasAdhan: true },
    { key: 'asr' as const, name: 'العصر', icon: '🌤️', time: prayerData.asr12, hasAdhan: true },
    { key: 'maghrib' as const, name: 'المغرب', icon: '🌇', time: prayerData.maghrib12, hasAdhan: true },
    { key: 'isha' as const, name: 'العشاء', icon: '🌙', time: prayerData.isha12, hasAdhan: true },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prayer-times-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-1 sm:p-2 md:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="relative bg-[#123B2A] border-2 border-[#C8A85B] rounded-2xl sm:rounded-3xl w-full max-w-2xl h-[95vh] sm:h-[94vh] max-h-[96vh] my-auto p-3.5 sm:p-4.5 text-white shadow-2xl flex flex-col gap-2.5 sm:gap-3 overflow-y-auto flash-modal-window"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Tajawal', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8A85B]/30 pb-2 shrink-0 flash-modal-header">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🕌</span>
            <div className="flex items-baseline gap-2">
              <h2 id="prayer-times-title" className="text-base sm:text-lg font-bold text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                مواقيت الصلاة
              </h2>
              <span className="text-[11px] sm:text-xs text-[#C8A85B]">
                {prayerData.cityName} • {prayerData.hijriDate}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة مواقيت الصلاة"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 cursor-pointer text-sm transition active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Location & GPS Bar */}
        <div className="bg-[#0D281C] px-3 py-2 rounded-xl border border-[#C8A85B]/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">📍</span>
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {prayerData.cityName}
            </span>
            <span className="text-[10px] text-white/60 shrink-0">
              ({settings.useGps ? 'GPS تلقائي' : 'يدوي'})
            </span>
          </div>

          <button
            type="button"
            onClick={requestGpsLocation}
            disabled={isGpsLoading}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C8A85B] to-[#dfc278] text-[#123B2A] text-xs font-bold flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition cursor-pointer shadow-xs shrink-0"
          >
            {isGpsLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
                <span>تحديد...</span>
              </>
            ) : (
              <>
                <span>🎯</span>
                <span>تحديث موقعي (GPS)</span>
              </>
            )}
          </button>
        </div>

        {gpsError && (
          <div className="bg-red-950/70 border border-red-500/40 text-red-200 text-xs py-1.5 px-2.5 rounded-xl text-center shrink-0">
            {gpsError}
          </div>
        )}

        {/* Next Prayer Live Highlight Card */}
        <div className="bg-gradient-to-br from-[#184E38] via-[#0E3827] to-[#0A261B] px-3.5 py-2.5 rounded-2xl border-2 border-[#C8A85B] shadow-md flex flex-col gap-1.5 shrink-0">
          {/* Top Row: Next Prayer Title & Badge */}
          <div className="flex items-center justify-between w-full border-b border-[#C8A85B]/20 pb-1.5">
            <div className="text-xs sm:text-sm text-white/95 font-medium flex items-center gap-1.5">
              <span>⏳</span>
              <span>
                متبقي على صلاة <span className="font-extrabold text-[#C8A85B] text-sm sm:text-base">{prayerData.nextPrayer.name}</span>:
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] bg-[#C8A85B]/25 text-[#F5D88A] px-2.5 py-0.5 rounded-full border border-[#C8A85B]/40 font-bold whitespace-nowrap shadow-xs">
              الصلاة القادمة
            </span>
          </div>

          {/* Countdown & Adhan Time Row */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#F7EED8] tracking-wider font-mono drop-shadow-sm" dir="ltr">
              {prayerData.nextPrayer.remainingFormatted}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-black/40 px-3 py-1.5 rounded-xl border border-emerald-500/30 shrink-0">
              <span>⏰ موعد الأذان:</span>
              <span className="font-extrabold text-white text-xs sm:text-sm font-mono" dir="ltr">{prayerData.nextPrayer.time12}</span>
            </div>
          </div>
        </div>

        {/* Prayer Times Grid (All 6 Times in 1 Row) */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2 shrink-0">
          {prayers.map((p) => {
            const isNext = prayerData.nextPrayer.key === p.key;
            const isAdhanActive = p.hasAdhan && settings.adhanEnabled && settings.enabledPrayers[p.key as keyof typeof settings.enabledPrayers];
            return (
              <div
                key={p.key}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all border text-center relative ${
                  isNext
                    ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-md ring-2 ring-[#C8A85B]/50 font-bold'
                    : 'bg-black/25 text-white/90 border-white/10 hover:bg-black/35'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-0.5 px-0.5">
                  <span className="text-sm sm:text-base">{p.icon}</span>
                  {p.hasAdhan ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrayerAdhan(p.key as any);
                      }}
                      className="cursor-pointer text-xs p-0.5 hover:scale-110 transition active:scale-95"
                      title={isAdhanActive ? `أذان ${p.name} مفعل` : `أذان ${p.name} معطل`}
                      aria-label={`تبديل أذان ${p.name}`}
                    >
                      {isAdhanActive ? '🔔' : '🔕'}
                    </button>
                  ) : (
                    <span className="text-[10px] opacity-30">─</span>
                  )}
                </div>

                <span className="text-xs font-bold leading-tight">{p.name}</span>
                <span
                  className={`text-[10px] sm:text-xs font-mono font-extrabold mt-0.5 ${
                    isNext ? 'text-[#123B2A]' : 'text-[#C8A85B]'
                  }`}
                  dir="ltr"
                >
                  {p.time}
                </span>

                {isNext && (
                  <span className="text-[8px] sm:text-[9px] mt-0.5 bg-[#123B2A] text-[#C8A85B] px-1.5 py-0.2 rounded-full font-bold">
                    القادمة
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Adhan Sound Alert Card */}
        <div className="bg-[#0D281C] p-3 rounded-2xl border border-[#C8A85B]/50 flex flex-col gap-2 shadow-sm shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">🕌</span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-[#F7EED8] truncate">
                  صوت الأذان (المؤذن محمد جازي)
                </span>
                <span className="text-[10px] text-white/70 truncate">
                  يرتفع تلقائياً عند دخول الوقت حتى والتطبيق مغلق
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleMasterAdhan}
              role="switch"
              aria-checked={settings.adhanEnabled}
              aria-label="تفعيل أو إيقاف صوت الأذان"
              className={`w-12 h-6.5 rounded-full transition-colors p-0.5 cursor-pointer flex items-center shrink-0 ${
                settings.adhanEnabled ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className="w-5.5 h-5.5 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Test Adhan Sound Button */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-2">
            {isTestAdhanPlaying ? (
              <button
                type="button"
                onClick={stopTestAdhan}
                className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs animate-pulse"
              >
                <span>⏹</span>
                <span>إيقاف صوت الأذان</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={testAdhan}
                className="flex-1 py-1.5 px-3 rounded-xl bg-[#C8A85B]/20 hover:bg-[#C8A85B]/30 text-[#C8A85B] border border-[#C8A85B]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <span>🔊</span>
                <span>تجربة وسماع صوت الأذان (المؤذن محمد جازي)</span>
              </button>
            )}
          </div>
        </div>

        {/* City & Method Selectors in 2 Columns */}
        <div className="grid grid-cols-2 gap-2.5 shrink-0">
          {/* Manual City Selector */}
          <div className="bg-[#0D281C]/90 p-2.5 rounded-xl border border-white/15 flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-bold text-[#C8A85B] flex items-center gap-1 truncate">
              <span>🌍</span>
              <span>المدينة يدوياً:</span>
            </label>
            <select
              value={settings.cityId}
              onChange={(e) => selectCity(e.target.value)}
              className="w-full bg-black/40 text-white font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/40 focus:outline-none cursor-pointer truncate"
            >
              {POPULAR_CITIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#123B2A] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Method Selector */}
          <div className="bg-[#0D281C]/90 p-2.5 rounded-xl border border-white/15 flex flex-col gap-1 min-w-0">
            <label className="text-[11px] font-bold text-white/80 flex items-center gap-1 truncate">
              <span>⚙️</span>
              <span>طريقة الحساب:</span>
            </label>
            <select
              value={settings.method}
              onChange={(e) => setMethod(e.target.value as CalculationMethod)}
              className="w-full bg-black/40 text-[#C8A85B] font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/40 focus:outline-none cursor-pointer truncate"
            >
              {Object.values(CALCULATION_METHODS).map((m) => (
                <option key={m.id} value={m.id} className="bg-[#123B2A] text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            onClose();
          }}
          className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#C8A85B] text-[#123B2A] hover:bg-[#dfc278] transition cursor-pointer shadow-md text-center shrink-0"
        >
          تم وإغلاق
        </button>
      </div>
    </div>
  );
}
