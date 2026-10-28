'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReadingProgress, Bookmark } from '@/types/quran';
import {
  SURAH_METADATA,
  JUZ_METADATA,
  getSurahForPage,
  parseArabicOrWesternNumber,
} from '@/lib/quran-meta';
import { saveReadingProgress } from '@/lib/storage';
import KhatmahTracker from '@/components/mushaf/KhatmahTracker';
import RecitationPracticeHub from '@/components/home/RecitationPracticeHub';
import { triggerHaptic, speakAccessibility, announceToScreenReader } from '@/lib/accessibility';

interface ReadQuranModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  progress: ReadingProgress | null;
  isPlayingAudio: boolean;
  currentPlayingSurah: number;
  currentReciterName: string;
  onPlaySurah: (surahNumber: number) => void;
}

export default function ReadQuranModal({
  isOpen,
  onClose,
  bookmarks,
  progress,
  isPlayingAudio,
  currentPlayingSurah,
  currentReciterName,
  onPlaySurah,
}: ReadQuranModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'surahs' | 'juz' | 'khatmah' | 'correction' | 'bookmarks'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpPageInput, setJumpPageInput] = useState('');

  if (!isOpen) return null;

  const handleJumpToPage = (targetPage?: number) => {
    const page = targetPage !== undefined ? targetPage : parseArabicOrWesternNumber(jumpPageInput);
    if (!isNaN(page) && page >= 1 && page <= 604) {
      triggerHaptic('tap');
      speakAccessibility(`الانتقال إلى صفحة ${page}`);
      announceToScreenReader(`الانتقال إلى صفحة ${page}`);
      onClose();
      router.push(`/mushaf?page=${page}`);
    }
  };

  const currentStoppedPage =
    progress && progress.pageNumber >= 1 && progress.pageNumber <= 604
      ? progress.pageNumber
      : 1;

  const filteredSurahs = Object.values(SURAH_METADATA).filter((s) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      s.name.includes(query) ||
      s.englishName.toLowerCase().includes(query) ||
      s.number.toString() === query
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-2xl bg-[#FBF8EF] text-[#17231D] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-2 border-[#C8A85B]/60 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-4 border-b border-[#C8A85B]/30 flex items-center justify-between shadow-sm relative overflow-hidden"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          {/* Animated Sheen in Header */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: 'radial-gradient(circle at 80% 20%, rgba(200, 168, 91, 0.4), transparent 60%)',
            }}
          />

          <div className="flex items-center gap-3 relative z-10">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl border border-[#C8A85B]/70 shadow-md animate-logo-breathing"
              style={{
                backgroundColor: 'rgba(200, 168, 91, 0.25)',
                color: '#C8A85B',
              }}
            >
              📖
            </div>
            <div>
              <h2
                className="text-lg sm:text-xl font-bold flex items-center gap-2 text-[#F7EED8]"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                <span>اقرأ القرآن الكريم</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#C8A85B]/30 text-[#F5D88A] border border-[#C8A85B]/40">
                  الفهرس الشامل
                </span>
              </h2>
              <p className="text-xs text-white/80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تصفح السور والأجزاء وتتبع الختمة وتصحيح التلاوة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {/* Quick continue button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onClose();
                router.push(`/mushaf?page=${currentStoppedPage}`);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-[#C8A85B] text-[#123B2A] hover:brightness-110 active:scale-95 transition cursor-pointer shadow-sm"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <span>متابعة ص {currentStoppedPage}</span>
              <span>◀</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg text-white/80 hover:bg-white/10 hover:text-white transition cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs (النافذة رقم 2 بجميع خصائصها) */}
        <div
          className="flex border-b bg-[#FBF8EF] shadow-xs overflow-x-auto scrollbar-none shrink-0"
          style={{ borderColor: 'rgba(18,59,42,0.1)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('surahs')}
            className="flex-1 min-w-[75px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2 cursor-pointer"
            style={{
              color: activeTab === 'surahs' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'surahs' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            السور (114)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('juz')}
            className="flex-1 min-w-[75px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2 cursor-pointer"
            style={{
              color: activeTab === 'juz' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'juz' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            الأجزاء (30)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('khatmah')}
            className="flex-1 min-w-[95px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2 cursor-pointer"
            style={{
              color: activeTab === 'khatmah' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'khatmah' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            الختمة المباركة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('correction')}
            className="flex-1 min-w-[105px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2 cursor-pointer"
            style={{
              color: activeTab === 'correction' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'correction' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            تصحيح التلاوة 🎙️
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className="flex-1 min-w-[85px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2 cursor-pointer"
            style={{
              color: activeTab === 'bookmarks' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'bookmarks' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            العلامات ({bookmarks.length})
          </button>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab 1: Surah Index */}
          {activeTab === 'surahs' && (
            <div>
              {/* Quick Page Jump Bar */}
              <div className="p-3.5 bg-gradient-to-r from-[#123B2A]/8 via-[#C8A85B]/15 to-[#123B2A]/8 border-b border-[#C8A85B]/30">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold text-[#123B2A]"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    <span className="text-sm">📖</span>
                    <span>الانتقال لصفحة محددة (1 - 604):</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleJumpToPage();
                        }
                      }}
                      placeholder="رقم الصفحة..."
                      className="w-28 px-3 py-1.5 rounded-xl border border-[#C8A85B] bg-white text-xs font-bold text-center text-[#17231D] focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
                    />

                    <select
                      value=""
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleJumpToPage(val);
                        }
                      }}
                      className="px-2 py-1.5 rounded-xl border border-[#C8A85B]/60 bg-white text-[#17231D] text-xs font-medium focus:outline-none cursor-pointer max-w-[130px]"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      <option value="">أو اختر صفحة ▾</option>
                      {Array.from({ length: 604 }, (_, i) => i + 1).map((p) => {
                        const s = getSurahForPage(p);
                        return (
                          <option key={p} value={p}>
                            ص {p} {s ? `(${s.name})` : ''}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleJumpToPage()}
                      className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-[#123B2A] hover:bg-[#0B5B43] active:scale-95 transition shadow-xs cursor-pointer border border-[#C8A85B]/50 whitespace-nowrap"
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      انتقال ◀
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Filter Input (نفس الصورة رقم 2) */}
              <div className="p-4 border-b border-[#123B2A]/5 bg-white/50">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن اسم السورة، أو رقم الصفحة (مثل 150)..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#C8A85B]/50 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A85B] shadow-2xs"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                  dir="rtl"
                />
              </div>

              {/* Immediate Page Jump Match Banner */}
              {(() => {
                const queryNum = parseArabicOrWesternNumber(searchQuery);
                if (!isNaN(queryNum) && queryNum >= 1 && queryNum <= 604) {
                  const s = getSurahForPage(queryNum);
                  return (
                    <div className="mx-4 my-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#123B2A] to-[#0B5B43] text-white flex items-center justify-between shadow-md border border-[#C8A85B]/60 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl text-[#C8A85B]">📖</span>
                        <div>
                          <div className="text-sm font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            الانتقال المباشر إلى صفحة {queryNum}
                          </div>
                          {s && (
                            <div className="text-xs text-[#C8A85B]" style={{ fontFamily: "'Amiri', serif" }}>
                              سورة {s.name} • الجزء {SURAH_METADATA[s.number]?.startPage || 1}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(`/mushaf?page=${queryNum}`);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#C8A85B] text-[#123B2A] text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-sm cursor-pointer whitespace-nowrap"
                        style={{ fontFamily: "'Tajawal', sans-serif" }}
                      >
                        انتقال للصفحة ◀
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Surahs List (تطابق تام مع الصورة رقم 2) */}
              <div className="divide-y divide-[#123B2A]/6">
                {filteredSurahs.map((meta) => {
                  const isThisSurahPlaying = isPlayingAudio && currentPlayingSurah === meta.number;
                  return (
                    <div
                      key={meta.number}
                      onClick={() => {
                        triggerHaptic('tap');
                        speakAccessibility(`فتح سورة ${meta.name}، صفحة ${meta.startPage}`);
                        onClose();
                        router.push(`/mushaf?page=${meta.startPage}`);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`سورة ${meta.name}، ${meta.revelationPlace === 'makkah' ? 'مكية' : 'مدنية'}، ${meta.versesCount} آية، تبدأ من صفحة ${meta.startPage}`}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-right hover:bg-[#123B2A]/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ backgroundColor: 'rgba(18,59,42,0.08)', color: '#123B2A' }}
                        >
                          {meta.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className="font-bold text-lg text-[#17231D]"
                              style={{ fontFamily: "'Amiri', serif" }}
                            >
                              سورة {meta.name}
                            </p>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#123B2A]/8 text-[#123B2A] font-medium">
                              {meta.revelationPlace === 'makkah' ? 'مكية' : 'مدنية'}
                            </span>
                          </div>
                          <p className="text-xs opacity-60" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            {meta.versesCount} آية • صفحة {meta.startPage}
                          </p>
                        </div>
                      </div>

                      {/* Quick listening button for this surah */}
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onPlaySurah(meta.number)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border ${
                            isThisSurahPlaying
                              ? 'bg-[#123B2A] text-[#C8A85B] border-[#123B2A] ring-2 ring-[#C8A85B]'
                              : 'bg-white hover:bg-[#C8A85B]/20 text-[#123B2A] border-[#123B2A]/10'
                          }`}
                          title={isThisSurahPlaying ? 'إيقاف الاستماع' : `استمع لسورة ${meta.name} بصوت الشيخ ${currentReciterName}`}
                          aria-label={`استمع لسورة ${meta.name}`}
                          style={{ fontFamily: "'Tajawal', sans-serif" }}
                        >
                          {isThisSurahPlaying ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#C8A85B] animate-ping" />
                              <span>إيقاف</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm">🎧</span>
                              <span className="hidden sm:inline">استمع</span>
                            </>
                          )}
                        </button>

                        <div className="text-left hidden md:block" dir="ltr">
                          <span className="text-xs opacity-40 font-medium" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            {meta.englishName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: 30-Juz Index */}
          {activeTab === 'juz' && (
            <div className="divide-y divide-[#123B2A]/6">
              {JUZ_METADATA.map((juz) => (
                <button
                  key={juz.juzNumber}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    onClose();
                    router.push(`/mushaf?page=${juz.startPage}`);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-4 text-right hover:bg-[#123B2A]/5 transition-colors cursor-pointer"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-bold"
                    style={{ backgroundColor: '#123B2A', color: '#C8A85B' }}
                  >
                    <span className="text-[10px] opacity-75 font-normal">الجزء</span>
                    <span className="text-base leading-none">{juz.juzNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-base text-[#17231D]"
                      style={{ fontFamily: "'Amiri', serif" }}
                    >
                      «{juz.name}»
                    </p>
                    <p className="text-xs opacity-60 mt-0.5" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      بداية سورة {juz.startSurah} • صفحة {juz.startPage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-3 py-1.5 rounded-full font-bold"
                      style={{ backgroundColor: 'rgba(200,168,91,0.2)', color: '#123B2A' }}
                    >
                      صفحة {juz.startPage}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17231D40" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Tab 3: Khatmah Tracker */}
          {activeTab === 'khatmah' && (
            <div className="p-4 sm:p-5">
              <KhatmahTracker />
            </div>
          )}

          {/* Tab 4: Recitation Practice & Correction */}
          {activeTab === 'correction' && (
            <div className="p-4 sm:p-5">
              <RecitationPracticeHub />
            </div>
          )}

          {/* Tab 5: Bookmarks List */}
          {activeTab === 'bookmarks' && (
            <div className="p-5">
              {bookmarks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#123B2A]/10">
                  <div className="text-4xl mb-3">🔖</div>
                  <h3 className="font-bold text-lg text-[#123B2A] mb-1" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    لا توجد علامات مرجعية بعد
                  </h3>
                  <p
                    className="text-sm opacity-60 max-w-xs mx-auto"
                    style={{ fontFamily: "'Tajawal', sans-serif", color: '#17231D' }}
                  >
                    أثناء تلاوتك في المصحف، اضغط على أي آية لحفظ علامة مرجعية أو إضافة ملاحظة خاصة بها.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarks.map((bm) => {
                    const surahMeta = SURAH_METADATA[bm.surahNumber];
                    return (
                      <button
                        key={bm.id}
                        type="button"
                        onClick={() => {
                          saveReadingProgress({
                            pageNumber: bm.pageNumber,
                            surahNumber: bm.surahNumber,
                            ayahNumber: bm.ayahNumber,
                            updatedAt: new Date().toISOString(),
                          });
                          onClose();
                          router.push(`/mushaf?page=${bm.pageNumber}`);
                        }}
                        className="w-full p-4 rounded-2xl text-right transition-colors hover:bg-[#123B2A]/5 border border-[#C8A85B]/20 bg-white shadow-xs cursor-pointer block"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-base font-bold text-[#123B2A]"
                            style={{ fontFamily: "'Amiri', serif" }}
                          >
                            سورة {surahMeta?.name || bm.surahNumber} — الآية {bm.ayahNumber}
                          </span>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#C8A85B]/20 text-[#123B2A]"
                            style={{ fontFamily: "'Tajawal', sans-serif" }}
                          >
                            صفحة {bm.pageNumber}
                          </span>
                        </div>
                        {bm.note && (
                          <p className="text-xs opacity-75 mt-2 p-2.5 rounded-xl bg-[#123B2A]/5 text-[#17231D]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                            💬 {bm.note}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#C8A85B]/30 bg-white/70 flex items-center justify-between text-xs text-[#17231D]/80">
          <div className="flex items-center gap-2">
            <span className="text-sm">📖</span>
            <span style={{ fontFamily: "'Tajawal', sans-serif" }}>
              موضع قراءتك الحالي: <strong>صفحة {currentStoppedPage}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onClose();
              router.push(`/mushaf?page=${currentStoppedPage}`);
            }}
            className="px-4 py-2 rounded-xl bg-[#123B2A] text-[#C8A85B] font-bold hover:brightness-110 active:scale-95 transition cursor-pointer shadow-xs"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            فتح المصحف الآن ◀
          </button>
        </div>
      </div>
    </div>
  );
}
