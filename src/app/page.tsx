'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReadingProgress, Bookmark } from '@/types/quran';
import { getReadingProgress, getBookmarks, getPagesVisited } from '@/lib/storage';
import { SURAH_METADATA, JUZ_METADATA } from '@/lib/quran-meta';
import KhatmahTracker from '@/components/mushaf/KhatmahTracker';
import RecitationPracticeHub from '@/components/home/RecitationPracticeHub';
import InstallAppModal from '@/components/home/InstallAppModal';

export default function HomePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pagesRead, setPagesRead] = useState(0);
  const [activeTab, setActiveTab] = useState<'surahs' | 'juz' | 'khatmah' | 'correction' | 'bookmarks'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    setProgress(getReadingProgress());
    setBookmarks(getBookmarks());
    setPagesRead(getPagesVisited().length);
  }, []);

  const percentage = Math.round((pagesRead / 604) * 1000) / 10;

  // Filter surahs by search
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
    <div className="min-h-screen" style={{ backgroundColor: '#FBF8EF' }}>
      {/* Header */}
      <header
        className="px-6 pt-8 pb-6 shadow-md"
        style={{ backgroundColor: '#123B2A', color: 'white' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-5">
            <h1
              className="text-3xl md:text-4xl font-bold mb-1 tracking-wide"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              نور القرآن
            </h1>
            <p
              className="text-sm opacity-80 mb-3"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              رفيقك مع القرآن الكريم • المصحف الشريف
            </p>
            <button
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-white/15 border border-[#C8A85B]/40 active:scale-95 cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'rgba(200, 168, 91, 0.18)',
                color: '#C8A85B',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              <span>📲</span>
              <span>تثبيت التطبيق على الأندرويد (APK / فوري)</span>
            </button>
          </div>

          {/* Reading Progress Card */}
          <div
            className="rounded-2xl p-5 mb-4 border border-white/10"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm opacity-90 font-medium" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تقدمك العام في التلاوة
              </span>
              <span className="text-sm font-bold text-[#C8A85B]" dir="ltr">
                {percentage}%
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden bg-white/15">
              <div
                className="h-full rounded-full transition-all duration-700 bg-[#C8A85B]"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2.5 text-xs opacity-70">
              <span>{pagesRead} صفحة مقروءة</span>
              <span>604 صفحة</span>
            </div>
          </div>

          {/* Continue Reading Button */}
          {progress && progress.pageNumber > 0 ? (
            <button
              onClick={() => router.push(`/mushaf?page=${progress.pageNumber}`)}
              className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-lg"
              style={{
                backgroundColor: '#C8A85B',
                color: '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#123B2A">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              متابعة القراءة — صفحة {progress.pageNumber}
            </button>
          ) : (
            <button
              onClick={() => router.push('/mushaf?page=1')}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-transform active:scale-[0.98] shadow-lg"
              style={{
                backgroundColor: '#C8A85B',
                color: '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              افتح المصحف الشريف
            </button>
          )}
        </div>
      </header>

      {/* Main Tabs Container */}
      <div className="max-w-2xl mx-auto">
        {/* Navigation Tabs */}
        <div
          className="flex border-b sticky top-0 z-10 bg-[#FBF8EF] shadow-xs overflow-x-auto scrollbar-none"
          style={{ borderColor: 'rgba(18,59,42,0.1)' }}
        >
          <button
            onClick={() => setActiveTab('surahs')}
            className="flex-1 min-w-[75px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2"
            style={{
              color: activeTab === 'surahs' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'surahs' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            السور (114)
          </button>
          <button
            onClick={() => setActiveTab('juz')}
            className="flex-1 min-w-[75px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2"
            style={{
              color: activeTab === 'juz' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'juz' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            الأجزاء (30)
          </button>
          <button
            onClick={() => setActiveTab('khatmah')}
            className="flex-1 min-w-[95px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2"
            style={{
              color: activeTab === 'khatmah' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'khatmah' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            الختمة المباركة
          </button>
          <button
            onClick={() => setActiveTab('correction')}
            className="flex-1 min-w-[105px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2"
            style={{
              color: activeTab === 'correction' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'correction' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            تصحيح التلاوة 🎙️
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className="flex-1 min-w-[85px] py-3.5 text-xs md:text-sm font-bold transition-all text-center whitespace-nowrap px-2"
            style={{
              color: activeTab === 'bookmarks' ? '#123B2A' : '#17231D70',
              borderBottom: activeTab === 'bookmarks' ? '3px solid #C8A85B' : '3px solid transparent',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            العلامات ({bookmarks.length})
          </button>
        </div>

        {/* Tab 1: Surah Index */}
        {activeTab === 'surahs' && (
          <div>
            {/* Quick Filter */}
            <div className="p-4 border-b border-[#123B2A]/5 bg-white/40">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم السورة أو رقمها..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#C8A85B]/40 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A85B]"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                dir="rtl"
              />
            </div>

            <div className="divide-y divide-[#123B2A]/6">
              {filteredSurahs.map((meta) => (
                <button
                  key={meta.number}
                  onClick={() => router.push(`/mushaf?page=${meta.startPage}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-right hover:bg-[#123B2A]/5 transition-colors"
                >
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
                  <div className="text-left" dir="ltr">
                    <span className="text-xs opacity-40 font-medium" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                      {meta.englishName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: 30-Juz Index */}
        {activeTab === 'juz' && (
          <div className="divide-y divide-[#123B2A]/6">
            {JUZ_METADATA.map((juz) => (
              <button
                key={juz.juzNumber}
                onClick={() => router.push(`/mushaf?page=${juz.startPage}`)}
                className="w-full flex items-center gap-4 px-5 py-4 text-right hover:bg-[#123B2A]/5 transition-colors"
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
          <KhatmahTracker />
        )}

        {/* Tab 4: Recitation Practice & Correction */}
        {activeTab === 'correction' && (
          <RecitationPracticeHub />
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
                      onClick={() => router.push(`/mushaf?page=${bm.pageNumber}`)}
                      className="w-full p-4 rounded-2xl text-right transition-colors hover:bg-[#123B2A]/5 border border-[#C8A85B]/20 bg-white shadow-xs"
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

      {/* Android & PWA Installation Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
