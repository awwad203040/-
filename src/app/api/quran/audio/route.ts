import { NextRequest, NextResponse } from 'next/server';
import { getChapterRecitation, getAyahRecitation } from '@/lib/quran-foundation';
import { getDirectReciterAudioUrl, getFallbackReciterAudioUrl } from '@/lib/quran-meta';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reciterId = parseInt(searchParams.get('reciter') || '7', 10);
    const verseKey =
      searchParams.get('verse') ||
      searchParams.get('verse_key') ||
      searchParams.get('verseKey');

    // If verseKey is provided, fetch verse audio
    if (verseKey) {
      const audioFile = await getAyahRecitation(reciterId, verseKey);
      if (!audioFile) {
        return NextResponse.json({ error: 'تعذر العثور على تلاوة الآية' }, { status: 404 });
      }
      const audioUrl = audioFile.audio_url || audioFile.url;
      return NextResponse.json({
        audioUrl,
        audio_file: audioFile,
      });
    }

    const chapterId = parseInt(searchParams.get('chapter') || '1', 10);
    if (isNaN(chapterId) || chapterId < 1 || chapterId > 114) {
      return NextResponse.json({ error: 'رقم سورة غير صالح' }, { status: 400 });
    }

    const directUrl = getDirectReciterAudioUrl(reciterId, chapterId);
    const fallbackUrl = getFallbackReciterAudioUrl(reciterId, chapterId);

    let audioFile: Record<string, unknown> | null = null;
    try {
      audioFile = await getChapterRecitation(reciterId, chapterId);
    } catch {
      // API fallback
    }

    const audioUrl = (audioFile?.audio_url as string) || (audioFile?.url as string) || directUrl;

    return NextResponse.json({
      audioUrl,
      fallbackUrl,
      audio_file: audioFile || { audio_url: audioUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching audio:', message);
    return NextResponse.json({ error: 'تعذر تحميل التلاوة' }, { status: 500 });
  }
}
