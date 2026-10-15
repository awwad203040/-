'use client';

import type { UserSettings } from '@/types/quran';
import { POPULAR_RECITERS } from '@/lib/quran-meta';

interface SettingsPanelProps {
  settings: UserSettings;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  onOpenReciterSelect?: () => void;
}

export default function SettingsPanel({
  settings,
  onClose,
  onUpdateSettings,
  onOpenReciterSelect,
}: SettingsPanelProps) {
  const reciterName =
    POPULAR_RECITERS.find((r) => r.id === settings.selectedReciterId)?.name || 'مشاري راشد العفاسي';
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-6 pt-4 pb-8"
        style={{ backgroundColor: '#FBF8EF', animation: 'slideUp 0.3s ease-out' }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: '#C8A85B' }} />

        <h3
          className="text-lg font-bold mb-6 text-center"
          style={{ color: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
        >
          الإعدادات
        </h3>

        {/* Font Size */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3" style={{ color: '#17231D', fontFamily: "'Tajawal', sans-serif" }}>
            حجم الخط
          </label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.max(18, settings.fontSize - 2) })}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: 'rgba(18,59,42,0.1)', color: '#123B2A' }}
              aria-label="تصغير الخط"
            >
              −
            </button>
            <span className="text-lg font-medium min-w-[3rem] text-center" style={{ color: '#123B2A' }}>
              {settings.fontSize}
            </span>
            <button
              onClick={() => onUpdateSettings({ fontSize: Math.min(48, settings.fontSize + 2) })}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: 'rgba(18,59,42,0.1)', color: '#123B2A' }}
              aria-label="تكبير الخط"
            >
              +
            </button>
            <button
              onClick={() => onUpdateSettings({ fontSize: 28 })}
              className="px-3 py-1 text-xs rounded-lg"
              style={{ backgroundColor: 'rgba(200,168,91,0.2)', color: '#C8A85B' }}
            >
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* Night Mode */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: '#17231D', fontFamily: "'Tajawal', sans-serif" }}>
            الوضع الليلي
          </span>
          <button
            onClick={() => onUpdateSettings({ nightMode: !settings.nightMode })}
            className="relative w-14 h-8 rounded-full transition-colors"
            style={{ backgroundColor: settings.nightMode ? '#C8A85B' : 'rgba(18,59,42,0.2)' }}
            role="switch"
            aria-checked={settings.nightMode}
            aria-label="الوضع الليلي"
          >
            <div
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all"
              style={{ right: settings.nightMode ? '2px' : 'calc(100% - 26px)' }}
            />
          </button>
        </div>

        {/* Reading Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3" style={{ color: '#17231D', fontFamily: "'Tajawal', sans-serif" }}>
            وضع القراءة
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onUpdateSettings({ readingMode: 'mushaf' })}
              className="py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: settings.readingMode === 'mushaf' ? '#123B2A' : 'rgba(18,59,42,0.1)',
                color: settings.readingMode === 'mushaf' ? 'white' : '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              المصحف
            </button>
            <button
              onClick={() => onUpdateSettings({ readingMode: 'verse' })}
              className="py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: settings.readingMode === 'verse' ? '#123B2A' : 'rgba(18,59,42,0.1)',
                color: settings.readingMode === 'verse' ? 'white' : '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              آية آية
            </button>
          </div>
        </div>

        {/* Reciter Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: '#17231D', fontFamily: "'Tajawal', sans-serif" }}>
            القارئ المفضل
          </label>
          <button
            type="button"
            onClick={onOpenReciterSelect}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors hover:border-[#C8A85B]"
            style={{
              backgroundColor: 'white',
              borderColor: '#C8A85B',
              color: '#17231D',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <span className="font-medium text-sm">{reciterName}</span>
            <span className="text-xs font-bold" style={{ color: '#C8A85B' }}>
              تغيير ▾
            </span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-medium text-white"
          style={{ backgroundColor: '#123B2A', fontFamily: "'Tajawal', sans-serif" }}
        >
          تم
        </button>
      </div>
    </>
  );
}
