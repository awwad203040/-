'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Verse } from '@/types/quran';
import { SURAH_METADATA, POPULAR_RECITERS } from '@/lib/quran-meta';
import RecitationCorrectionModal from '@/components/mushaf/RecitationCorrectionModal';
import { normalizeVerse } from '@/hooks/useMushafPage';

// Quick practice selections for popular verses
const POPULAR_PRACTICE_VERSES = [
  { label: 'سورة الفاتحة', verseKey: '1:1', surahNumber: 1, ayahNumber: 1 },
  { label: 'آية الكرسي', verseKey: '2:255', surahNumber: 2, ayahNumber: 255 },
  { label: 'سورة الإخلاص', verseKey: '112:1', surahNumber: 112, ayahNumber: 1 },
  { label: 'سورة الفلق', verseKey: '113:1', surahNumber: 113, ayahNumber: 1 },
  { label: 'سورة الناس', verseKey: '114:1', surahNumber: 114, ayahNumber: 1 },
  { label: 'أول سورة الملك', verseKey: '67:1', surahNumber: 67, ayahNumber: 1 },
  { label: 'أول سورة يس', verseKey: '36:1', surahNumber: 36, ayahNumber: 1 },
  { label: 'خواتيم البقرة', verseKey: '2:285', surahNumber: 2, ayahNumber: 285 },
];

export default function RecitationPracticeHub() {
  const router = useRouter();
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedAyah, setSelectedAyah] = useState<number>(1);
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  const surahMeta = SURAH_METADATA[selectedSurah] || SURAH_METADATA[1];

  // Navigation handlers for next and previous ayah
  const handleNextAyah = () => {
    if (selectedAyah < surahMeta.versesCount) {
      setSelectedAyah((prev) => prev + 1);
    } else if (selectedSurah < 114) {
      setSelectedSurah((prev) => prev + 1);
      setSelectedAyah(1);
    }
  };

  const handlePrevAyah = () => {
    if (selectedAyah > 1) {
      setSelectedAyah((prev) => prev - 1);
    } else if (selectedSurah > 1) {
      const prevSurah = selectedSurah - 1;
      const prevMeta = SURAH_METADATA[prevSurah];
      setSelectedSurah(prevSurah);
      setSelectedAyah(prevMeta.versesCount);
    }
  };

  const hasNextAyah = !(selectedSurah === 114 && selectedAyah === surahMeta.versesCount);
  const hasPrevAyah = !(selectedSurah === 1 && selectedAyah === 1);

  // Fetch the selected verse when surah or ayah changes
  useEffect(() => {
    let isCancelled = false;
    const fetchVerse = async () => {
      setIsLoadingVerse(true);
      try {
        const res = await fetch(`/api/quran/verse/${selectedSurah}:${selectedAyah}`);
        if (!res.ok) throw new Error('Verse fetch failed');
        const data = await res.json() as { verse?: Record<string, unknown> };
        if (data.verse && !isCancelled) {
          setCurrentVerse(normalizeVerse(data.verse));
        }
      } catch {
        // Fallback: If single verse fails, try fetching from chapter verses
        try {
          const res = await fetch(`/api/quran/verses/${selectedSurah}?page=1`);
          if (res.ok) {
            const data = await res.json() as { verses?: Record<string, unknown>[] };
            const v = data.verses?.find((item) => {
              const num = item.verse_number || item.verseNumber;
              return num === selectedAyah;
            });
            if (v && !isCancelled) {
              setCurrentVerse(normalizeVerse(v));
            }
          }
        } catch {
          // ignore
        }
      } finally {
        if (!isCancelled) setIsLoadingVerse(false);
      }
    };

    fetchVerse();
    return () => {
      isCancelled = true;
    };
  }, [selectedSurah, selectedAyah]);

  const handleSelectQuickVerse = (item: (typeof POPULAR_PRACTICE_VERSES)[0]) => {
    setSelectedSurah(item.surahNumber);
    setSelectedAyah(item.ayahNumber);
  };

  return (
    <div className="p-5 max-w-xl mx-auto space-y-5">
      {/* Hero Card */}
      <div
        className="rounded-3xl p-6 text-white shadow-lg relative overflow-hidden text-center"
        style={{
          background: 'linear-gradient(135deg, #123B2A 0%, #0B5B43 100%)',
        }}
      >
        <div className="w-16 h-16 rounded-full bg-[#C8A85B]/20 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
          🎙️
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Amiri', serif" }}>
          المصحح الذكي للتلاوة والتسميع
        </h2>
        <p className="text-xs opacity-85 leading-relaxed max-w-md mx-auto" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          اتلُ أي آية من كتاب الله بصوتك، وسيستمع التطبيق لتلاوتك مباشرة، ويصحح أخطاءك كلمة بكلمة، وينبهك فورياً مع إمكانية سماع النطق الصحيح.
        </p>
      </div>

      {/* Quick Selection Pills */}
      <div className="bg-white rounded-3xl p-5 border border-[#C8A85B]/30 shadow-xs">
        <h3 className="text-xs font-bold text-[#123B2A] mb-3 flex items-center gap-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <span>⚡</span>
          <span>آيات مختارة للتسميع السريع:</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_PRACTICE_VERSES.map((item) => {
            const isSelected = selectedSurah === item.surahNumber && selectedAyah === item.ayahNumber;
            return (
              <button
                key={item.verseKey}
                onClick={() => handleSelectQuickVerse(item)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all ${
                  isSelected
                    ? 'bg-[#123B2A] text-[#C8A85B] shadow-xs'
                    : 'bg-[#123B2A]/5 text-[#123B2A] hover:bg-[#C8A85B]/20'
                }`}
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Surah & Ayah Selector Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#C8A85B]/30 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          اختر سورة وآية مخصصة:
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Surah Select */}
          <div>
            <label className="block text-xs font-medium text-[#17231D]/70 mb-1.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              السورة
            </label>
            <select
              value={selectedSurah}
              onChange={(e) => {
                const s = parseInt(e.target.value, 10);
                setSelectedSurah(s);
                setSelectedAyah(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#C8A85B]/50 bg-[#FBF8EF] text-sm font-bold text-[#123B2A] focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              {Object.values(SURAH_METADATA).map((meta) => (
                <option key={meta.number} value={meta.number}>
                  {meta.number}. سورة {meta.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ayah Select */}
          <div>
            <label className="block text-xs font-medium text-[#17231D]/70 mb-1.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
              رقم الآية (1 - {surahMeta.versesCount})
            </label>
            <select
              value={selectedAyah}
              onChange={(e) => setSelectedAyah(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2.5 rounded-xl border border-[#C8A85B]/50 bg-[#FBF8EF] text-sm font-bold text-[#123B2A] focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              {Array.from({ length: surahMeta.versesCount }, (_, i) => i + 1).map((aNum) => (
                <option key={aNum} value={aNum}>
                  الآية {aNum}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reciter Selector for Reference Audio */}
        <div>
          <label className="block text-xs font-medium text-[#17231D]/70 mb-1.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
            القارئ المعتمد للاستماع للتلاوة الصحيحة:
          </label>
          <select
            value={selectedReciterId}
            onChange={(e) => setSelectedReciterId(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2.5 rounded-xl border border-[#C8A85B]/50 bg-[#FBF8EF] text-sm font-bold text-[#123B2A] focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            {POPULAR_RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Verse Preview & Action Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#C8A85B]/40 shadow-sm text-center space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold px-1">
          <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
            سورة {surahMeta.name} • الآية {selectedAyah}
          </span>
          <span className="px-3 py-1 rounded-full bg-[#C8A85B]/20 text-[#123B2A]">
            {surahMeta.revelationPlace === 'makkah' ? 'مكية 🕋' : 'مدنية 🕌'}
          </span>
          <span className="px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]">
            صفحة {currentVerse?.pageNumber || surahMeta.startPage}
          </span>
        </div>

        {/* Verse Text Area */}
        <div className="p-5 rounded-2xl bg-[#FBF8EF] border border-[#C8A85B]/20 min-h-[100px] flex items-center justify-center">
          {isLoadingVerse ? (
            <div className="flex items-center gap-2 text-sm text-[#C8A85B]">
              <div className="w-4 h-4 border-2 border-[#C8A85B] border-t-transparent rounded-full animate-spin" />
              <span>جاري جلب الآية الكريمة...</span>
            </div>
          ) : currentVerse?.textUthmani ? (
            <p
              className="text-xl md:text-2xl leading-[2.4] text-[#123B2A] text-center"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {currentVerse.textUthmani}
            </p>
          ) : (
            <p className="text-sm opacity-60">اضغط للبدء</p>
          )}
        </div>

        {/* Verse Navigation Buttons: Forward to Next Verse / Backward to Previous Verse */}
        <div className="flex items-center justify-between gap-2.5 pt-1">
          {/* Previous Ayah Button */}
          <button
            type="button"
            onClick={handlePrevAyah}
            disabled={!hasPrevAyah || isLoadingVerse}
            className="flex-1 py-3 px-3 md:px-4 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 border border-[#C8A85B]/50 bg-[#FBF8EF] text-[#123B2A] hover:bg-[#C8A85B]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
            title="الانتقال إلى الآية السابقة (الرجوع للخلف)"
          >
            <span className="text-base">➡️</span>
            <span>الآية السابقة</span>
          </button>

          {/* Ayah Counter Badge */}
          <div className="px-3 py-2 rounded-xl bg-[#123B2A]/5 text-[#123B2A] text-xs font-bold border border-[#123B2A]/10 whitespace-nowrap">
            {selectedAyah} / {surahMeta.versesCount}
          </div>

          {/* Next Ayah Button */}
          <button
            type="button"
            onClick={handleNextAyah}
            disabled={!hasNextAyah || isLoadingVerse}
            className="flex-1 py-3 px-3 md:px-4 rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 bg-[#123B2A] text-[#C8A85B] hover:bg-[#0B5B43] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-xs cursor-pointer border border-[#123B2A]"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
            title="الانتقال إلى الآية التالية (للأمام)"
          >
            <span>الآية التالية</span>
            <span className="text-base">⬅️</span>
          </button>
        </div>

        {/* Primary CTA: Start Recitation Correction */}
        <button
          onClick={() => setShowCorrectionModal(true)}
          disabled={!currentVerse}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-50"
          style={{
            backgroundColor: '#123B2A',
            color: '#C8A85B',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          <span className="text-2xl">🎙️</span>
          <span>ابدأ التسميع وتصحيح التلاوة الآن</span>
        </button>

        {/* Secondary: View in Mushaf */}
        {currentVerse?.pageNumber && (
          <button
            onClick={() => router.push(`/mushaf?page=${currentVerse.pageNumber}`)}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-[#123B2A]/80 hover:bg-[#123B2A]/5 transition-colors"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            📖 قراءة هذه الآية في المصحف الشريف (صفحة {currentVerse.pageNumber})
          </button>
        )}
      </div>

      {/* Guide Card */}
      <div className="p-4 rounded-2xl bg-[#C8A85B]/10 border border-[#C8A85B]/25 text-xs text-[#123B2A] leading-relaxed space-y-1.5">
        <p className="font-bold flex items-center gap-1.5">
          <span>💡</span>
          <span>كيف يعمل المصحح الذكي؟</span>
        </p>
        <p className="opacity-80">
          • اضغط على الميكروفون واقرأ بصوت واضح، وسيقوم النظام بتلوين الكلمات فورياً.
        </p>
        <p className="opacity-80">
          • <span className="font-bold text-emerald-800">الأخضر (✓):</span> نطق صحيح ومطابق للرسم القرآني.
        </p>
        <p className="opacity-80">
          • <span className="font-bold text-rose-700">الأحمر (✗):</span> خطأ في الكلمة مع تنبيه وزر للاستماع للنطق الصحيح من الشيخ.
        </p>
      </div>

      {/* Interactive Recitation Correction Modal */}
      {showCorrectionModal && currentVerse && (
        <RecitationCorrectionModal
          verse={currentVerse}
          isOpen={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          onNextVerse={handleNextAyah}
          onPrevVerse={handlePrevAyah}
          hasNextVerse={hasNextAyah}
          hasPrevVerse={hasPrevAyah}
          isLoadingVerse={isLoadingVerse}
          selectedReciterId={selectedReciterId}
        />
      )}
    </div>
  );
}
