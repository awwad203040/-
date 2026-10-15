import { NextRequest, NextResponse } from 'next/server';
import { getChapterRecitation, getAyahRecitation } from '@/lib/quran-foundation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reciterId = parseInt(searchParams.get('reciter') || '7', 10);
    const verseKey = searchParams.get('verse_key') || searchParams.get('verseKey');

    // If verseKey is provided, fetch verse audio
    if (verseKey) {
      const audioFile = await getAyahRecitation(reciterId, verseKey);
      if (!audioFile) {
        return NextResponse.json({ error: 'تعذر العثور على تلاوة الآية' }, { status: 404 });
      }
      return NextResponse.json({ audio_file: audioFile });
    }

    const chapterId = parseInt(searchParams.get('chapter') || '1', 10);
    if (isNaN(chapterId) || chapterId < 1 || chapterId > 114) {
      return NextResponse.json({ error: 'رقم سورة غير صالح' }, { status: 400 });
    }
    const audioFile = await getChapterRecitation(reciterId, chapterId);
    return NextResponse.json({ audio_file: audioFile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching audio:', message);
    return NextResponse.json({ error: 'تعذر تحميل التلاوة' }, { status: 500 });
  }
}
