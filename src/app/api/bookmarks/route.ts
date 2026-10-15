import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ bookmarks: [], message: 'Use client-side localStorage for guest mode' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { surahNumber?: number; ayahNumber?: number; pageNumber?: number; verseKey?: string; note?: string };
    const { surahNumber, ayahNumber, pageNumber, verseKey } = body;
    if (!surahNumber || !ayahNumber || !pageNumber || !verseKey) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Bookmark saved' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving bookmark:', message);
    return NextResponse.json({ error: 'تعذر حفظ العلامة' }, { status: 500 });
  }
}
