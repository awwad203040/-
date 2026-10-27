'use client';

import { useState } from 'react';
import type { AutoAthkarSettings, VoiceThikr, ThikrCategory } from '@/types/athkar';
import { VOICE_ATHKAR_LIST, ATHKAR_CATEGORIES, ATHKAR_INTERVALS } from '@/lib/athkar-data';
import { requestNotificationPermission, showSingleThikrNotification } from '@/lib/athkar-notifications';
import {
  testNativeAthkar,
  openNativeAppSettings,
  openNativeBatterySettings,
  requestDirectBatteryExemption,
  openAutoStartSettings,
  requestNativePermissions,
} from '@/lib/athkar-native-bridge';

interface AutoAthkarModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoAthkarSettings;
  onUpdateSettings: (settings: Partial<AutoAthkarSettings>) => void;
  onTestThikr: (thikr?: VoiceThikr) => void;
  isSpeaking?: boolean;
}

export default function AutoAthkarModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onTestThikr,
  isSpeaking = false,
}: AutoAthkarModalProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'list'>('settings');
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testActive, setTestActive] = useState<boolean>(false);

  const handleTriggerTest5Sec = async () => {
    try {
      await requestNotificationPermission();
      setTestActive(true);
      setTestCountdown(5);
      testNativeAthkar(5).catch(() => {});
      const testThikr = VOICE_ATHKAR_LIST[0];
      showSingleThikrNotification(testThikr, 5).catch(() => {});

      let remaining = 5;
      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timer);
          setTestCountdown(null);
          setTestActive(false);
        } else {
          setTestCountdown(remaining);
        }
      }, 1000);
    } catch {
      setTestActive(false);
      setTestCountdown(null);
    }
  };

  if (!isOpen) return null;

  const allThikrIds = VOICE_ATHKAR_LIST.map((t) => t.id);
  const activeThikrIds: string[] = Array.isArray(settings?.activeThikrIds) && settings.activeThikrIds.length > 0
    ? settings.activeThikrIds
    : allThikrIds;

  const handleToggleThikr = (thikrId: string) => {
    let nextIds: string[];
    if (activeThikrIds.includes(thikrId)) {
      if (activeThikrIds.length === 1) return; // Keep at least one active
      nextIds = activeThikrIds.filter((id) => id !== thikrId);
    } else {
      nextIds = [...activeThikrIds, thikrId];
    }
    const correspondingCategories = Array.from(
      new Set(
        VOICE_ATHKAR_LIST.filter((t) => nextIds.includes(t.id)).map((t) => t.category)
      )
    ) as ThikrCategory[];

    onUpdateSettings({
      activeThikrIds: nextIds,
      activeCategories: correspondingCategories,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="fixed inset-x-3 top-6 bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-50 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[#C8A85B]/50"
        style={{ backgroundColor: '#FBF8EF', color: '#17231D' }}
        dir="rtl"
      >
        {/* Header */}
        <header
          className="px-6 py-4 flex items-center justify-between shadow-xs shrink-0"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C8A85B]/20 flex items-center justify-center text-xl">
              🔔
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                الأذكار الصوتية التلقائية
              </h2>
              <p className="text-xs opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تذكير صوتي ندي بالتسبيح والتوحيد والحوقلة والصلاة على النبي ﷺ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#C8A85B]/30 bg-white/70 px-4 shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className="flex-1 py-3 text-xs md:text-sm font-bold transition-all text-center border-b-2"
            style={{
              borderColor: activeTab === 'settings' ? '#123B2A' : 'transparent',
              color: activeTab === 'settings' ? '#123B2A' : '#17231D70',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            ⚙️ إعدادات التنبيه والفترات
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className="flex-1 py-3 text-xs md:text-sm font-bold transition-all text-center border-b-2"
            style={{
              borderColor: activeTab === 'list' ? '#123B2A' : 'transparent',
              color: activeTab === 'list' ? '#123B2A' : '#17231D70',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            📜 قائمة الأذكار الصوتية ({VOICE_ATHKAR_LIST.length})
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          {/* Main Master Switch Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              settings.enabled
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-black/5 border-black/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{settings.enabled ? '🟢' : '⚪'}</span>
                <div>
                  <h3 className="font-bold text-sm text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    تشغيل الأذكار التلقائية
                  </h3>
                  <p className="text-xs opacity-75 mt-0.5">
                    {settings.enabled
                      ? `يعمل حالياً كل ${settings.intervalMinutes} دقيقة (حتى عند إغلاق التطبيق)`
                      : 'المنبه متوقف'}
                  </p>
                </div>
              </div>

              {/* Switch button */}
              <button
                type="button"
                onClick={async () => {
                  const nextVal = !settings.enabled;
                  if (nextVal) {
                    await requestNotificationPermission();
                  }
                  onUpdateSettings({ enabled: nextVal });
                }}
                className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer ${
                  settings.enabled ? 'bg-[#0B5B43]' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={settings.enabled}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    settings.enabled ? 'right-7' : 'right-1'
                  }`}
                />
              </button>
            </div>

            {/* Background Notification Status Banner */}
            {settings.enabled && (
              <div className="mt-3 pt-2.5 border-t border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#0B5B43] font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>🔔</span>
                    <span>التنبيهات تعمل بالصوت في الخلفية ووضع السكون</span>
                  </span>
                  <span className="bg-emerald-600/15 text-[#0B5B43] px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    تعمل باستمرار ✓
                  </span>
                </div>
                <div className="text-[10px] text-emerald-800/80 bg-emerald-500/10 p-2.5 rounded-xl leading-relaxed space-y-1">
                  <div>💡 <strong>لضمان عمل الأذكار والتطبيق مغلق تماماً:</strong></div>
                  <div>• تأكد من ضبط بطارية التطبيق على <strong>«غير مقيد / Unrestricted»</strong> في إعدادات الجوال.</div>
                  <div>• تأكد من السماح بإذن <strong>«التنبيهات والتذكيرات / Alarms &amp; Reminders»</strong>.</div>
                  <div>• تأكد من رفع مستوى صوت التنبيهات والوسائط.</div>
                </div>

                {/* Instant 5-sec Test Button with Countdown */}
                <button
                  type="button"
                  onClick={handleTriggerTest5Sec}
                  disabled={testActive}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer active:scale-98 ${
                    testActive
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse'
                      : 'bg-emerald-600/15 hover:bg-emerald-600/25 text-[#0B5B43] border-emerald-500/40'
                  }`}
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  {testActive ? (
                    <span className="flex items-center gap-1.5">
                      <span>⏳</span>
                      <span>جاري العد: <strong>{testCountdown}</strong> ثوانٍ (أغلق التطبيق واقفل الشاشة الآن!)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>🔔</span>
                      <span>اضغط هنا لتجربة تنبيه فوري بعد 5 ثوانٍ (ثم أغلق التطبيق للتجربة)</span>
                    </span>
                  )}
                </button>

                {testActive && (
                  <div className="p-3 rounded-xl bg-amber-100 border border-amber-400 text-amber-950 text-xs font-bold text-center leading-relaxed shadow-sm">
                    ⚡ تم تفعيل التنبيه بنجاح! <strong>أغلق التطبيق الآن فوراً واقفل شاشة الجوال</strong>، وسيصدح صوت الذكر بعد {testCountdown} ثوانٍ بإذن الله.
                  </div>
                )}

                {/* Background & Auto-Start Helper Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚡</span>
                    <div className="text-[11px] leading-relaxed">
                      <strong className="block text-amber-950 font-bold mb-0.5">خطوة هامة لعمل الأذكار في الخلفية والسكون:</strong>
                      تأكد من تفعيل <strong>التشغيل التلقائي (Auto-start)</strong> واستثناء التطبيق من تحسين البطارية، ليصدح الذكر والأذان حتى لو كان التطبيق مغلقاً تماماً والجوال في وضع السكون.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => requestDirectBatteryExemption()}
                      className="py-1.5 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      🔋 استثناء البطارية المباشر
                    </button>
                    <button
                      type="button"
                      onClick={() => openAutoStartSettings()}
                      className="py-1.5 px-2 rounded-lg bg-[#123B2A] hover:bg-[#0e2c20] text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      🚀 تفعيل التشغيل التلقائي
                    </button>
                  </div>
                </div>

                {/* Quick Phone Settings Openers */}
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openNativeAppSettings()}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-gray-50 text-[#123B2A] text-[10px] font-bold border border-[#C8A85B]/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    ⚙️ فتح إعدادات التطبيق بالجوال
                  </button>
                  <button
                    type="button"
                    onClick={() => openNativeBatterySettings()}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-gray-50 text-[#123B2A] text-[10px] font-bold border border-[#C8A85B]/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    🔋 إعدادات البطارية بالجوال
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'settings' && (
            <>
              {/* Interval Selection Card */}
              <div className="bg-white rounded-2xl p-4 border border-[#C8A85B]/30 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  ⏱️ التكرار الزمني (كل كم ينطق الذكر؟):
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ATHKAR_INTERVALS.map((item) => {
                    const isSelected = settings.intervalMinutes === item.minutes;
                    return (
                      <button
                        key={item.minutes}
                        type="button"
                        onClick={() => onUpdateSettings({ intervalMinutes: item.minutes })}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                          isSelected
                            ? 'bg-[#123B2A] text-[#C8A85B] border-[#123B2A] shadow-xs'
                            : 'bg-[#FBF8EF] text-[#123B2A] border-[#C8A85B]/30 hover:bg-[#C8A85B]/15'
                        }`}
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* New Athkar with Tashkeel & Male Voice - Placed directly here as requested */}
              <div className="bg-white rounded-2xl p-4 border border-[#C8A85B]/30 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    📿 الأذكار المفعلة للنطق (بصوت رجل):
                  </label>
                  <span className="text-[11px] text-[#0B5B43] font-bold">
                    {activeThikrIds.length} من {VOICE_ATHKAR_LIST.length} مفعلة
                  </span>
                </div>

                <div className="space-y-2">
                  {VOICE_ATHKAR_LIST.map((thikr) => {
                    const isActive = activeThikrIds.includes(thikr.id);
                    return (
                      <div
                        key={thikr.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          isActive
                            ? 'bg-[#123B2A]/5 border-[#C8A85B] shadow-xs'
                            : 'bg-black/5 border-transparent opacity-60'
                        }`}
                      >
                        {/* Checkbox and Text */}
                        <button
                          type="button"
                          onClick={() => handleToggleThikr(thikr.id)}
                          className="flex items-center gap-2.5 flex-1 text-right cursor-pointer"
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isActive
                                ? 'bg-[#123B2A] text-[#C8A85B]'
                                : 'bg-gray-200 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span
                            className="font-bold text-sm text-[#123B2A] leading-relaxed"
                            style={{ fontFamily: "'Amiri', serif" }}
                            dir="rtl"
                          >
                            • {thikr.textDisplay}
                          </span>
                        </button>

                        {/* Test Male Voice Button */}
                        <button
                          type="button"
                          onClick={() => onTestThikr(thikr)}
                          disabled={isSpeaking}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#C8A85B]/20 text-[#123B2A] hover:bg-[#C8A85B]/35 transition-colors flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                          style={{ fontFamily: "'Tajawal', sans-serif" }}
                          title="استمع لصوت الرجل"
                        >
                          <span>🔊</span>
                          <span>استماع</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Volume & Chime Settings */}
              <div className="bg-white rounded-2xl p-4 border border-[#C8A85B]/30 shadow-xs space-y-4">
                {/* Voice Gender Info */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎙️</span>
                    <div>
                      <span className="text-xs font-bold text-[#123B2A] block" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                        صوت الأذكار:
                      </span>
                      <span className="text-[11px] text-[#0B5B43] font-bold">
                        صوت رجل وقور (فصيح وهادئ بدون تقطيع)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
                    رجل ✓
                  </span>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      🔊 مستوى صوت الذكر:
                    </span>
                    <span className="text-xs font-bold text-[#C8A85B]">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value) })}
                    className="w-full accent-[#123B2A] cursor-pointer"
                  />
                </div>

                {/* Chime toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span>🎵</span>
                    <span className="text-xs font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      نغمة تنبيه هادئة قبل الذكر
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ playChime: !settings.playChime })}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.playChime ? 'bg-[#0B5B43]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-all absolute top-1 ${
                        settings.playChime ? 'right-5' : 'right-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'list' && (
            <div className="space-y-2.5">
              {VOICE_ATHKAR_LIST.map((thikr) => (
                <div
                  key={thikr.id}
                  className="bg-white p-4 rounded-2xl border border-[#C8A85B]/30 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
                        {thikr.categoryName}
                      </span>
                    </div>
                    <p
                      className="text-base font-bold text-[#123B2A] leading-relaxed"
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      {thikr.textDisplay}
                    </p>
                    <p className="text-[11px] opacity-70 mt-1" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      {thikr.virtue}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTestThikr(thikr)}
                    className="p-3 rounded-xl bg-[#123B2A] text-[#C8A85B] hover:bg-[#0B5B43] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 flex-shrink-0"
                    title="استمع لنطق هذا الذكر"
                  >
                    <span>🔊</span>
                    <span className="text-xs font-bold hidden sm:inline" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      استمع
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <footer
          className="p-4 border-t border-[#C8A85B]/30 flex items-center justify-between gap-3 bg-white shrink-0"
        >
          {/* Quick Test Pronunciation Button */}
          <button
            type="button"
            onClick={() => onTestThikr()}
            disabled={isSpeaking}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            <span>{isSpeaking ? '🔊 جاري النطق...' : '🎙️ جرّب نطق ذكر الآن'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-6 rounded-2xl font-bold text-xs md:text-sm bg-[#123B2A] text-white hover:bg-[#0B5B43] transition-all shadow-xs cursor-pointer active:scale-95"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            حفظ وإغلاق
          </button>
        </footer>
      </div>
    </>
  );
}
