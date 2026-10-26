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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-[#123B2A] border-2 border-[#C8A85B] rounded-3xl w-full max-w-lg p-5 text-white shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Tajawal', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8A85B]/30 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🕌</span>
            <div>
              <h2 id="prayer-times-title" className="text-lg font-bold text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
                مواقيت الصلاة
              </h2>
              <p className="text-[11px] text-[#C8A85B]">
                {prayerData.cityName} • {prayerData.hijriDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة مواقيت الصلاة"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Location & GPS Bar */}
        <div className="bg-[#0D281C] p-3 rounded-2xl border border-[#C8A85B]/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">📍</span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {prayerData.cityName}
              </span>
              <span className="text-[10px] text-white/70">
                {settings.useGps ? 'محدد تلقائياً عبر GPS' : 'مدينة مختارة يدوياً'}
              </span>
            </div>
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
                <span>جاري التحديد...</span>
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
          <div className="bg-red-950/70 border border-red-500/40 text-red-200 text-xs p-2.5 rounded-xl text-center">
            {gpsError}
          </div>
        )}

        {/* Next Prayer Live Highlight Card */}
        <div className="bg-gradient-to-br from-[#184E38] via-[#0E3827] to-[#0A261B] p-4 rounded-2xl border-2 border-[#C8A85B] shadow-lg text-center flex flex-col items-center gap-1.5 relative overflow-hidden">
          <div className="absolute top-2 left-3 text-[10px] bg-[#C8A85B]/20 text-[#C8A85B] px-2 py-0.5 rounded-full border border-[#C8A85B]/30 font-bold">
            الصلاة القادمة
          </div>

          <div className="text-xs text-white/80 font-medium mt-1">
            متبقي على صلاة <span className="font-extrabold text-[#C8A85B] text-sm">{prayerData.nextPrayer.name}</span>:
          </div>

          <div className="text-3xl font-extrabold text-[#F7EED8] tracking-wider my-0.5 font-mono" dir="ltr">
            {prayerData.nextPrayer.remainingFormatted}
          </div>

          <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
            <span>⏰ موعد الأذان:</span>
            <span className="font-bold text-white text-sm">{prayerData.nextPrayer.time12}</span>
          </div>
        </div>

        {/* Prayer Times Grid (All 6 Times) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {prayers.map((p) => {
            const isNext = prayerData.nextPrayer.key === p.key;
            const isAdhanActive = p.hasAdhan && settings.adhanEnabled && settings.enabledPrayers[p.key as keyof typeof settings.enabledPrayers];
            return (
              <div
                key={p.key}
                className={`flex flex-col items-center p-2.5 rounded-2xl transition-all border text-center relative ${
                  isNext
                    ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-md ring-2 ring-[#C8A85B]/50 scale-102 font-bold'
                    : 'bg-black/25 text-white/90 border-white/10 hover:bg-black/35'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-0.5">
                  <span className="text-base">{p.icon}</span>
                  {p.hasAdhan ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePrayerAdhan(p.key as any);
                      }}
                      className="cursor-pointer text-[11px] p-0.5 hover:scale-110 transition active:scale-95"
                      title={isAdhanActive ? `أذان ${p.name} مفعل` : `أذان ${p.name} معطل`}
                      aria-label={`تبديل أذان ${p.name}`}
                    >
                      {isAdhanActive ? '🔔' : '🔕'}
                    </button>
                  ) : (
                    <span className="text-[10px] opacity-40">─</span>
                  )}
                </div>

                <span className="text-xs font-bold mb-0.5">{p.name}</span>
                <span
                  className={`text-xs font-mono font-extrabold ${
                    isNext ? 'text-[#123B2A]' : 'text-[#C8A85B]'
                  }`}
                  dir="ltr"
                >
                  {p.time}
                </span>

                {isNext && (
                  <span className="text-[9px] mt-1 bg-[#123B2A] text-[#C8A85B] px-1.5 py-0.2 rounded-full font-bold">
                    القادمة
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Adhan Sound Alert Card */}
        <div className="bg-[#0D281C] p-3.5 rounded-2xl border-2 border-[#C8A85B]/50 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🕌</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#F7EED8]">
                  تنبيه الأذان الصوتي التلقائي
                </span>
                <span className="text-[10px] text-white/75">
                  يرتفع صوت الأذان تلقائياً حتى والتطبيق مغلق والجوال في السكون
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleMasterAdhan}
              role="switch"
              aria-checked={settings.adhanEnabled}
              aria-label="تفعيل أو إيقاف صوت الأذان"
              className={`w-13 h-7 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                settings.adhanEnabled ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Test Adhan Sound Buttons */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-2">
            {isTestAdhanPlaying ? (
              <button
                type="button"
                onClick={stopTestAdhan}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm animate-pulse"
              >
                <span>⏹</span>
                <span>إيقاف صوت الأذان</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={testAdhan}
                className="flex-1 py-2 px-3 rounded-xl bg-[#C8A85B]/20 hover:bg-[#C8A85B]/30 text-[#C8A85B] border border-[#C8A85B]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <span>🔊</span>
                <span>تجربة وسماع صوت الأذان للتأكد</span>
              </button>
            )}
          </div>
        </div>

        {/* Manual City Selector */}
        <div className="bg-[#0D281C]/90 p-3 rounded-2xl border border-white/15 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#C8A85B] flex items-center gap-1">
            <span>🌍</span>
            <span>أو اختر مدينتك من القائمة يدوياً:</span>
          </label>
          <select
            value={settings.cityId}
            onChange={(e) => selectCity(e.target.value)}
            className="w-full bg-black/40 text-white font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/40 focus:outline-none cursor-pointer"
          >
            {POPULAR_CITIES.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#123B2A] text-white">
                {c.name} ({c.country})
              </option>
            ))}
          </select>
        </div>

        {/* Calculation Method Selector */}
        <div className="bg-[#0D281C]/90 p-3 rounded-2xl border border-white/15 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-white/80 flex items-center gap-1">
            <span>⚙️</span>
            <span>طريقة الحساب والتقويم المعتمد:</span>
          </label>
          <select
            value={settings.method}
            onChange={(e) => setMethod(e.target.value as CalculationMethod)}
            className="w-full bg-black/40 text-[#C8A85B] font-bold text-xs p-2 rounded-xl border border-[#C8A85B]/40 focus:outline-none cursor-pointer"
          >
            {Object.values(CALCULATION_METHODS).map((m) => (
              <option key={m.id} value={m.id} className="bg-[#123B2A] text-white">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            onClose();
          }}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#dfc278] transition cursor-pointer shadow-md text-center mt-1"
        >
          تم وإغلاق
        </button>
      </div>
    </div>
  );
}
