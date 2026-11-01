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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-[#123B2A] border-2 border-[#C8A85B] rounded-2xl sm:rounded-3xl w-full max-w-lg p-3 sm:p-4 text-white shadow-2xl flex flex-col gap-2 sm:gap-2.5 max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Tajawal', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8A85B]/30 pb-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕌</span>
            <div className="flex items-baseline gap-2">
              <h2 id="prayer-times-title" className="text-base sm:text-lg font-bold text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                مواقيت الصلاة
              </h2>
              <span className="text-[10px] sm:text-[11px] text-[#C8A85B]">
                {prayerData.cityName} • {prayerData.hijriDate}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة مواقيت الصلاة"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Location & GPS Bar */}
        <div className="bg-[#0D281C] px-2.5 py-1.5 rounded-xl border border-[#C8A85B]/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">📍</span>
            <span className="text-xs font-bold text-white truncate">
              {prayerData.cityName}
            </span>
            <span className="text-[9px] text-white/60 shrink-0">
              ({settings.useGps ? 'GPS تلقائي' : 'يدوي'})
            </span>
          </div>

          <button
            type="button"
            onClick={requestGpsLocation}
            disabled={isGpsLoading}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#C8A85B] to-[#dfc278] text-[#123B2A] text-[11px] font-bold flex items-center gap-1 hover:brightness-105 active:scale-95 transition cursor-pointer shadow-xs shrink-0"
          >
            {isGpsLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
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
          <div className="bg-red-950/70 border border-red-500/40 text-red-200 text-[10px] py-1 px-2 rounded-lg text-center shrink-0">
            {gpsError}
          </div>
        )}

        {/* Next Prayer Live Highlight Card */}
        <div className="bg-gradient-to-br from-[#184E38] via-[#0E3827] to-[#0A261B] px-3 py-2 rounded-xl border-2 border-[#C8A85B] shadow-md flex flex-col gap-1 shrink-0">
          {/* Top Row: Next Prayer Title & Badge */}
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-white/90 font-medium flex items-center gap-1">
              <span>⏳</span>
              <span>
                متبقي على صلاة <span className="font-extrabold text-[#C8A85B]">{prayerData.nextPrayer.name}</span>:
              </span>
            </div>
            <span className="text-[9px] bg-[#C8A85B]/25 text-[#F5D88A] px-2 py-0.5 rounded-full border border-[#C8A85B]/40 font-bold whitespace-nowrap shadow-xs">
              الصلاة القادمة
            </span>
          </div>

          {/* Countdown & Adhan Time Row */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#F7EED8] tracking-wider font-mono drop-shadow-xs" dir="ltr">
              {prayerData.nextPrayer.remainingFormatted}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-bold bg-black/35 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0">
              <span>⏰ الأذان:</span>
              <span className="font-extrabold text-white text-xs font-mono" dir="ltr">{prayerData.nextPrayer.time12}</span>
            </div>
          </div>
        </div>

        {/* Prayer Times Grid (All 6 Times in 1 Row) */}
        <div className="grid grid-cols-6 gap-1 sm:gap-1.5 shrink-0">
          {prayers.map((p) => {
            const isNext = prayerData.nextPrayer.key === p.key;
            const isAdhanActive = p.hasAdhan && settings.adhanEnabled && settings.enabledPrayers[p.key as keyof typeof settings.enabledPrayers];
            return (
              <div
                key={p.key}
                className={`flex flex-col items-center py-1.5 px-0.5 rounded-xl transition-all border text-center relative ${
                  isNext
                    ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-sm ring-2 ring-[#C8A85B]/50 font-bold'
                    : 'bg-black/25 text-white/90 border-white/10 hover:bg-black/35'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-0.5 px-0.5">
                  <span className="text-xs sm:text-sm">{p.icon}</span>
                  {p.hasAdhan ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrayerAdhan(p.key as any);
                      }}
                      className="cursor-pointer text-[10px] p-0.5 hover:scale-110 transition active:scale-95"
                      title={isAdhanActive ? `أذان ${p.name} مفعل` : `أذان ${p.name} معطل`}
                      aria-label={`تبديل أذان ${p.name}`}
                    >
                      {isAdhanActive ? '🔔' : '🔕'}
                    </button>
                  ) : (
                    <span className="text-[9px] opacity-30">─</span>
                  )}
                </div>

                <span className="text-[10px] sm:text-xs font-bold leading-tight">{p.name}</span>
                <span
                  className={`text-[9px] sm:text-[10px] font-mono font-extrabold mt-0.5 ${
                    isNext ? 'text-[#123B2A]' : 'text-[#C8A85B]'
                  }`}
                  dir="ltr"
                >
                  {p.time}
                </span>

                {isNext && (
                  <span className="text-[7px] sm:text-[8px] mt-0.5 bg-[#123B2A] text-[#C8A85B] px-1 py-0.2 rounded-full font-bold">
                    القادمة
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Adhan Sound Alert Card */}
        <div className="bg-[#0D281C] p-2.5 rounded-xl border border-[#C8A85B]/50 flex flex-col gap-1.5 shadow-sm shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">🕌</span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#F7EED8] truncate">
                  صوت الأذان (المؤذن محمد جازي)
                </span>
                <span className="text-[9px] text-white/70 truncate">
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
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center shrink-0 ${
                settings.adhanEnabled ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Test Adhan Sound Button */}
          <div className="pt-1.5 border-t border-white/10 flex items-center gap-2">
            {isTestAdhanPlaying ? (
              <button
                type="button"
                onClick={stopTestAdhan}
                className="flex-1 py-1 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs animate-pulse"
              >
                <span>⏹</span>
                <span>إيقاف صوت الأذان</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={testAdhan}
                className="flex-1 py-1 px-2.5 rounded-lg bg-[#C8A85B]/20 hover:bg-[#C8A85B]/30 text-[#C8A85B] border border-[#C8A85B]/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <span>🔊</span>
                <span>تجربة وسماع صوت الأذان</span>
              </button>
            )}
          </div>
        </div>

        {/* City & Method Selectors in 2 Columns */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {/* Manual City Selector */}
          <div className="bg-[#0D281C]/90 p-2 rounded-xl border border-white/15 flex flex-col gap-1 min-w-0">
            <label className="text-[10px] font-bold text-[#C8A85B] flex items-center gap-1 truncate">
              <span>🌍</span>
              <span>المدينة يدوياً:</span>
            </label>
            <select
              value={settings.cityId}
              onChange={(e) => selectCity(e.target.value)}
              className="w-full bg-black/40 text-white font-bold text-[11px] p-1.5 rounded-lg border border-[#C8A85B]/40 focus:outline-none cursor-pointer truncate"
            >
              {POPULAR_CITIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#123B2A] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Calculation Method Selector */}
          <div className="bg-[#0D281C]/90 p-2 rounded-xl border border-white/15 flex flex-col gap-1 min-w-0">
            <label className="text-[10px] font-bold text-white/80 flex items-center gap-1 truncate">
              <span>⚙️</span>
              <span>طريقة الحساب:</span>
            </label>
            <select
              value={settings.method}
              onChange={(e) => setMethod(e.target.value as CalculationMethod)}
              className="w-full bg-black/40 text-[#C8A85B] font-bold text-[11px] p-1.5 rounded-lg border border-[#C8A85B]/40 focus:outline-none cursor-pointer truncate"
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
          className="w-full py-2 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#dfc278] transition cursor-pointer shadow-md text-center shrink-0"
        >
          تم وإغلاق
        </button>
      </div>
    </div>
  );
}
