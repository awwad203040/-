'use client';

import { useState, useMemo } from 'react';
import { SURAH_METADATA } from '@/lib/quran-meta';

interface MultiSurahLoopModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSurahs: number[];
  isMultiSurahLoop: boolean;
  onSave: (surahs: number[], enabled: boolean) => void;
  onStartPlayback?: (firstSurahNumber: number) => void;
  currentPlayingSurah?: number;
}

export default function MultiSurahLoopModal({
  isOpen,
  onClose,
  selectedSurahs,
  isMultiSurahLoop,
  onSave,
  onStartPlayback,
  currentPlayingSurah,
}: MultiSurahLoopModalProps) {
  const [selectedList, setSelectedList] = useState<number[]>(selectedSurahs || []);
  const [isEnabled, setIsEnabled] = useState<boolean>(isMultiSurahLoop);
  const [searchQuery, setSearchQuery] = useState('');

  const allSurahs = useMemo(() => Object.values(SURAH_METADATA), []);

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return allSurahs;
    const q = searchQuery.trim().toLowerCase();
    return allSurahs.filter(
      (s) =>
        s.name.includes(q) ||
        s.number.toString().includes(q) ||
        (s.englishName && s.englishName.toLowerCase().includes(q))
    );
  }, [allSurahs, searchQuery]);

  if (!isOpen) return null;

  const toggleSurah = (surahNum: number) => {
    if (selectedList.includes(surahNum)) {
      setSelectedList(selectedList.filter((n) => n !== surahNum));
    } else {
      setSelectedList([...selectedList, surahNum].sort((a, b) => a - b));
    }
  };

  const handleApplyPreset = (surahNumbers: number[]) => {
    setSelectedList(surahNumbers);
    setIsEnabled(true);
  };

  const handleSave = (startNow = false) => {
    const enabled = isEnabled && selectedList.length > 0;
    onSave(selectedList, enabled);
    if (startNow && selectedList.length > 0 && onStartPlayback) {
      // Start with first selected surah or current if already in list
      const target =
        currentPlayingSurah && selectedList.includes(currentPlayingSurah)
          ? currentPlayingSurah
          : selectedList[0];
      onStartPlayback(target);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs transition-opacity"
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
              🔁
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تكرار مجموعة سور
              </h2>
              <p className="text-xs opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                حدد عدة سور لتكرار الاستماع إليها بالتتابع بصوت القارئ
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

        {/* Master Toggle Banner */}
        <div className="px-5 py-3 border-b border-[#C8A85B]/30 bg-white/80 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{isEnabled && selectedList.length > 0 ? '🟢' : '⚪'}</span>
            <div>
              <div className="text-xs md:text-sm font-bold text-[#123B2A]">
                تفعيل تكرار السور المحددة
              </div>
              <div className="text-[11px] text-[#17231D]/70">
                {selectedList.length > 0
                  ? `سيتم تكرار ${selectedList.length} سور بالتتابع عند انتهاء كل سورة`
                  : 'حدد سورة أو أكثر أدناه للتكرار'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
              isEnabled ? 'bg-[#0B5B43]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                isEnabled ? 'right-5' : 'right-1'
              }`}
            />
          </button>
        </div>

        {/* Quick Selection Presets */}
        <div className="px-5 py-2.5 bg-[#123B2A]/5 border-b border-[#C8A85B]/20 shrink-0">
          <div className="text-[11px] font-bold text-[#123B2A] mb-1.5">⚡ مجموعات سريعة جاهزة:</div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleApplyPreset([112, 113, 114])}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#C8A85B]/40 text-[#123B2A] font-bold hover:bg-[#C8A85B]/20 transition-colors cursor-pointer text-[11px]"
            >
              ✨ المعوذات والإخلاص (3)
            </button>
            <button
              type="button"
              onClick={() => {
                const qisar = [];
                for (let i = 93; i <= 114; i++) qisar.push(i);
                handleApplyPreset(qisar);
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#C8A85B]/40 text-[#123B2A] font-bold hover:bg-[#C8A85B]/20 transition-colors cursor-pointer text-[11px]"
            >
              🌿 قصار السور (الضحى للناس - 22)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset([18, 62])}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#C8A85B]/40 text-[#123B2A] font-bold hover:bg-[#C8A85B]/20 transition-colors cursor-pointer text-[11px]"
            >
              🕌 الكهف والجمعة (2)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset([36, 56, 67])}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#C8A85B]/40 text-[#123B2A] font-bold hover:bg-[#C8A85B]/20 transition-colors cursor-pointer text-[11px]"
            >
              ⭐ يس والواقعة والملك (3)
            </button>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedList([])}
                className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 transition-colors cursor-pointer text-[11px]"
              >
                ✕ مسح التحديد ({selectedList.length})
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white/50 border-b border-[#C8A85B]/20 shrink-0">
          <input
            type="text"
            placeholder="🔍 ابحث عن سورة بالاسم أو الرقم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-[#C8A85B]/30 bg-white text-xs text-[#123B2A] focus:outline-hidden focus:border-[#123B2A]"
          />
        </div>

        {/* Surah List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {filteredSurahs.map((surah) => {
            const isSelected = selectedList.includes(surah.number);
            return (
              <button
                key={surah.number}
                type="button"
                onClick={() => toggleSurah(surah.number)}
                className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-right ${
                  isSelected
                    ? 'bg-[#123B2A]/10 border-[#C8A85B] shadow-xs'
                    : 'bg-white border-[#C8A85B]/20 hover:bg-[#C8A85B]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#123B2A] text-[#C8A85B]'
                        : 'bg-gray-200 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <div>
                    <span className="font-bold text-sm text-[#123B2A]" style={{ fontFamily: "'Amiri', serif" }}>
                      {surah.number}. سورة {surah.name}
                    </span>
                    <span className="text-[11px] text-[#17231D]/60 mr-2">
                      ({surah.versesCount} آية - {surah.revelationPlace === 'makkah' ? 'مكية' : 'مدنية'})
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span className="text-[11px] font-bold text-[#0B5B43] bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    ضمن التكرار
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <footer className="p-4 bg-white border-t border-[#C8A85B]/30 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-[#123B2A]">
            المحدد للتكرار: <span className="text-[#C8A85B] text-sm">{selectedList.length}</span> سورة
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FBF8EF] text-[#123B2A] border border-[#C8A85B]/40 hover:bg-[#C8A85B]/20 transition-all cursor-pointer"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={selectedList.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                selectedList.length > 0
                  ? 'bg-[#123B2A] text-[#C8A85B] hover:bg-[#1a4f38]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>▶</span>
              <span>بدء تشغيل وتكرار السور</span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
