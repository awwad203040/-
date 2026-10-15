'use client';

import { useState } from 'react';

interface MushafToolbarProps {
  currentPage: number;
  surahName: string;
  juzNumber?: number;
  hizbNumber?: number;
  onBack: () => void;
  onSettings: () => void;
  onSearch: () => void;
  onOpenCorrection?: () => void;
}

export default function MushafToolbar({
  currentPage,
  surahName,
  juzNumber,
  hizbNumber,
  onBack,
  onSettings,
  onSearch,
  onOpenCorrection,
}: MushafToolbarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 shadow-sm"
      style={{ backgroundColor: '#123B2A', color: 'white' }}
    >
      {/* Right side (RTL: back button) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="العودة"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
            نور القرآن
          </h1>
        </div>
      </div>

      {/* Center: Page info */}
      <div className="text-center">
        <div className="text-sm opacity-90">صفحة {currentPage}</div>
        <div className="text-xs opacity-75" style={{ fontFamily: "'Amiri', serif" }}>
          {surahName}
        </div>
        {juzNumber && (
          <div className="text-xs opacity-60">
            الجزء {juzNumber}
            {hizbNumber ? ` • الحزب ${hizbNumber}` : ''}
          </div>
        )}
      </div>

      {/* Left side (RTL: correction/search/settings) */}
      <div className="flex items-center gap-1.5">
        {onOpenCorrection && (
          <button
            onClick={onOpenCorrection}
            aria-label="تصحيح التلاوة والتسميع"
            title="تصحيح التلاوة والتسميع"
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#C8A85B]"
          >
            <span className="text-lg">🎙️</span>
          </button>
        )}
        <button
          onClick={onSearch}
          aria-label="بحث"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button
          onClick={onSettings}
          aria-label="الإعدادات"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
