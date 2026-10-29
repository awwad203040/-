import { NextRequest, NextResponse } from 'next/server';
import { getTafsir } from '@/lib/quran-foundation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ verseKey: string }> }
) {
  try {
    const { verseKey } = await params;
    const searchParams = request.nextUrl.searchParams;
    let tafsirId = parseInt(searchParams.get('tafsir_id') || '16', 10);
    // Auto-map legacy or misconfigured IDs
    if (tafsirId === 169 || isNaN(tafsirId)) tafsirId = 16; // Arabic Muyassar
    if (tafsirId === 92) tafsirId = 14; // Arabic Ibn Kathir
    const tafsir = await getTafsir(tafsirId, verseKey);
    return NextResponse.json({ tafsir });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching tafsir:', message);
    return NextResponse.json({ error: 'تعذر تحميل التفسير' }, { status: 500 });
  }
}
