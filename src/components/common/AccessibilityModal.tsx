'use client';

import React, { useState, useEffect } from 'react';
import {
  AccessibilitySettings,
  getAccessibilitySettings,
  saveAccessibilitySettings,
  triggerHaptic,
  speakAccessibility,
  announceToScreenReader,
} from '@/lib/accessibility';
import { openNativeVoiceMatchSettings } from '@/lib/athkar-native-bridge';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilityModal({ isOpen, onClose }: AccessibilityModalProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(getAccessibilitySettings);

  useEffect(() => {
    if (isOpen) {
      setSettings(getAccessibilitySettings());
      announceToScreenReader('تم فتح نافذة إعدادات تسهيل الوصول وخدمة المكفوفين', true);
      speakAccessibility('نافذة إعدادات تسهيل الوصول وخدمة المكفوفين');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBlindMode = () => {
    const newVal = !settings.blindMode;
    const updated = saveAccessibilitySettings({
      blindMode: newVal,
      voiceGuidance: newVal ? true : settings.voiceGuidance,
      hapticFeedback: true,
    });
    setSettings(updated);
    triggerHaptic('success');
    const msg = newVal ? 'تم تفعيل وضع المكفوفين والمساعد الصوتي' : 'تم إيقاف وضع المكفوفين';
    speakAccessibility(msg, { force: true });
    announceToScreenReader(msg, true);
  };

  const handleToggleVoice = () => {
    const newVal = !settings.voiceGuidance;
    const updated = saveAccessibilitySettings({ voiceGuidance: newVal });
    setSettings(updated);
    triggerHaptic('tap');
    const msg = newVal ? 'تم تشغيل المساعد الصوتي' : 'تم إيقاف المساعد الصوتي';
    speakAccessibility(msg, { force: true });
    announceToScreenReader(msg, true);
  };

  const handleToggleHaptic = () => {
    const newVal = !settings.hapticFeedback;
    const updated = saveAccessibilitySettings({ hapticFeedback: newVal });
    setSettings(updated);
    if (newVal) {
      triggerHaptic('success');
      speakAccessibility('تم تفعيل الاهتزاز اللمسي');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#123B2A] border-2 border-[#C8A85B] rounded-2xl w-full max-w-md p-5 text-white shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8A85B]/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">🦯</span>
            <h2 id="accessibility-title" className="text-lg font-bold text-[#F7EED8]">
              تسهيل الوصول للمكفوفين
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة إعدادات المكفوفين"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Master Toggle: وضع المكفوفين */}
        <div className="bg-[#0D281C] p-3.5 rounded-xl border border-[#C8A85B]/50 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[#C8A85B] text-sm">وضع المكفوفين الشامل</span>
            <span className="text-[11px] text-white/80">
              تفعيل المساعد الصوتي الذكي والاهتزازات عند كل إجراء
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleBlindMode}
            aria-checked={settings.blindMode}
            role="switch"
            aria-label="تبديل وضع المكفوفين الشامل"
            className={`w-14 h-8 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
              settings.blindMode ? 'bg-[#C8A85B] justify-end' : 'bg-white/20 justify-start'
            }`}
          >
            <div className={`w-6 h-6 rounded-full transition-all ${settings.blindMode ? 'bg-[#123B2A]' : 'bg-white'}`} />
          </button>
        </div>

        {/* Individual Switches */}
        <div className="flex flex-col gap-2.5">
          {/* Voice Guidance Toggle */}
          <div className="bg-black/25 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔊</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">المساعد الصوتي الناطق</span>
                <span className="text-[10px] text-white/70">نطق أسماء السور، الآيات، والإجراءات</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleVoice}
              role="switch"
              aria-checked={settings.voiceGuidance}
              aria-label="المساعد الصوتي الناطق"
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                settings.voiceGuidance ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Voice Commands Toggle (نطق اسم السورة) */}
          <div className="bg-black/25 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#C8A85B]">التعرف على الأوامر الصوتية</span>
                <span className="text-[10px] text-white/70">تشغيل أي سورة بمجرد نطق اسمها بصوتك</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const newVal = !(settings.voiceCommandsEnabled ?? true);
                const updated = saveAccessibilitySettings({ voiceCommandsEnabled: newVal });
                setSettings(updated);
                triggerHaptic('tap');
                const msg = newVal ? 'تم تفعيل التعرف على الأوامر الصوتية' : 'تم إيقاف التعرف على الأوامر الصوتية';
                speakAccessibility(msg, { force: true });
                announceToScreenReader(msg, true);
              }}
              role="switch"
              aria-checked={settings.voiceCommandsEnabled ?? true}
              aria-label="التعرف على الأوامر الصوتية"
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                (settings.voiceCommandsEnabled ?? true) ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Haptic Feedback Toggle */}
          <div className="bg-black/25 p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📳</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">الاهتزاز اللمسي الذكي (Haptics)</span>
                <span className="text-[10px] text-white/70">اهتزاز خفيف لتأكيد النقر والتبديل</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHaptic}
              role="switch"
              aria-checked={settings.hapticFeedback}
              aria-label="الاهتزاز اللمسي الذكي"
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                settings.hapticFeedback ? 'bg-emerald-500 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>

        {/* Voice Match / Assistant Guide & 1-Click Setup */}
        <div className="bg-[#0A2318] p-3.5 rounded-xl border border-[#C8A85B]/40 flex flex-col gap-2.5 text-[11px] text-white/90">
          <span className="font-bold text-[#C8A85B] flex items-center gap-1.5">
            <span>🗣️</span>
            <span>الفتح الصوتي ببصمة الصوت (Hey Google):</span>
          </span>
          <p className="text-white/80 leading-relaxed">
            عندما يكون الجوال مفتوحاً، يمكنك نطق: <strong className="text-emerald-300">&ldquo;Hey Google, افتح نور القرآن&rdquo;</strong> وسيفتح التطبيق فوراً، ثم انطق اسم السورة التي تريدها ليتم تشغيلها مباشرة.
          </p>
          <button
            type="button"
            onClick={async () => {
              triggerHaptic('tap');
              speakAccessibility('جاري فتح إعدادات بصمة الصوت في هاتفك...');
              await openNativeVoiceMatchSettings();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition cursor-pointer hover:brightness-105"
          >
            <span className="text-base">🎙️</span>
            <span>تفعيل بصمة الصوت في هاتفي بنقرة واحدة (Voice Match)</span>
          </button>
        </div>

        {/* Gesture Guide for the Blind */}
        <div className="bg-[#0D281C]/80 p-3 rounded-xl border border-white/15 flex flex-col gap-2">
          <span className="text-xs font-bold text-[#C8A85B] flex items-center gap-1.5">
            <span>👆</span>
            <span>الإيماءات اللمسية السريعة:</span>
          </span>
          <div className="grid grid-cols-1 gap-1.5 text-[11px] text-white/90">
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg">
              <span className="font-bold text-emerald-300 shrink-0">النقر المزدوج (Double Tap):</span>
              <span>تشغيل أو إيقاف التلاوة فوراً</span>
            </div>
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg">
              <span className="font-bold text-emerald-300 shrink-0">السحب لليسار / لليمين:</span>
              <span>الانتقال السريع للسورة التالية أو السابقة</span>
            </div>
          </div>
        </div>

        {/* Close & Save Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('success');
            onClose();
          }}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:bg-[#dfc278] transition cursor-pointer shadow-md text-center"
        >
          تم وحفظ الإعدادات
        </button>
      </div>
    </div>
  );
}
