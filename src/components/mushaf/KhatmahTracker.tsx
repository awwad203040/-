'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Khatmah, DailyWird } from '@/types/quran';
import {
  getKhatmah,
  saveKhatmah,
  deleteKhatmah,
  getDailyWird,
  getReadingProgress,
} from '@/lib/storage';

export default function KhatmahTracker() {
  const router = useRouter();
  const [khatmah, setKhatmah] = useState<Khatmah | null>(null);
  const [wird, setWird] = useState<DailyWird | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [targetDays, setTargetDays] = useState(30);
  const [customDays, setCustomDays] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const k = getKhatmah();
    setKhatmah(k);
    setWird(getDailyWird());
  };

  const handleStartKhatmah = (days: number) => {
    const readingProgress = getReadingProgress();
    const startPage = readingProgress?.pageNumber || 1;
    const newKhatmah: Khatmah = {
      id: Date.now().toString(),
      startDate: new Date().toISOString(),
      targetDays: days,
      startPage,
      currentPage: startPage,
      completed: false,
    };
    saveKhatmah(newKhatmah);
    setKhatmah(newKhatmah);
    setIsEditing(false);
  };

  const handleResetKhatmah = () => {
    if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط أو إنهاء الختمة الحالية؟')) {
      deleteKhatmah();
      setKhatmah(null);
      setIsEditing(false);
    }
  };

  // Calculations
  const currentPage = khatmah?.currentPage || 1;
  const progressPercent = Math.min(100, Math.round((currentPage / 604) * 1000) / 10);
  const remainingPages = Math.max(0, 604 - currentPage);

  let daysPassed = 1;
  let daysRemaining = targetDays;
  if (khatmah?.startDate) {
    const startMs = new Date(khatmah.startDate).getTime();
    const nowMs = Date.now();
    daysPassed = Math.max(1, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
    daysRemaining = Math.max(0, (khatmah.targetDays || 30) - daysPassed + 1);
  }

  const dailyTarget = khatmah ? Math.ceil(604 / khatmah.targetDays) : 20;
  const todayRead = wird?.pagesRead || 0;
  const todayRemaining = Math.max(0, dailyTarget - todayRead);

  // If no Khatmah or editing
  if (!khatmah || isEditing) {
    return (
      <div className="p-5 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#C8A85B]/30 text-center">
          <div className="text-4xl mb-3">📖</div>
          <h2
            className="text-2xl font-bold mb-2 text-[#123B2A]"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            خطة ختم القرآن الكريم
          </h2>
          <p
            className="text-sm opacity-75 mb-6 text-[#17231D]"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            حدد المدة المستهدفة لختم المصحف الشريف وسيقوم التطبيق بحساب وردك اليومي ومتابعة تقدمك تلقائياً.
          </p>

          {/* Quick choices */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { days: 15, label: '15 يوماً', sub: 'حزبان يومياً (~40 صفحة)' },
              { days: 30, label: '30 يوماً', sub: 'جزء يومياً (~20 صفحة)' },
              { days: 60, label: '60 يوماً', sub: 'نصف جزء (~10 صفحات)' },
            ].map((choice) => (
              <button
                key={choice.days}
                onClick={() => setTargetDays(choice.days)}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${
                  targetDays === choice.days
                    ? 'border-[#C8A85B] bg-[#123B2A] text-white shadow-md'
                    : 'border-[#123B2A]/10 bg-white text-[#123B2A] hover:border-[#C8A85B]/50'
                }`}
              >
                <div className="font-bold text-base" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  {choice.label}
                </div>
                <div className="text-[11px] opacity-75 mt-1 leading-tight" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  {choice.sub}
                </div>
              </button>
            ))}
          </div>

          {/* Custom days */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="text-sm text-[#17231D]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              أو حدد أيام مخصصة:
            </span>
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                const d = parseInt(e.target.value, 10);
                if (!isNaN(d) && d > 0) setTargetDays(d);
              }}
              placeholder="مثال: 40"
              className="w-24 px-3 py-2 rounded-xl border border-[#C8A85B] text-center text-sm font-bold text-[#123B2A]"
            />
          </div>

          <button
            onClick={() => handleStartKhatmah(targetDays)}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-md active:scale-[0.98]"
            style={{
              backgroundColor: '#123B2A',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            ابدأ الختمة الآن ({targetDays} يوماً)
          </button>

          {khatmah && (
            <button
              onClick={() => setIsEditing(false)}
              className="mt-3 text-sm text-[#123B2A]/70 underline"
            >
              إلغاء والعودة للختمة الحالية
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active Khatmah View
  return (
    <div className="p-5 max-w-xl mx-auto space-y-4">
      {/* Primary Card */}
      <div
        className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #123B2A 0%, #0B5B43 100%)',
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#C8A85B]/25 text-[#C8A85B] font-bold">
              ختمة نشطة • {khatmah.targetDays} يوماً
            </span>
            <h2 className="text-2xl font-bold mt-2" style={{ fontFamily: "'Amiri', serif" }}>
              رفيق الختمة المباركة
            </h2>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            aria-label="تعديل الختمة"
            className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="opacity-80">الصفحة {currentPage} من 604</span>
            <span className="font-bold text-[#C8A85B]" dir="ltr">
              {progressPercent}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/15">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: '#C8A85B',
              }}
            />
          </div>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-3 gap-3 text-center mb-6">
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-lg font-bold text-[#C8A85B]">{remainingPages}</div>
            <div className="text-xs opacity-75 mt-0.5">صفحة متبقية</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-lg font-bold text-[#C8A85B]">{daysRemaining}</div>
            <div className="text-xs opacity-75 mt-0.5">يوماً متبقياً</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <div className="text-lg font-bold text-[#C8A85B]">{dailyTarget}</div>
            <div className="text-xs opacity-75 mt-0.5">صفحة / يوم</div>
          </div>
        </div>

        {/* Read CTA */}
        <button
          onClick={() => router.push(`/mushaf?page=${currentPage}`)}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-md"
          style={{
            backgroundColor: '#C8A85B',
            color: '#123B2A',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#123B2A">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          اقرأ الآن — صفحة {currentPage}
        </button>
      </div>

      {/* Daily Wird Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#C8A85B]/30 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h3 className="font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              ورد اليوم
            </h3>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold ${
              todayRemaining === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {todayRemaining === 0 ? 'أنجزت ورد اليوم! 🎉' : `متبقي ${todayRemaining} صفحة`}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs opacity-75 mb-2">
          <span>المقروء اليوم: {todayRead} صفحة</span>
          <span>الهدف اليومي: {dailyTarget} صفحة</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500 bg-[#0B5B43]"
            style={{ width: `${Math.min(100, (todayRead / dailyTarget) * 100)}%` }}
          />
        </div>
      </div>

      {/* Hadith / Motivation */}
      <div className="p-4 rounded-2xl bg-[#C8A85B]/10 border border-[#C8A85B]/20 text-center">
        <p className="text-sm font-medium text-[#123B2A]" style={{ fontFamily: "'Amiri', serif" }}>
          «اقْرَؤُوا القُرْآنَ فإنَّه يَأْتي يَومَ القِيامَةِ شَفِيعًا لأَصْحابِهِ»
        </p>
        <span className="text-[11px] opacity-60 mt-1 block">رواه مسلم</span>
      </div>

      {/* Reset button */}
      <div className="text-center pt-2">
        <button
          onClick={handleResetKhatmah}
          className="text-xs text-red-600/70 hover:text-red-700 transition-colors"
        >
          إنهاء أو حذف هذه الختمة
        </button>
      </div>
    </div>
  );
}
