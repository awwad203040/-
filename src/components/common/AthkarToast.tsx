'use client';

import type { VoiceThikr } from '@/types/athkar';

interface AthkarToastProps {
  thikr: VoiceThikr;
  onDismiss: () => void;
  onReplay?: (thikr: VoiceThikr) => void;
  isSpeaking?: boolean;
}

export default function AthkarToast({
  thikr,
  onDismiss,
  onReplay,
  isSpeaking = false,
}: AthkarToastProps) {
  if (!thikr) return null;
  return (
    <div
      className="fixed top-5 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50 transition-all duration-300"
      dir="rtl"
      style={{ animation: 'slideDown 0.35s ease-out' }}
    >
      <div
        className="rounded-3xl p-5 shadow-2xl border border-[#C8A85B]/60 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #123B2A 0%, #0B5B43 100%)',
        }}
      >
        {/* Soft decorative background glow */}
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-[#C8A85B]/15 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0 ${
                isSpeaking
                  ? 'bg-[#C8A85B] text-[#123B2A] ring-4 ring-[#C8A85B]/30 animate-pulse'
                  : 'bg-[#C8A85B]/20 text-[#C8A85B]'
              }`}
            >
              {isSpeaking ? '🔊' : '📿'}
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#C8A85B] block" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                ذكر صوتي مبارك • {thikr.categoryName}
              </span>
              <h4
                className="text-lg md:text-xl font-bold leading-relaxed text-white mt-0.5"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {thikr.textDisplay}
              </h4>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Virtue / Reward */}
        {thikr.virtue && (
          <p
            className="text-xs text-white/80 mt-2.5 pt-2.5 border-t border-white/10 leading-relaxed"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            <span className="text-[#C8A85B] font-bold">فضل الذكر: </span>
            <span>{thikr.virtue}</span>
          </p>
        )}

        {/* Replay action if available */}
        {onReplay && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onReplay(thikr)}
              className="text-xs px-3 py-1.5 rounded-xl bg-[#C8A85B] text-[#123B2A] font-bold hover:bg-[#d4b66d] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              <span>🔊 إعادة الاستماع</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
