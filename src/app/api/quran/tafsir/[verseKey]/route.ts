import { NextRequest, NextResponse } from 'next/server';
import { getTafsir } from '@/lib/quran-foundation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ verseKey: string }> }
) {
  try {
    const { verseKey } = await params;
    const searchParams = request.nextUrl.searchParams;
    const tafsirId = parseInt(searchParams.get('tafsir_id') || '169', 10);
    const tafsir = await getTafsir(tafsirId, verseKey);
    return NextResponse.json({ tafsir });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching tafsir:', message);
    return NextResponse.json({ error: 'تعذر تحميل التفسير' }, { status: 500 });
  }
}
