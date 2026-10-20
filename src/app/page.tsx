'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ReadingProgress, Bookmark } from '@/types/quran';
import { getReadingProgress, getBookmarks, getPagesVisited, getSettings, saveSettings } from '@/lib/storage';
import { SURAH_METADATA, JUZ_METADATA, POPULAR_RECITERS, getSurahName } from '@/lib/quran-meta';
import KhatmahTracker from '@/components/mushaf/KhatmahTracker';
import RecitationPracticeHub from '@/components/home/RecitationPracticeHub';
import InstallAppModal from '@/components/home/InstallAppModal';
import AudioPlayerComponent from '@/components/mushaf/AudioPlayer';
import ReciterModal from '@/components/mushaf/ReciterModal';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAutoAthkar } from '@/hooks/useAutoAthkar';
import AutoAthkarModal from '@/components/home/AutoAthkarModal';
import AthkarToast from '@/components/common/AthkarToast';

export default function HomePage() {
  const router = useRouter();
  const audio = useAudioPlayer();
  const autoAthkar = useAutoAthkar();
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pagesRead, setPagesRead] = useState(0);
  const [activeTab, setActiveTab] = useState<'surahs' | 'juz' | 'khatmah' | 'correction' | 'bookmarks'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [selectedSurahForAudio, setSelectedSurahForAudio] = useState<number>(1);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showAthkarModal, setShowAthkarModal] = useState(false);

  useEffect(() => {
    const prog = getReadingProgress();
    setProgress(prog);
    setBookmarks(getBookmarks());
    setPagesRead(getPagesVisited().length);
    const settings = getSettings();
    if (settings.selectedReciterId) {
      setSelectedReciterId(settings.selectedReciterId);
    }
    if (prog?.surahNumber) {
      setSelectedSurahForAudio(prog.surahNumber);
    }
  }, []);

  const currentReciter = POPULAR_RECITERS.find((r) => r.id === selectedReciterId) || POPULAR_RECITERS[0];

  // Toggle audio playback
  const handleTogglePlay = useCallback(() => {
    if (audio.isPlaying) {
      audio.pause();
    } else if (audio.currentSurah === selectedSurahForAudio && audio.currentTime > 0) {
      audio.play();
    } else {
      const sName = getSurahName(selectedSurahForAudio);
      audio.loadAndPlay(
        selectedSurahForAudio,
        selectedReciterId,
        sName,
        currentReciter.name
      );
    }
  }, [audio, selectedSurahForAudio, selectedReciterId, currentReciter.name]);

  // Reciter change handler
  const handleReciterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = parseInt(e.target.value, 10);
    setSelectedReciterId(newId);
    saveSettings({ selectedReciterId: newId });
    const newReciter = POPULAR_RECITERS.find((r) => r.id === newId) || POPULAR_RECITERS[0];
    if (audio.isPlaying) {
      const targetSurah = audio.currentSurah || selectedSurahForAudio;
      audio.loadAndPlay(
        targetSurah,
        newId,
        getSurahName(targetSurah),
        newReciter.name
      );
    }
  }, [audio, selectedSurahForAudio]);

  // Play specific surah
  const handlePlaySurah = useCallback((surahNumber: number) => {
    setSelectedSurahForAudio(surahNumber);
    const sName = getSurahName(surahNumber);
    if (audio.isPlaying && audio.currentSurah === surahNumber) {
      audio.pause();
    } else {
      audio.loadAndPlay(
        surahNumber,
        selectedReciterId,
        sName,
        currentReciter.name
      );
    }
  }, [audio, selectedReciterId, currentReciter.name]);

  // Select reciter from modal
  const handleSelectReciterFromModal = useCallback((id: number, name: string) => {
    setSelectedReciterId(id);
    saveSettings({ selectedReciterId: id });
    setShowReciterModal(false);
    if (audio.isPlaying) {
      const targetSurah = audio.currentSurah || selectedSurahForAudio;
      audio.loadAndPlay(targetSurah, id, getSurahName(targetSurah), name);
    }
  }, [audio, selectedSurahForAudio]);

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
    <div className={`min-h-screen ${audio.currentSurah > 0 ? 'pb-28' : 'pb-8'}`} style={{ backgroundColor: '#FBF8EF' }}>
      {/* Header */}
      <header
        className="px-6 pt-8 pb-6 shadow-md"
        style={{ backgroundColor: '#123B2A', color: 'white' }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Dedication Banner: صدقة جارية لوالديا */}
          <div
            className="mb-5 mx-auto max-w-fit flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl border border-[#C8A85B]/60 shadow-md transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(200, 168, 91, 0.22) 0%, rgba(11, 91, 67, 0.45) 100%)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span className="text-[#C8A85B] text-base select-none">🤲</span>
            <p
              className="text-xs sm:text-sm font-bold text-[#F7EED8] text-center tracking-wide leading-relaxed"
              style={{ fontFamily: "'Tajawal', 'Amiri', serif" }}
            >
              صدقة جارية لوالديا أرجو الدعاء لهما بالرحمة
            </p>
            <span className="text-[#C8A85B] text-base select-none">🤲</span>
          </div>

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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowInstallModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-white/15 border border-[#C8A85B]/40 active:scale-95 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'rgba(200, 168, 91, 0.18)',
                  color: '#C8A85B',
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                <span>📲</span>
                <span>تثبيت التطبيق (APK)</span>
              </button>

              <button
                onClick={() => setShowAthkarModal(true)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border active:scale-95 cursor-pointer shadow-xs ${
                  autoAthkar.settings.enabled
                    ? 'border-emerald-400/60 bg-emerald-700/40 text-emerald-200 hover:bg-emerald-700/60'
                    : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                title="إعداد الأذكار الصوتية التلقائية"
              >
                <span className={autoAthkar.settings.enabled ? 'animate-bounce' : ''}>🔔</span>
                <span>
                  الأذكار الصوتية: {autoAthkar.settings.enabled ? `كل ${autoAthkar.settings.intervalMinutes} د` : 'متوقفة'}
                </span>
                <span className="text-[10px] opacity-80 bg-black/20 px-1.5 py-0.5 rounded-md">⚙️ ضبط</span>
              </button>
            </div>
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
              className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-lg mb-4 cursor-pointer"
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
              className="w-full py-4 rounded-2xl font-bold text-lg transition-transform active:scale-[0.98] shadow-lg mb-4 cursor-pointer"
              style={{
                backgroundColor: '#C8A85B',
                color: '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              افتح المصحف الشريف
            </button>
          )}

          {/* Audio Listening & Sheikh Selection Card */}
          <div
            className="rounded-2xl p-4 border border-[#C8A85B]/40 bg-white/10 backdrop-blur-md shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎧</span>
                <span className="text-sm font-bold text-[#C8A85B]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  الاستماع المباشر للقرآن الكريم
                </span>
              </div>
              {audio.isPlaying && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>جاري الاستماع الآن</span>
                </div>
              )}
            </div>

            {/* Listening Icon & Sheikh Selection Field */}
            <div className="flex items-center gap-3">
              {/* Play / Listening Icon Button */}
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={audio.isLoading}
                className={`w-13 h-13 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-95 shadow-lg flex-shrink-0 cursor-pointer border ${
                  audio.isPlaying
                    ? 'bg-[#0B5B43] text-white border-emerald-400/50 ring-4 ring-emerald-500/25 animate-pulse'
                    : 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] hover:bg-[#d4b66d]'
                }`}
                aria-label={audio.isPlaying ? 'إيقاف الاستماع' : 'استمع الآن للقرآن الكريم'}
                title={audio.isPlaying ? 'إيقاف التلاوة' : `استمع الآن بصوت الشيخ ${currentReciter.name}`}
              >
                {audio.isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
                ) : audio.isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              {/* Sheikh Names Field (حقل أسماء المشايخ) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-white/80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                    اختر الشيخ / القارئ:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowReciterModal(true)}
                    className="text-[10px] text-[#C8A85B] hover:underline cursor-pointer"
                  >
                    عرض جميع القراء 🔍
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedReciterId}
                    onChange={handleReciterChange}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-[#C8A85B]/60 bg-[#123B2A] text-white text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C8A85B] cursor-pointer shadow-inner appearance-none"
                    style={{ fontFamily: "'Tajawal', sans-serif" }}
                  >
                    {POPULAR_RECITERS.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#123B2A] text-white py-1">
                        الشيخ: {r.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#C8A85B] pointer-events-none">
                    👳‍♂️
                  </span>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#C8A85B] pointer-events-none">
                    ▾
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Surah selection for audio */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="opacity-80 text-[11px] flex items-center gap-1">
                <span>📖</span>
                <span>سورة التلاوة:</span>
              </span>
              <select
                value={selectedSurahForAudio}
                onChange={(e) => {
                  const sNum = parseInt(e.target.value, 10);
                  handlePlaySurah(sNum);
                }}
                className="bg-[#123B2A]/80 text-[#C8A85B] font-bold text-xs px-2.5 py-1 rounded-lg border border-[#C8A85B]/40 focus:outline-none cursor-pointer"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                {Object.values(SURAH_METADATA).map((s) => (
                  <option key={s.number} value={s.number} className="bg-[#123B2A] text-white">
                    {s.number}. سورة {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Repetition & Segment Looping Controls (تكرار التلاوة وتحديد المقاطع) */}
            <div className="mt-3 pt-2.5 border-t border-white/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#C8A85B] flex items-center gap-1.5">
                  <span className="text-base">🔁</span>
                  <span>تكرار التلاوة للحفظ:</span>
                </span>
                {audio.repeatCount > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8A85B] text-[#123B2A] font-extrabold shadow-sm animate-pulse">
                    {audio.repeatCount === 999
                      ? 'تكرار مستمر ∞'
                      : `متبقي: ${audio.remainingRepeats} من ${audio.repeatCount} مرات`}
                  </span>
                )}
              </div>

              {/* Repetition Quick Preset Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {[
                  { count: 1, label: 'مرة واحدة' },
                  { count: 3, label: '3 مرات (للحفظ)' },
                  { count: 5, label: '5 مرات' },
                  { count: 7, label: '7 مرات' },
                  { count: 10, label: '10 مرات' },
                  { count: 999, label: 'مستمر ∞' },
                ].map((item) => {
                  const isSelected = audio.repeatCount === item.count;
                  return (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => audio.setRepeatCount(item.count)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B] shadow-sm ring-2 ring-[#C8A85B]/40'
                          : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Segment Looping (A-B Loop) & Quick Seek */}
              <div className="bg-[#123B2A]/90 rounded-xl p-2.5 border border-[#C8A85B]/30 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-white/90">
                  <span className="font-bold flex items-center gap-1 text-[#C8A85B]">
                    <span>✂️</span>
                    <span>تكرار مقطع مخصص (A-B):</span>
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-300">
                    <span>
                      [A]:{' '}
                      {audio.segmentA !== null
                        ? `${Math.floor(audio.segmentA / 60)}:${Math.floor(audio.segmentA % 60)
                            .toString()
                            .padStart(2, '0')}`
                        : '--:--'}
                    </span>
                    <span>➜</span>
                    <span>
                      [B]:{' '}
                      {audio.segmentB !== null
                        ? `${Math.floor(audio.segmentB / 60)}:${Math.floor(audio.segmentB % 60)
                            .toString()
                            .padStart(2, '0')}`
                        : '--:--'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => audio.setSegmentA()}
                    className="py-1 px-1 rounded-lg text-[10px] md:text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 text-center transition cursor-pointer"
                    title="تحديد موضع بداية المقطع"
                  >
                    📍 [A] بداية
                  </button>
                  <button
                    type="button"
                    onClick={() => audio.setSegmentB()}
                    className="py-1 px-1 rounded-lg text-[10px] md:text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 text-center transition cursor-pointer"
                    title="تحديد موضع نهاية المقطع"
                  >
                    🎯 [B] نهاية
                  </button>
                  <button
                    type="button"
                    onClick={audio.toggleSegmentLoop}
                    disabled={audio.segmentA === null || audio.segmentB === null}
                    className={`py-1 px-1 rounded-lg text-[10px] md:text-[11px] font-bold text-center transition cursor-pointer border ${
                      audio.isSegmentLooping
                        ? 'bg-emerald-500 text-white border-emerald-400 font-extrabold shadow-sm animate-pulse'
                        : audio.segmentA !== null && audio.segmentB !== null
                        ? 'bg-[#C8A85B] text-[#123B2A] border-[#C8A85B]'
                        : 'bg-white/5 text-white/40 border-white/10 cursor-not-allowed'
                    }`}
                    title="تفعيل أو إيقاف تكرار المقطع المحدد"
                  >
                    {audio.isSegmentLooping ? '🔁 شغال' : '🔁 تكرار'}
                  </button>
                  <button
                    type="button"
                    onClick={audio.clearSegment}
                    disabled={audio.segmentA === null && audio.segmentB === null}
                    className="py-1 px-1 rounded-lg text-[10px] md:text-[11px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="إلغاء تحديد المقطع"
                  >
                    ✕ مسح
                  </button>
                </div>

                {/* Quick 15s Preset & Skip buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => audio.quickLoopLast(15)}
                    className="px-2 py-1 rounded bg-[#C8A85B]/20 hover:bg-[#C8A85B]/30 text-[#C8A85B] font-bold transition cursor-pointer border border-[#C8A85B]/30"
                    title="تكرار آخر 15 ثانية تلقائياً 3 مرات"
                  >
                    ↺ كرر آخر 15 ثانية (3x)
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => audio.skipTime(-5)}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90 cursor-pointer"
                      title="ترجيع 5 ثواني"
                    >
                      ⟲ -5ث
                    </button>
                    <button
                      type="button"
                      onClick={() => audio.skipTime(5)}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90 cursor-pointer"
                      title="تقديم 5 ثواني"
                    >
                      ⟳ +5ث
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              {filteredSurahs.map((meta) => {
                const isThisSurahPlaying = audio.isPlaying && audio.currentSurah === meta.number;
                return (
                  <div
                    key={meta.number}
                    onClick={() => router.push(`/mushaf?page=${meta.startPage}`)}
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
                        onClick={() => handlePlaySurah(meta.number)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer border ${
                          isThisSurahPlaying
                            ? 'bg-[#123B2A] text-[#C8A85B] border-[#123B2A] ring-2 ring-[#C8A85B]'
                            : 'bg-white hover:bg-[#C8A85B]/20 text-[#123B2A] border-[#123B2A]/10'
                        }`}
                        title={isThisSurahPlaying ? 'إيقاف الاستماع' : `استمع لسورة ${meta.name} بصوت الشيخ ${currentReciter.name}`}
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

      {/* Global Audio Player Bar when audio is active */}
      {audio.currentSurah > 0 && (
        <AudioPlayerComponent
          isPlaying={audio.isPlaying}
          currentTime={audio.currentTime}
          duration={audio.duration}
          isLoading={audio.isLoading}
          surahName={audio.surahName}
          reciterName={audio.reciterName}
          playbackRate={audio.playbackRate}
          isRepeat={audio.isRepeat}
          repeatCount={audio.repeatCount}
          remainingRepeats={audio.remainingRepeats}
          segmentA={audio.segmentA}
          segmentB={audio.segmentB}
          isSegmentLooping={audio.isSegmentLooping}
          onTogglePlay={audio.togglePlayPause}
          onSeek={audio.seek}
          onSetSpeed={audio.setPlaybackRate}
          onToggleRepeat={audio.toggleRepeat}
          onSetRepeatCount={audio.setRepeatCount}
          onSetSegmentA={() => audio.setSegmentA()}
          onSetSegmentB={() => audio.setSegmentB()}
          onClearSegment={audio.clearSegment}
          onToggleSegmentLoop={audio.toggleSegmentLoop}
          onSkip={audio.skipTime}
          onClose={audio.stop}
          onOpenReciterSelect={() => setShowReciterModal(true)}
        />
      )}

      {/* Reciter Modal for Extended List of Reciters */}
      {showReciterModal && (
        <ReciterModal
          isOpen={showReciterModal}
          selectedReciterId={selectedReciterId}
          onSelectReciter={handleSelectReciterFromModal}
          onClose={() => setShowReciterModal(false)}
        />
      )}

      {/* Floating Auto Voice Athkar Toast Notification */}
      {autoAthkar.currentToast && (
        <AthkarToast
          thikr={autoAthkar.currentToast}
          onDismiss={autoAthkar.dismissToast}
          onReplay={(t) => autoAthkar.triggerThikr(t)}
          isSpeaking={autoAthkar.isSpeaking}
        />
      )}

      {/* Automatic Athkar Settings Modal */}
      {showAthkarModal && (
        <AutoAthkarModal
          isOpen={showAthkarModal}
          onClose={() => setShowAthkarModal(false)}
          settings={autoAthkar.settings}
          onUpdateSettings={autoAthkar.updateSettings}
          onTestThikr={(t) => autoAthkar.triggerThikr(t)}
          isSpeaking={autoAthkar.isSpeaking}
        />
      )}
    </div>
  );
}
