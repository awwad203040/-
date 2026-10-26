'use client';

import { useState, useEffect, useMemo, useId, useCallback } from 'react';
import { POPULAR_RECITERS, SURAH_METADATA } from '@/lib/quran-meta';
import {
  isAudioDownloaded,
  downloadSurahAudio,
  deleteOfflineAudio,
  getDownloadedSurahsForReciter,
  getDownloadedAudioTotalSize,
} from '@/lib/offline-audio-manager';

interface OfflineAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId: number;
  currentSurah?: number;
  onSelectReciter?: (id: number) => void;
}

export default function OfflineAudioModal({
  isOpen,
  onClose,
  selectedReciterId,
  currentSurah = 1,
  onSelectReciter,
}: OfflineAudioModalProps) {
  const [activeReciterId, setActiveReciterId] = useState<number>(selectedReciterId);
  const [downloadedSurahs, setDownloadedSurahs] = useState<number[]>([]);
  const [downloadingSurah, setDownloadingSurah] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [batchDownloading, setBatchDownloading] = useState<boolean>(false);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const [totalSizeMB, setTotalSizeMB] = useState<string>('0');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const titleId = useId();

  const allSurahs = useMemo(() => Object.values(SURAH_METADATA), []);
  const currentReciter = POPULAR_RECITERS.find((r) => r.id === activeReciterId) || POPULAR_RECITERS[0];

  const refreshDownloadedList = useCallback(async () => {
    const list = await getDownloadedSurahsForReciter(activeReciterId);
    setDownloadedSurahs(list);
    const bytes = await getDownloadedAudioTotalSize();
    setTotalSizeMB((bytes / (1024 * 1024)).toFixed(1));
  }, [activeReciterId]);

  useEffect(() => {
    setActiveReciterId(selectedReciterId);
  }, [selectedReciterId]);

  useEffect(() => {
    if (isOpen) {
      refreshDownloadedList();
    }
  }, [isOpen, refreshDownloadedList]);

  // Listen to external offline audio updates
  useEffect(() => {
    const handleUpdate = () => refreshDownloadedList();
    window.addEventListener('noor-offline-audio-updated', handleUpdate);
    return () => window.removeEventListener('noor-offline-audio-updated', handleUpdate);
  }, [refreshDownloadedList]);

  const handleDownloadSingle = async (surahNum: number) => {
    if (downloadingSurah !== null || batchDownloading) return;
    setDownloadingSurah(surahNum);
    setDownloadProgress(10);

    const success = await downloadSurahAudio(activeReciterId, surahNum, (p) => {
      setDownloadProgress(p);
    });

    setDownloadingSurah(null);
    setDownloadProgress(0);
    if (success) {
      await refreshDownloadedList();
    }
  };

  const handleDeleteSingle = async (surahNum: number) => {
    if (confirm(`هل ترغب في حذف التلاوة الصوتية لسورة ${SURAH_METADATA[surahNum]?.name || surahNum} لتوفير المساحة؟`)) {
      await deleteOfflineAudio(activeReciterId, surahNum);
      await refreshDownloadedList();
    }
  };

  const handleDownloadBatch = async (surahs: number[], label: string) => {
    if (batchDownloading || downloadingSurah !== null) return;
    const toDownload = surahs.filter((num) => !downloadedSurahs.includes(num));
    if (toDownload.length === 0) {
      alert('جميع هذه السور محملة بالفعل بدون إنترنت!');
      return;
    }

    setBatchDownloading(true);
    let done = 0;
    for (const num of toDownload) {
      setBatchStatus(`جاري تنزيل (${done + 1}/${toDownload.length}): سورة ${SURAH_METADATA[num]?.name || num}`);
      await downloadSurahAudio(activeReciterId, num);
      done++;
      await refreshDownloadedList();
    }
    setBatchDownloading(false);
    setBatchStatus('');
    alert(`تم بنجاح تنزيل ${label} بصوت الشيخ ${currentReciter.name}!`);
  };

  if (!isOpen) return null;

  const filteredSurahs = allSurahs.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return s.name.includes(q) || s.number.toString().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#123B2A] text-white rounded-3xl p-5 shadow-2xl border border-[#C8A85B]/40 flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📥</span>
            <div>
              <h3 id={titleId} className="font-bold text-base text-[#F7EED8]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تنزيل صوت الشيخ بدون إنترنت
              </h3>
              <p className="text-[11px] text-white/70">
                حفظ التلاوات في الذاكرة لتشغيلها عند انقطاع الشبكة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Sheikh Selector & Space Summary */}
        <div className="my-3 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-[#C8A85B] font-bold">اختر الشيخ:</label>
            <span className="text-[11px] text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              {downloadedSurahs.length} سورة محملة ({totalSizeMB} MB)
            </span>
          </div>

          <select
            value={activeReciterId}
            onChange={(e) => {
              const newId = parseInt(e.target.value, 10);
              setActiveReciterId(newId);
              if (onSelectReciter) onSelectReciter(newId);
            }}
            className="w-full bg-black/35 text-white font-bold text-xs p-2.5 rounded-xl border border-[#C8A85B]/50 focus:outline-none cursor-pointer"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            {POPULAR_RECITERS.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#123B2A] text-white">
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Batch Download Presets */}
        <div className="mb-3 flex flex-col gap-1.5 flex-shrink-0 bg-black/20 p-2.5 rounded-2xl border border-white/10">
          <span className="text-[10px] text-white/70 font-bold">تنزيل سريع بضغطة زر:</span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {/* Current Surah */}
            <button
              type="button"
              disabled={batchDownloading || downloadedSurahs.includes(currentSurah)}
              onClick={() => handleDownloadSingle(currentSurah)}
              className={`py-1.5 px-2 rounded-xl font-bold transition text-[11px] flex items-center justify-center gap-1 border ${
                downloadedSurahs.includes(currentSurah)
                  ? 'bg-emerald-600/40 text-emerald-200 border-emerald-500/40 cursor-default'
                  : 'bg-[#C8A85B] text-[#123B2A] hover:bg-[#d4b66d] border-[#C8A85B] cursor-pointer'
              }`}
            >
              <span>{downloadedSurahs.includes(currentSurah) ? '✓' : '📥'}</span>
              <span>السورة الحالية ({SURAH_METADATA[currentSurah]?.name || currentSurah})</span>
            </button>

            {/* Short Surahs & Mu'awwidhat (93 to 114) */}
            <button
              type="button"
              disabled={batchDownloading}
              onClick={() => {
                const arr = Array.from({ length: 22 }, (_, i) => 93 + i);
                handleDownloadBatch(arr, 'قصار السور والمعوذات');
              }}
              className="py-1.5 px-2 rounded-xl font-bold transition text-[11px] bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>📚</span>
              <span>قصار السور (93-114)</span>
            </button>

            {/* Popular Surahs (Yaseen, Kahf, Waqiah, Mulk, Rahman) */}
            <button
              type="button"
              disabled={batchDownloading}
              onClick={() => {
                handleDownloadBatch([18, 36, 55, 56, 67], 'السور الشهيرة والمنجيات');
              }}
              className="py-1.5 px-2 rounded-xl font-bold transition text-[11px] bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>⭐</span>
              <span>يس والكهف والواقعة والملك</span>
            </button>

            {/* Juz Amma (78 to 114) */}
            <button
              type="button"
              disabled={batchDownloading}
              onClick={() => {
                const arr = Array.from({ length: 37 }, (_, i) => 78 + i);
                handleDownloadBatch(arr, 'جزء عم كاملاً');
              }}
              className="py-1.5 px-2 rounded-xl font-bold transition text-[11px] bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>📖</span>
              <span>جزء عم كاملاً (37 سورة)</span>
            </button>
          </div>

          {/* Batch Status Indicator */}
          {batchDownloading && (
            <div className="mt-1 pt-1 border-t border-white/10 flex items-center gap-2 text-xs text-[#C8A85B] animate-pulse">
              <span className="w-3.5 h-3.5 border-2 border-[#C8A85B] border-t-transparent rounded-full animate-spin" />
              <span>{batchStatus}</span>
            </div>
          )}
        </div>

        {/* Search Surah in List */}
        <div className="relative mb-2 flex-shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن سورة لتنزيلها أو حذفها..."
            className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#C8A85B]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Surahs Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5 scrollbar-thin">
          {filteredSurahs.map((meta) => {
            const isDownloaded = downloadedSurahs.includes(meta.number);
            const isCurrentlyDownloading = downloadingSurah === meta.number;

            return (
              <div
                key={meta.number}
                className="pt-1.5 flex items-center justify-between py-1 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {meta.number}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-white block text-sm" style={{ fontFamily: "'Amiri', serif" }}>
                      سورة {meta.name}
                    </span>
                    <span className="text-[10px] text-white/60">
                      {meta.versesCount} آية • صفحة {meta.startPage}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isCurrentlyDownloading ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#C8A85B]/20 text-[#C8A85B] text-[11px] font-bold">
                      <span className="w-3 h-3 border-2 border-[#C8A85B] border-t-transparent rounded-full animate-spin" />
                      <span>{downloadProgress}%</span>
                    </div>
                  ) : isDownloaded ? (
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                        ✓ محملة بدون نت
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(meta.number)}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-red-300 transition cursor-pointer"
                        title="حذف هذه التلاوة لتوفير المساحة"
                      >
                        🗑
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={batchDownloading}
                      onClick={() => handleDownloadSingle(meta.number)}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#C8A85B] hover:text-[#123B2A] text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1 border border-white/15"
                    >
                      <span>📥</span>
                      <span>تنزيل</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
