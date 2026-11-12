'use client';

import { useState } from 'react';
import {
  openNativeBatterySettings,
  openNativeAutoStartSettings,
  playTestNativeUnlockSalawat,
  startNativeUnlockService,
} from '@/lib/adhan-native-bridge';
import { triggerHaptic } from '@/lib/accessibility';

interface BackgroundTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackgroundTroubleshootModal({
  isOpen,
  onClose,
}: BackgroundTroubleshootModalProps) {
  const [testPlaying, setTestPlaying] = useState(false);
  const [serviceStarted, setServiceStarted] = useState(false);

  if (!isOpen) return null;

  const handleTestSalawat = async () => {
    triggerHaptic('tap');
    setTestPlaying(true);
    await playTestNativeUnlockSalawat();
    setTimeout(() => setTestPlaying(false), 4000);
  };

  const handleOpenBattery = async () => {
    triggerHaptic('tap');
    await openNativeBatterySettings();
  };

  const handleOpenAutoStart = async () => {
    triggerHaptic('tap');
    await openNativeAutoStartSettings();
  };

  const handleStartService = async () => {
    triggerHaptic('tap');
    await startNativeUnlockService();
    setServiceStarted(true);
    setTimeout(() => setServiceStarted(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-[#C8A85B] max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #FFFDF8 0%, #F8F2E2 50%, #EFE4C8 100%)',
          color: '#123B2A',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#C8A85B]/40">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl filter drop-shadow">⚠️</span>
            <div>
              <h2
                className="text-lg sm:text-xl font-black text-[#123B2A]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                التطبيق لا يعمل في الخلفية؟
              </h2>
              <p
                className="text-xs text-[#7A5C1E] font-bold"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                حل مشكلة نطق (صلي على النبي محمد) والآذان عند قفل الجوال
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#123B2A]/10 hover:bg-[#123B2A]/20 text-[#123B2A] flex items-center justify-center font-bold text-sm transition"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Explain why Xiaomi/Samsung/Huawei/etc. close background apps */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4 text-xs text-[#7A5C1E] space-y-1.5 leading-relaxed font-medium">
          <p className="font-black text-[#123B2A] text-sm">
            💡 كيف يعمل التطبيق مثل تطبيق الشفيع تماماً؟
          </p>
          <p>
            أنظمة الجوالات الحديثة (خاصة سامسونج، شاومي Redmi/POCO، هواوي، أوبو، ريلمي، فيفو) تقوم بإيقاف التطبيقات في الخلفية لتوفير البطارية. لضمان تشغيل صوت <strong>(صلي على النبي محمد)</strong> فور فتح الجوال حتى وإن كان التطبيق مغلقاً:
          </p>
        </div>

        {/* Action Steps */}
        <div className="space-y-3">
          {/* Step 1: Battery Exemption */}
          <div className="bg-white/90 rounded-2xl p-3.5 border border-[#C8A85B]/50 shadow-2xs">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#123B2A] text-[#FFD700] text-xs font-black flex items-center justify-center">
                  1
                </span>
                <span className="text-sm font-black text-[#123B2A]">
                  إلغاء قيود البطارية (غير مقيد)
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                خطوة أساسية
              </span>
            </div>
            <p className="text-xs text-[#7A5C1E] mb-3 leading-normal">
              اختر خيار <strong>(غير مقيد / No restrictions)</strong> أو اضغط سماح ليعمل التطبيق في الخلفية 24 ساعة.
            </p>
            <button
              type="button"
              onClick={handleOpenBattery}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#123B2A] to-[#1e543e] text-[#F7EED8] hover:brightness-110 active:scale-98 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition border border-[#C8A85B]"
            >
              <span>⚡</span>
              <span>فتح إعدادات تحسين البطارية</span>
            </button>
          </div>

          {/* Step 2: Auto-Start */}
          <div className="bg-white/90 rounded-2xl p-3.5 border border-[#C8A85B]/50 shadow-2xs">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#123B2A] text-[#FFD700] text-xs font-black flex items-center justify-center">
                  2
                </span>
                <span className="text-sm font-black text-[#123B2A]">
                  تفعيل التشغيل التلقائي (Auto-Start)
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                شاومي • سامسونج • هواوي
              </span>
            </div>
            <p className="text-xs text-[#7A5C1E] mb-3 leading-normal">
              فعّل مفتاح (التشغيل التلقائي) لنور القرآن ليعمل فور تشغيل الجوال تلقائياً بدون فتحه يدوياً.
            </p>
            <button
              type="button"
              onClick={handleOpenAutoStart}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#123B2A] to-[#1e543e] text-[#F7EED8] hover:brightness-110 active:scale-98 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition border border-[#C8A85B]"
            >
              <span>🚀</span>
              <span>فتح إدارة التشغيل التلقائي بالجوال</span>
            </button>
          </div>

          {/* Step 3: Test Voice */}
          <div className="bg-white/90 rounded-2xl p-3.5 border border-[#C8A85B]/50 shadow-2xs">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#123B2A] text-[#FFD700] text-xs font-black flex items-center justify-center">
                  3
                </span>
                <span className="text-sm font-black text-[#123B2A]">
                  تجربة صوت (صلي على النبي محمد)
                </span>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                اختبار فوري
              </span>
            </div>
            <p className="text-xs text-[#7A5C1E] mb-3 leading-normal">
              اضغط للتأكد من سماع الصوت بالصوت النقي الواضح عبر مكبرات الجوال.
            </p>
            <button
              type="button"
              onClick={handleTestSalawat}
              disabled={testPlaying}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C8A85B] to-[#b3903f] text-[#123B2A] hover:brightness-105 active:scale-98 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition border border-[#123B2A]/30 cursor-pointer disabled:opacity-60"
            >
              <span>{testPlaying ? '⏳' : '🔊'}</span>
              <span>
                {testPlaying ? 'جاري نطق (صلي على النبي محمد)...' : 'تشغيل الصوت الآن للتجربة'}
              </span>
            </button>
          </div>

          {/* Step 4: Ensure Permanent Service */}
          <div className="bg-white/90 rounded-2xl p-3.5 border border-[#C8A85B]/50 shadow-2xs">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#123B2A] text-[#FFD700] text-xs font-black flex items-center justify-center">
                  4
                </span>
                <span className="text-sm font-black text-[#123B2A]">
                  تنشيط الخدمة الدائمة بشريط الإشعارات
                </span>
              </div>
            </div>
            <p className="text-xs text-[#7A5C1E] mb-3 leading-normal">
              تضمن بقاء استشعار قفل وفتح الشاشة نشطاً حتى وإن أغلقت التطبيق من شاشة التطبيقات الحديثة.
            </p>
            <button
              type="button"
              onClick={handleStartService}
              className="w-full py-2.5 px-4 rounded-xl bg-[#123B2A]/10 hover:bg-[#123B2A]/15 text-[#123B2A] border border-[#123B2A]/30 active:scale-98 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition"
            >
              <span>📿</span>
              <span>{serviceStarted ? '✓ تم تنشيط الخدمة الدائمة بنجاح!' : 'تنشيط الخدمة الدائمة الآن'}</span>
            </button>
          </div>
        </div>

        {/* Footer Close */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#123B2A] text-[#FFD700] font-black text-sm hover:brightness-110 active:scale-98 transition shadow-md border border-[#C8A85B]"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            تم • تم ضبط الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
}
