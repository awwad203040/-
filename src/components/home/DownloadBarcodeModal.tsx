'use client';

import Link from 'next/link';

interface DownloadBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadBarcodeModal({ isOpen, onClose }: DownloadBarcodeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="باركود تحميل تطبيق نور القرآن"
      dir="rtl"
    >
      <div
        className="relative w-full max-w-md my-auto rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-[#C8A85B] flex flex-col items-center text-center overflow-hidden flash-modal-window"
        style={{
          background: 'linear-gradient(135deg, #184E38 0%, #123B2A 60%, #0A271B 100%)',
          color: '#FBF8EF',
          fontFamily: "'Tajawal', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-3.5 left-3.5 p-2 rounded-full hover:bg-white/10 transition cursor-pointer text-white/80 hover:text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center gap-1 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A85B]/20 border border-[#C8A85B] flex items-center justify-center text-2xl shadow-inner">
            📲
          </div>
          <h2
            className="text-xl sm:text-2xl font-bold text-[#F7EED8] mt-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            باركود تحميل تطبيق نور القرآن
          </h2>
          <p className="text-xs text-[#C8A85B] max-w-xs leading-relaxed">
            امسح الباركود بكاميرا أي جوال للتحميل الفوري، أو اضغط عليه مباشرة
          </p>
        </div>

        {/* Barcode Frame */}
        <div className="my-2 p-3 bg-white rounded-2xl border-3 border-[#C8A85B] shadow-xl flex items-center justify-center">
          <a
            href="/Noor-AlQuran.apk"
            download="Noor-AlQuran.apk"
            title="اضغط لتحميل ملف APK مباشرة"
            className="block hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer"
          >
            <img
              src="/noor-download-qr.png"
              alt="باركود تحميل تطبيق نور القرآن"
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
            />
          </a>
        </div>

        <p className="text-[11px] text-[#C8A85B] mt-1 mb-4 font-medium">
          💡 ملف APK الأصلي المحدث لجميع أجهزة الأندرويد
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <a
            href="/Noor-AlQuran.apk"
            download="Noor-AlQuran.apk"
            className="w-full py-3 px-4 rounded-xl font-extrabold text-sm bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] hover:brightness-105 active:scale-98 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📥</span>
            <span>تحميل ملف التطبيق (APK)</span>
          </a>

          <Link
            href="/download"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🌐</span>
            <span>فتح صفحة التنزيل والمساعدة</span>
          </Link>
        </div>

        {/* Footer Dedication */}
        <div className="mt-4 pt-3 border-t border-[#C8A85B]/30 text-[10px] text-white/60">
          صدقة جارية لوالديَّ رحمهما الله ولجميع المسلمين
        </div>
      </div>
    </div>
  );
}
