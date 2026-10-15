import { NextRequest, NextResponse } from 'next/server';
import { getVerseByKey } from '@/lib/quran-foundation';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ verseKey: string }> }
) {
  try {
    const { verseKey } = await params;
    if (!verseKey || !verseKey.includes(':')) {
      return NextResponse.json({ error: 'رمز آية غير صالح' }, { status: 400 });
    }
    const verse = await getVerseByKey(verseKey);
    return NextResponse.json({ verse });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching verse:', message);
    return NextResponse.json({ error: 'تعذر تحميل الآية' }, { status: 500 });
  }
}
