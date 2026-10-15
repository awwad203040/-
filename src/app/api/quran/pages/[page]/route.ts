import { NextRequest, NextResponse } from 'next/server';
import { getVersesByPage } from '@/lib/quran-foundation';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  try {
    const { page } = await params;
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      return NextResponse.json(
        { error: 'رقم صفحة غير صالح. يجب أن يكون بين 1 و 604' },
        { status: 400 }
      );
    }
    const verses = await getVersesByPage(pageNum);
    return NextResponse.json({ pageNumber: pageNum, verses, totalPages: 604 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching page:', message);
    return NextResponse.json({ error: 'تعذر تحميل الصفحة' }, { status: 500 });
  }
}
