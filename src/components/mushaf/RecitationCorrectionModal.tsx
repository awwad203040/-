'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Verse } from '@/types/quran';
import { useRecitationListener } from '@/hooks/useRecitationListener';
import { getSurahName, POPULAR_RECITERS } from '@/lib/quran-meta';

interface RecitationCorrectionModalProps {
  verse: Verse;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToVerse?: (verseKey: string) => void;
  onNextVerse?: () => void;
  onPrevVerse?: () => void;
  hasNextVerse?: boolean;
  hasPrevVerse?: boolean;
  isLoadingVerse?: boolean;
  selectedReciterId?: number;
  nightMode?: boolean;
}

export default function RecitationCorrectionModal({
  verse,
  isOpen,
  onClose,
  onNextVerse,
  onPrevVerse,
  hasNextVerse = false,
  hasPrevVerse = false,
  isLoadingVerse = false,
  selectedReciterId = 7,
  nightMode = false,
}: RecitationCorrectionModalProps) {
  const [isPlayingSheikh, setIsPlayingSheikh] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isListening,
    isSupported,
    transcript,
    verification,
    lastErrorMsg,
    startListening,
    stopListening,
    resetRecitation,
  } = useRecitationListener({
    verseText: verse.textUthmani || verse.text_uthmani || '',
  });

  const surahNum = verse.chapterId || verse.chapterNumber || verse.chapter_id || parseInt((verse.verseKey || verse.verse_key || '1:1').split(':')[0], 10);
  const surahName = getSurahName(surahNum);
  const reciter = POPULAR_RECITERS.find((r) => r.id === selectedReciterId) || POPULAR_RECITERS[0];
  const verseKey = verse.verseKey || verse.verse_key || `${surahNum}:${verse.verseNumber || verse.verse_number || 1}`;

  // Preload audio URL immediately upon modal open or verse change
  useEffect(() => {
    if (!isOpen || !verseKey) return;

    const parts = verseKey.split(':');
    const surahPad = (parts[0] || '1').padStart(3, '0');
    const ayahPad = (parts[1] || '1').padStart(3, '0');
    const directFallbackUrl = `https://verses.quran.com/Alafasy/mp3/${surahPad}${ayahPad}.mp3`;

    setIsAudioLoading(true);
    setAudioError(null);

    // Initial source set to direct CDN to guarantee availability instantly
    setAudioSrc(directFallbackUrl);

    // If a different reciter is selected, fetch their specific audio URL
    if (selectedReciterId !== 7) {
      fetch(`/api/quran/audio?reciter=${selectedReciterId}&verse_key=${verseKey}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch specific reciter');
          return res.json() as Promise<{ audio_file?: { audio_url?: string; url?: string } }>;
        })
        .then((data) => {
          const url = data.audio_file?.audio_url || data.audio_file?.url;
          if (url) {
            setAudioSrc(url);
          }
          setIsAudioLoading(false);
        })
        .catch(() => {
          // Keep direct fallback
          setAudioSrc(directFallbackUrl);
          setIsAudioLoading(false);
        });
    } else {
      setIsAudioLoading(false);
    }
  }, [isOpen, verseKey, selectedReciterId]);

  // Stop audio and listening when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingSheikh(false);
    }
  }, [isOpen, stopListening]);

  // Play or Pause Sheikh audio synchronously (guarantees user gesture activation)
  const playSheikhAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlayingSheikh) {
      audio.pause();
      setIsPlayingSheikh(false);
      return;
    }

    setAudioError(null);

    // If source isn't set yet, construct it immediately
    if (!audio.src || audio.src === window.location.href) {
      const parts = verseKey.split(':');
      const surahPad = (parts[0] || '1').padStart(3, '0');
      const ayahPad = (parts[1] || '1').padStart(3, '0');
      audio.src = `https://verses.quran.com/Alafasy/mp3/${surahPad}${ayahPad}.mp3`;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlayingSheikh(true);
        })
        .catch((err) => {
          console.warn('Audio play failed:', err);
          setIsPlayingSheikh(false);
          // Try fallback to Alafasy direct URL if original reciter failed
          const parts = verseKey.split(':');
          const fallback = `https://verses.quran.com/Alafasy/mp3/${(parts[0] || '1').padStart(3, '0')}${(parts[1] || '1').padStart(3, '0')}.mp3`;
          if (audio.src !== fallback) {
            audio.src = fallback;
            audio.play().then(() => setIsPlayingSheikh(true)).catch(() => {
              setAudioError('تعذر تشغيل الصوت. يرجى الضغط مرة أخرى أو التحقق من الاتصال.');
            });
          } else {
            setAudioError('تعذر تشغيل الصوت. يرجى الضغط مرة أخرى.');
          }
        });
    }
  }, [isPlayingSheikh, verseKey]);

  // Handle moving to next verse
  const handleNext = useCallback(() => {
    if (!hasNextVerse || !onNextVerse) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingSheikh(false);
    stopListening();
    resetRecitation();
    onNextVerse();
  }, [hasNextVerse, onNextVerse, stopListening, resetRecitation]);

  // Handle moving to previous verse
  const handlePrev = useCallback(() => {
    if (!hasPrevVerse || !onPrevVerse) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingSheikh(false);
    stopListening();
    resetRecitation();
    onPrevVerse();
  }, [hasPrevVerse, onPrevVerse, stopListening, resetRecitation]);

  // Keyboard navigation: ArrowLeft (forward in RTL) and ArrowRight (backward in RTL)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' && hasNextVerse && onNextVerse) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowRight' && hasPrevVerse && onPrevVerse) {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasNextVerse, hasPrevVerse, onNextVerse, onPrevVerse, handleNext, handlePrev]);

  if (!isOpen) return null;

  const bgColor = nightMode ? '#0D1F17' : '#FBF8EF';
  const surfaceColor = nightMode ? '#142A1F' : 'white';
  const textColor = nightMode ? '#E8E4D9' : '#17231D';

  return (
    <>
      {/* Hidden HTML5 Audio Element in DOM for reliable playback */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        preload="auto"
        onPlay={() => setIsPlayingSheikh(true)}
        onPause={() => setIsPlayingSheikh(false)}
        onEnded={() => {
          setIsPlayingSheikh(false);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onError={() => {
          console.warn('Audio tag encountered error');
          setIsPlayingSheikh(false);
        }}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="fixed inset-x-3 top-6 bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-[#C8A85B]/40"
        style={{ backgroundColor: bgColor, color: textColor }}
        dir="rtl"
      >
        {/* Header */}
        <header
          className="px-6 py-4 flex items-center justify-between shadow-xs"
          style={{ backgroundColor: '#123B2A', color: 'white' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C8A85B]/20 flex items-center justify-center text-xl">
              🎙️
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                المصحح الذكي للتلاوة والتسميع
              </h2>
              <p className="text-xs opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                سورة {surahName} • الآية {verseKey}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Sub-header Navigation Bar: Forward to Next Verse / Backward to Previous Verse */}
        {(onNextVerse || onPrevVerse) && (
          <div
            className="px-4 py-2.5 flex items-center justify-between border-b shadow-2xs shrink-0"
            style={{
              backgroundColor: nightMode ? '#142A1F' : '#F7F3E6',
              borderColor: 'rgba(200,168,91,0.25)',
            }}
          >
            {/* Backward / Previous Ayah Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrevVerse || isLoadingVerse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-[#C8A85B]/50 bg-white/70 hover:bg-[#C8A85B]/20 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs cursor-pointer active:scale-95"
              style={{
                color: textColor,
                fontFamily: "'Tajawal', sans-serif",
              }}
              title="الانتقال إلى الآية السابقة (الرجوع للخلف)"
            >
              <span className="text-sm">➡️</span>
              <span>الآية السابقة</span>
            </button>

            {/* Current Ayah Indicator */}
            <div className="flex items-center gap-2">
              {isLoadingVerse ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8A85B]/20 text-[#123B2A] text-xs font-bold">
                  <div className="w-3 h-3 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحميل...</span>
                </div>
              ) : (
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full bg-[#123B2A]/10 text-[#123B2A]"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  سورة {surahName} • الآية {verseKey}
                </span>
              )}
            </div>

            {/* Forward / Next Ayah Button */}
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNextVerse || isLoadingVerse}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-[#123B2A] text-[#C8A85B] hover:bg-[#0B5B43] disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer active:scale-95 border border-[#123B2A]"
              style={{
                fontFamily: "'Tajawal', sans-serif",
              }}
              title="الانتقال إلى الآية التالية (للأمام)"
            >
              <span>الآية التالية</span>
              <span className="text-sm">⬅️</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          {/* Audio Reference Bar */}
          <div
            className="flex items-center justify-between p-3.5 rounded-2xl border"
            style={{
              backgroundColor: surfaceColor,
              borderColor: 'rgba(200,168,91,0.25)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔊</span>
              <div>
                <p className="text-xs font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  الاستماع للتلاوة الصحيحة
                </p>
                <p className="text-[11px] opacity-70">
                  بصوت الشيخ: {reciter.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={playSheikhAudio}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
              style={{
                backgroundColor: isPlayingSheikh ? '#0B5B43' : '#C8A85B',
                color: isPlayingSheikh ? 'white' : '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {isPlayingSheikh ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>⏸️ إيقاف التلاوة</span>
                </>
              ) : isAudioLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#123B2A] border-t-transparent rounded-full animate-spin" />
                  <span>جاري التجهيز...</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>استمع للتلاوة</span>
                </>
              )}
            </button>
          </div>

          {/* Audio Error message if any */}
          {audioError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              {audioError}
            </div>
          )}

          {/* Verse Display with Word-by-Word Alignment */}
          <div
            className="p-6 rounded-3xl border shadow-xs text-center relative"
            style={{
              backgroundColor: surfaceColor,
              borderColor: 'rgba(200,168,91,0.3)',
            }}
          >
            <div className="flex flex-wrap items-center justify-center gap-2.5 leading-[3]">
              {verification.words.map((word) => {
                let badgeClass = 'text-gray-700 bg-black/5 border-transparent';
                let indicator = null;

                if (word.status === 'correct') {
                  badgeClass = 'bg-emerald-500/15 text-emerald-800 border-emerald-500 font-bold';
                  indicator = <span className="text-[10px] text-emerald-700 mr-1">✓</span>;
                } else if (word.status === 'incorrect') {
                  badgeClass = 'bg-rose-500/20 text-rose-700 border-rose-500 font-bold animate-pulse';
                  indicator = <span className="text-[10px] text-rose-600 mr-1">✗</span>;
                } else if (word.status === 'current') {
                  badgeClass = 'border-[#C8A85B] bg-[#C8A85B]/20 text-[#123B2A] font-bold shadow-xs';
                  indicator = <span className="text-[10px] text-[#C8A85B] mr-1">●</span>;
                }

                return (
                  <span
                    key={word.index}
                    className={`inline-flex items-center px-3 py-1.5 rounded-2xl border text-xl md:text-2xl transition-all ${badgeClass}`}
                    style={{ fontFamily: "'Amiri', serif" }}
                    title={word.spokenText ? `ما سُمع: ${word.spokenText}` : undefined}
                  >
                    {indicator}
                    {word.original}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Real-time Error Notification Alert */}
          {verification.lastError && (
            <div
              className="p-4 rounded-2xl border flex items-start gap-3 bg-rose-50 border-rose-200 text-rose-900"
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            >
              <span className="text-2xl mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  تنبيه في تلاوة كلمة: «{verification.lastError.expectedWord}»
                </p>
                <p className="text-xs opacity-80 mt-1" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  سمع التطبيق: <span className="font-bold underline">«{verification.lastError.spokenWord}»</span>. أعد نطقها بصوت هادئ ومخارج سليمة.
                </p>
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={playSheikhAudio}
                    className="text-xs px-3.5 py-2 rounded-xl font-bold bg-rose-900 text-white flex items-center gap-1.5 hover:bg-rose-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>{isPlayingSheikh ? '⏸️ إيقاف' : '🔊 استمع لنطقها من القارئ'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Celebration on Success */}
          {verification.isComplete && (
            <div
              className="p-5 rounded-2xl border flex flex-col items-center gap-3 bg-emerald-50 border-emerald-300 text-emerald-900 text-center justify-center"
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl">🎉</span>
                <p className="text-base font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  ما شاء الله! تلاوة متقنة وصحيحة
                </p>
              </div>
              <p className="text-xs text-emerald-700">
                تمت قراءة جميع كلمات الآية بدقة عالية ({verification.accuracyPercentage}%)
              </p>
              {onNextVerse && hasNextVerse && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-1 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#123B2A] text-[#C8A85B] hover:bg-[#0B5B43] flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  <span>الانتقال للآية التالية للتسميع</span>
                  <span className="text-sm">⬅️</span>
                </button>
              )}
            </div>
          )}

          {/* Browser Unsupported or Mic Error Banner */}
          {(!isSupported || lastErrorMsg) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              {lastErrorMsg || 'المتصفح الحالي لا يدعم التعرف على الصوت المباشر. يُوصى بمتصفح Chrome أو Edge أو Safari.'}
            </div>
          )}

          {/* Live Transcript Bubble */}
          {transcript && (
            <div className="p-3.5 rounded-2xl bg-[#123B2A]/5 border border-[#123B2A]/10 text-xs text-[#17231D]/80">
              <span className="font-bold text-[#123B2A]">ما التقطه الميكروفون: </span>
              <span>«{transcript}»</span>
            </div>
          )}

          {/* Central Microphone Action Bar */}
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white ring-8 ring-rose-500/25 animate-pulse'
                  : 'bg-[#123B2A] text-[#C8A85B] hover:bg-[#0B5B43]'
              }`}
              aria-label={isListening ? 'إيقاف الاستماع' : 'بدء الاستماع'}
            >
              {isListening ? '⏹️' : '🎙️'}
            </button>

            <p
              className="text-sm font-bold text-center"
              style={{
                color: isListening ? '#C8A85B' : '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {isListening
                ? 'جاري الاستماع... اقرأ الآية بصوت واضح ومرتل'
                : 'اضغط على الميكروفون لبدء التسميع والتصحيح'}
            </p>
          </div>

          {/* Metrics & Progress Bar */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-2xl border" style={{ backgroundColor: surfaceColor, borderColor: 'rgba(200,168,91,0.2)' }}>
              <span className="block opacity-70">دقة التلاوة</span>
              <span className="text-lg font-bold text-[#C8A85B]" dir="ltr">
                {verification.accuracyPercentage}%
              </span>
            </div>
            <div className="p-3 rounded-2xl border" style={{ backgroundColor: surfaceColor, borderColor: 'rgba(200,168,91,0.2)' }}>
              <span className="block opacity-70">الكلمات الصحيحة</span>
              <span className="text-lg font-bold text-[#123B2A]">
                {verification.correctCount} / {verification.totalWords}
              </span>
            </div>
            <div className="p-3 rounded-2xl border" style={{ backgroundColor: surfaceColor, borderColor: 'rgba(200,168,91,0.2)' }}>
              <span className="block opacity-70">الأخطاء المكتشفة</span>
              <span className={`text-lg font-bold ${verification.hasErrors ? 'text-rose-600' : 'text-emerald-700'}`}>
                {verification.words.filter((w) => w.status === 'incorrect').length}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <footer
          className="p-4 border-t flex items-center justify-between gap-3"
          style={{
            backgroundColor: surfaceColor,
            borderColor: 'rgba(200,168,91,0.2)',
          }}
        >
          <button
            type="button"
            onClick={resetRecitation}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[#123B2A]/20 hover:bg-[#123B2A]/5 transition-colors cursor-pointer"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            🔄 إعادة التسميع
          </button>

          <div className="flex items-center gap-2">
            {onNextVerse && hasNextVerse && (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoadingVerse}
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#C8A85B]/60 bg-[#C8A85B]/20 text-[#123B2A] hover:bg-[#C8A85B]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs active:scale-95"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
                title="الانتقال للآية التالية"
              >
                <span>الآية التالية</span>
                <span>⬅️</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95"
              style={{
                backgroundColor: '#123B2A',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              تم وإغلاق
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
