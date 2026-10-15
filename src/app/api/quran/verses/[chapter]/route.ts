import { NextRequest, NextResponse } from 'next/server';
import { getVersesByChapter } from '@/lib/quran-foundation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chapter: string }> }
) {
  try {
    const { chapter } = await params;
    const chapterNum = parseInt(chapter, 10);
    if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 114) {
      return NextResponse.json({ error: 'رقم سورة غير صالح' }, { status: 400 });
    }
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const data = await getVersesByChapter(chapterNum, page);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching verses:', message);
    return NextResponse.json({ error: 'تعذر تحميل الآيات' }, { status: 500 });
  }
}
