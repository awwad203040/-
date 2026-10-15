'use client';

interface AudioPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  surahName: string;
  reciterName: string;
  playbackRate: number;
  isRepeat: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSetSpeed: (speed: number) => void;
  onToggleRepeat: () => void;
  onClose: () => void;
  onOpenReciterSelect?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  isPlaying,
  currentTime,
  duration,
  isLoading,
  surahName,
  reciterName,
  playbackRate,
  isRepeat,
  onTogglePlay,
  onSeek,
  onSetSpeed,
  onToggleRepeat,
  onClose,
  onOpenReciterSelect,
}: AudioPlayerProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const nextSpeed = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length] || 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      style={{ backgroundColor: '#123B2A', color: 'white' }}
    >
      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-pointer"
        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onSeek(ratio * duration);
        }}
      >
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${progress}%`, backgroundColor: '#C8A85B' }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ fontFamily: "'Amiri', serif" }}>
            {surahName}
          </p>
          <button
            type="button"
            onClick={onOpenReciterSelect}
            className="text-xs opacity-80 hover:opacity-100 truncate hover:underline flex items-center gap-1"
            title="تغيير القارئ"
          >
            <span>{reciterName}</span>
            <span className="text-[10px]" style={{ color: '#C8A85B' }}>▾</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Speed */}
          <button
            onClick={() => onSetSpeed(nextSpeed)}
            className="text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(200,168,91,0.2)', color: '#C8A85B' }}
            aria-label={`سرعة ${playbackRate}x`}
          >
            {playbackRate}x
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            className={`p-2 rounded-full transition-colors ${isRepeat ? '' : 'opacity-50'}`}
            style={isRepeat ? { color: '#C8A85B' } : {}}
            aria-label="تكرار"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            disabled={isLoading}
            className="p-3 rounded-full transition-colors"
            style={{ backgroundColor: '#C8A85B' }}
            aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="إغلاق"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Time */}
        <div className="text-xs opacity-70 min-w-[70px] text-left" dir="ltr">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
