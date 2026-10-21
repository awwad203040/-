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
  const [startPageOption, setStartPageOption] = useState<'beginning' | 'current' | 'custom'>('beginning');
  const [customStartPage, setCustomStartPage] = useState<number>(1);
  const [currentReadingPage, setCurrentReadingPage] = useState<number>(1);
  const [showManualPageModal, setShowManualPageModal] = useState(false);
  const [manualPageInput, setManualPageInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const k = getKhatmah();
    setKhatmah(k);
    setWird(getDailyWird());
    const prog = getReadingProgress();
    if (prog && prog.pageNumber >= 1 && prog.pageNumber <= 604) {
      setCurrentReadingPage(prog.pageNumber < 600 ? prog.pageNumber : 1);
    }
  };

  const handleStartKhatmah = (days: number) => {
    let chosenPage = 1;
    if (startPageOption === 'beginning') {
      chosenPage = 1;
    } else if (startPageOption === 'current') {
      chosenPage = currentReadingPage > 0 && currentReadingPage <= 604 ? currentReadingPage : 1;
    } else if (startPageOption === 'custom') {
      chosenPage = Math.max(1, Math.min(604, customStartPage || 1));
    }

    const newKhatmah: Khatmah = {
      id: Date.now().toString(),
      startDate: new Date().toISOString(),
      targetDays: days,
      startPage: chosenPage,
      currentPage: chosenPage,
      completed: false,
    };
    saveKhatmah(newKhatmah);
    setKhatmah(newKhatmah);
    setIsEditing(false);
  };

  const handleUpdateKhatmahPage = (newPage: number) => {
    const valid = Math.max(1, Math.min(604, newPage));
    if (khatmah) {
      const updated: Khatmah = {
        ...khatmah,
        currentPage: valid,
        completed: valid >= 604,
      };
      saveKhatmah(updated);
      setKhatmah(updated);
    }
  };

  const handleResetKhatmah = () => {
    if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط أو إنهاء الختمة الحالية؟')) {
      deleteKhatmah();
      setKhatmah(null);
      setIsEditing(false);
    }
  };

  const handleRestartFromPage1 = () => {
    if (khatmah) {
      const reset: Khatmah = {
        ...khatmah,
        startPage: 1,
        currentPage: 1,
        completed: false,
        startDate: new Date().toISOString(),
      };
      saveKhatmah(reset);
      setKhatmah(reset);
      setIsEditing(false);
    } else {
      handleStartKhatmah(targetDays);
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

  const dailyTarget = khatmah ? Math.ceil(Math.max(1, 604 - (khatmah.startPage || 1) + 1) / (khatmah.targetDays || 30)) : 20;
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
            خطة الختمة المباركة
          </h2>
          <p
            className="text-sm opacity-75 mb-6 text-[#17231D]"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            حدد المدة المستهدفة لختم المصحف الشريف ونقطة البداية، وسيقوم التطبيق بحساب وردك اليومي ومتابعة تقدمك تلقائياً.
          </p>

          {/* Duration Choices */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-[#123B2A] mb-2 text-right">
              ١. اختر مدة الختمة:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { days: 15, label: '15 يوماً', sub: 'حزبان يومياً (~40 صفحة)' },
                { days: 30, label: '30 يوماً', sub: 'جزء يومياً (~20 صفحة)' },
                { days: 60, label: '60 يوماً', sub: 'نصف جزء (~10 صفحات)' },
              ].map((choice) => (
                <button
                  key={choice.days}
                  type="button"
                  onClick={() => setTargetDays(choice.days)}
                  className={`p-3 md:p-4 rounded-2xl border-2 transition-all text-center cursor-pointer ${
                    targetDays === choice.days
                      ? 'border-[#C8A85B] bg-[#123B2A] text-white shadow-md'
                      : 'border-[#123B2A]/10 bg-white text-[#123B2A] hover:border-[#C8A85B]/50'
                  }`}
                >
                  <div className="font-bold text-sm md:text-base" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    {choice.label}
                  </div>
                  <div className="text-[10px] md:text-[11px] opacity-75 mt-1 leading-tight" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    {choice.sub}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom days */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <span className="text-[#17231D]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                أو مدة مخصصة:
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
                placeholder="عدد الأيام"
                className="w-24 px-2 py-1.5 rounded-xl border border-[#C8A85B] text-center text-xs font-bold text-[#123B2A]"
              />
              <span className="text-[#17231D]">يوماً</span>
            </div>
          </div>

          {/* Starting Page Selector */}
          <div className="mb-6 p-4 rounded-2xl bg-[#123B2A]/5 border border-[#C8A85B]/30 text-right">
            <label className="block text-xs font-bold text-[#123B2A] mb-2.5">
              ٢. من أين تود بدء الختمة؟
            </label>
            <div className="space-y-2">
              {/* Option 1: Beginning of Quran (Default & Recommended) */}
              <button
                type="button"
                onClick={() => setStartPageOption('beginning')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                  startPageOption === 'beginning'
                    ? 'border-[#C8A85B] bg-[#123B2A] text-white font-bold shadow-xs'
                    : 'border-gray-200 bg-white text-[#17231D] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>📖</span>
                  <span>من أول المصحف الشريف (صفحة 1 - سورة الفاتحة)</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-md ${startPageOption === 'beginning' ? 'bg-[#C8A85B] text-[#123B2A]' : 'bg-gray-100'}`}>
                  الموصى به
                </span>
              </button>

              {/* Option 2: Current Reading Page if valid */}
              {currentReadingPage > 1 && currentReadingPage < 600 && (
                <button
                  type="button"
                  onClick={() => setStartPageOption('current')}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                    startPageOption === 'current'
                      ? 'border-[#C8A85B] bg-[#123B2A] text-white font-bold shadow-xs'
                      : 'border-gray-200 bg-white text-[#17231D] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🔖</span>
                    <span>المتابعة من صفحتي الحالية في القراءة (صفحة {currentReadingPage})</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md ${startPageOption === 'current' ? 'bg-[#C8A85B] text-[#123B2A]' : 'bg-gray-100'}`}>
                    صفحة {currentReadingPage}
                  </span>
                </button>
              )}

              {/* Option 3: Custom Start Page */}
              <button
                type="button"
                onClick={() => setStartPageOption('custom')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                  startPageOption === 'custom'
                    ? 'border-[#C8A85B] bg-[#123B2A] text-white font-bold shadow-xs'
                    : 'border-gray-200 bg-white text-[#17231D] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🔢</span>
                  <span>تحديد صفحة بداية معينة</span>
                </div>
                {startPageOption === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    max={604}
                    value={customStartPage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setCustomStartPage(Math.max(1, Math.min(604, v)));
                    }}
                    placeholder="رقم الصفحة"
                    className="w-20 px-2 py-1 rounded bg-[#0D281C] text-[#C8A85B] font-bold text-center border border-[#C8A85B]"
                  />
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleStartKhatmah(targetDays)}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-md active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: '#123B2A',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            ابدأ الختمة الآن ({targetDays} يوماً • تبدأ من صفحة {startPageOption === 'beginning' ? 1 : startPageOption === 'current' ? currentReadingPage : customStartPage})
          </button>

          {khatmah && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="mt-3 text-sm text-[#123B2A]/70 underline cursor-pointer"
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
      {/* If khatmah reached page 604 or completed banner */}
      {currentPage >= 604 && (
        <div className="bg-gradient-to-r from-[#123B2A] to-[#0B5B43] rounded-3xl p-5 text-white border-2 border-[#C8A85B] shadow-lg text-center">
          <div className="text-3xl mb-1">🎉</div>
          <h3 className="text-xl font-bold text-[#C8A85B] mb-1" style={{ fontFamily: "'Amiri', serif" }}>
            مبروك! وصلت إلى ختام المصحف الشريف
          </h3>
          <p className="text-xs text-white/90 mb-3" style={{ fontFamily: "'Tajawal', sans-serif" }}>
            تقبل الله طاعتك وختمتك المباركة. هل تود البدء في ختمة جديدة من أول القرآن الكريم؟
          </p>
          <button
            type="button"
            onClick={handleRestartFromPage1}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] transition cursor-pointer shadow-md"
          >
            🔄 ابدأ ختمة جديدة الآن من صفحة 1
          </button>
        </div>
      )}

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
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="تعديل الختمة"
            className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
            title="تعديل إعدادات الختمة"
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
            <span className="opacity-90 font-medium">الصفحة {currentPage} من 604</span>
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
        <div className="grid grid-cols-3 gap-3 text-center mb-5">
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

        {/* Quick Page Adjuster Row */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-black/20 border border-white/10 mb-4 text-xs">
          <button
            type="button"
            onClick={() => handleUpdateKhatmahPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition font-bold"
            title="الصفحة السابقة في الختمة"
          >
            ◀ السابقة ({Math.max(1, currentPage - 1)})
          </button>

          <button
            type="button"
            onClick={() => setShowManualPageModal(!showManualPageModal)}
            className="px-2.5 py-1.5 rounded-xl bg-[#C8A85B]/20 hover:bg-[#C8A85B]/30 text-[#C8A85B] font-bold cursor-pointer transition"
          >
            ⚙️ ضبط صفحة الختمة
          </button>

          <button
            type="button"
            onClick={() => handleUpdateKhatmahPage(currentPage + 1)}
            disabled={currentPage >= 604}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition font-bold"
            title="الصفحة التالية في الختمة"
          >
            التالية ({Math.min(604, currentPage + 1)}) ▶
          </button>
        </div>

        {/* Manual Page Selector Modal */}
        {showManualPageModal && (
          <div className="p-3 rounded-2xl bg-[#0D281C] border border-[#C8A85B]/60 mb-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#C8A85B]">انتقال يدوي لصفحة في الختمة:</span>
              <button
                type="button"
                onClick={() => setShowManualPageModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={604}
                value={manualPageInput}
                onChange={(e) => setManualPageInput(e.target.value)}
                placeholder="رقم الصفحة 1 - 604"
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold text-center border border-white/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const p = parseInt(manualPageInput, 10);
                  if (!isNaN(p) && p >= 1 && p <= 604) {
                    handleUpdateKhatmahPage(p);
                    setShowManualPageModal(false);
                    setManualPageInput('');
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-[#C8A85B] text-[#123B2A] font-bold cursor-pointer"
              >
                تحديث
              </button>
            </div>
            <div className="mt-2 text-[10px] text-white/60 text-center">
              يمكنك استخدام هذا الزر لضبط صفحتك الحالية إذا تغيرت
            </div>
          </div>
        )}

        {/* Main Read CTA */}
        <button
          type="button"
          onClick={() => router.push(`/mushaf?page=${currentPage}`)}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-md cursor-pointer hover:brightness-105"
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

      {/* Reset & Restart Buttons */}
      <div className="flex items-center justify-center gap-4 pt-1 text-xs">
        <button
          type="button"
          onClick={handleRestartFromPage1}
          className="text-[#123B2A] hover:underline cursor-pointer flex items-center gap-1 font-bold"
        >
          <span>🔄</span>
          <span>إعادة البدء من صفحة 1</span>
        </button>
        <span className="text-gray-300">•</span>
        <button
          type="button"
          onClick={handleResetKhatmah}
          className="text-red-600/80 hover:text-red-700 transition-colors cursor-pointer"
        >
          إنهاء أو حذف هذه الختمة
        </button>
      </div>
    </div>
  );
}