import { NextResponse } from 'next/server';
import { getReciters } from '@/lib/quran-foundation';
import { POPULAR_RECITERS } from '@/lib/quran-meta';

export async function GET() {
  try {
    const rawReciters = await getReciters();
    // Normalize reciters data from Quran Foundation
    const normalized = (Array.isArray(rawReciters) ? rawReciters : []).map((r: Record<string, unknown>) => {
      const translatedName = r.translated_name as { name?: string } | undefined;
      const arabicName = translatedName?.name || (r.name as string) || (r.reciter_name as string) || `قارئ ${r.id}`;
      const englishName = (r.reciter_name as string) || (r.style as string) || '';
      return {
        id: Number(r.id),
        name: arabicName,
        englishName,
      };
    });

    // Start with POPULAR_RECITERS with authentic Arabic titles
    const existingIds = new Set(POPULAR_RECITERS.map((p) => p.id));
    const merged = [...POPULAR_RECITERS];

    for (const r of normalized) {
      if (!existingIds.has(r.id) && r.name && r.id > 0) {
        merged.push({
          id: r.id,
          name: r.name,
          englishName: r.englishName || '',
        });
        existingIds.add(r.id);
      }
    }

    return NextResponse.json({ reciters: merged });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching reciters:', message);
    // Fallback to verified POPULAR_RECITERS list
    return NextResponse.json({ reciters: POPULAR_RECITERS });
  }
}
