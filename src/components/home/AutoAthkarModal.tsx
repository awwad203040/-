'use client';

import { useState } from 'react';
import type { AutoAthkarSettings, VoiceThikr, ThikrCategory } from '@/types/athkar';
import { VOICE_ATHKAR_LIST, ATHKAR_CATEGORIES, ATHKAR_INTERVALS } from '@/lib/athkar-data';

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

  if (!isOpen) return null;

  const handleToggleCategory = (category: ThikrCategory) => {
    let nextList: ThikrCategory[];
    if (settings.activeCategories.includes(category)) {
      if (settings.activeCategories.length === 1) return; // Keep at least one
      nextList = settings.activeCategories.filter((c) => c !== category);
    } else {
      nextList = [...settings.activeCategories, category];
    }
    onUpdateSettings({ activeCategories: nextList });
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
                تذكير صوتي نقي وواضح بالصلاة على النبي ﷺ والاستغفار والتسبيح (بدون تقطيع)
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
                    تشغيل الأذكار الصوتية التلقائية
                  </h3>
                  <p className="text-xs opacity-75 mt-0.5">
                    {settings.enabled
                      ? `يعمل حالياً كل ${settings.intervalMinutes} دقيقة`
                      : 'المنبه الصوتي متوقف'}
                  </p>
                </div>
              </div>

              {/* Switch button */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
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

              {/* Categories of Athkar */}
              <div className="bg-white rounded-2xl p-4 border border-[#C8A85B]/30 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  📿 أنواع الأذكار المفعلة للنطق:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ATHKAR_CATEGORIES.map((cat) => {
                    const isActive = settings.activeCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#123B2A]/8 border-[#C8A85B] text-[#123B2A]'
                            : 'bg-black/5 border-transparent text-gray-400'
                        }`}
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </span>
                        <span className="text-sm font-bold">
                          {isActive ? '✓' : '—'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume & Chime Settings */}
              <div className="bg-white rounded-2xl p-4 border border-[#C8A85B]/30 shadow-xs space-y-4">
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
