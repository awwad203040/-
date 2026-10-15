import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'المصحف الشريف — نور القرآن',
  description: 'اقرأ القرآن الكريم مع نور القرآن | Quran Mushaf — Noor Al-Quran',
};

export default function MushafLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
