'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DownloadPage() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    // Automatically trigger APK download after 1.5 seconds
    const timer = setTimeout(() => {
      setDownloadStarted(true);
      const link = document.createElement('a');
      link.href = '/api/download-apk';
      link.download = 'Noor-AlQuran.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleManualDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/api/download-apk';
    link.download = 'Noor-AlQuran.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 text-center select-none"
      style={{
        backgroundColor: '#0D281C',
        color: '#FBF8EF',
        fontFamily: "'Tajawal', sans-serif",
      }}
      dir="rtl"
    >
      <div className="w-full max-w-md bg-[#123B2A] border-2 border-[#C8A85B] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-5">
        {/* App Logo */}
        <div className="relative">
          <img
            src="/logo.png"
            alt="شعار نور القرآن"
            className="w-24 h-24 rounded-3xl border-3 border-[#C8A85B] shadow-xl object-cover"
          />
          <div className="absolute -bottom-2 -right-2 bg-[#C8A85B] text-[#123B2A] rounded-full p-1.5 shadow-md">
            <span className="text-sm">✨</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#F7EED8]" style={{ fontFamily: "'Amiri', serif" }}>
            تطبيق نُور القُرآن
          </h1>
          <p className="text-xs text-[#C8A85B] font-medium">
            المصحف الشريف • تلاوات المشايخ • الأذكار الصوتية في الخلفية
          </p>
        </div>

        {/* Download Status Alert */}
        <div className="w-full bg-black/30 border border-[#C8A85B]/30 rounded-2xl p-4 flex flex-col items-center gap-2">
          {downloadStarted ? (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="text-xl">✅</span>
              <span>بدأ تنزيل التطبيق الآن على جوالك!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#C8A85B] font-bold text-sm animate-pulse">
              <div className="w-4 h-4 border-2 border-[#C8A85B] border-t-transparent rounded-full animate-spin" />
              <span>جاري بدء التنزيل التلقائي خلال ({countdown}) ثوانٍ...</span>
            </div>
          )}
          <p className="text-[11px] text-white/70">
            ملف APK الرسمي المحدث لأجهزة الأندرويد
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={handleManualDownload}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 active:scale-98 transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="text-lg">📥</span>
            <span>اضغط هنا إذا لم يبدأ التنزيل تلقائياً</span>
          </button>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 text-white/90 border border-white/15 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📖</span>
            <span>أو تصفح التطبيق مباشرة عبر المتصفح</span>
          </Link>
        </div>

        {/* Easy 3-Step Guide */}
        <div className="w-full bg-[#0D281C] p-4 rounded-2xl border border-white/10 text-right space-y-2 text-xs">
          <p className="font-bold text-[#C8A85B] flex items-center gap-1.5">
            <span>📲</span>
            <span>خطوات التثبيت بعد انتهاء التحميل:</span>
          </p>
          <div className="space-y-1.5 text-white/80 pr-1 text-[11px] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#C8A85B]">1.</span>
              <span>اسحب شريط الإشعارات واضغط على الملف المكتمل: <strong>Noor-AlQuran.apk</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#C8A85B]">2.</span>
              <span>اضغط على <strong>«تثبيت» (Install)</strong> ثم <strong>«فتح» (Open)</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-[#C8A85B]">3.</span>
              <span>سيتم حفظ كل تقدمك في المصحف وتعمل الأذكار الصوتية في الخلفية تلقائياً!</span>
            </div>
          </div>
        </div>

        {/* Footer Dedication */}
        <div className="text-[10px] text-white/40 pt-2 border-t border-white/10 w-full">
          صدقة جارية لوالديَّ رحمهما الله ولجميع المسلمين
        </div>
      </div>
    </div>
  );
}
