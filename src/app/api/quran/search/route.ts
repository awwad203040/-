import { NextRequest, NextResponse } from 'next/server';
import { searchQuran } from '@/lib/quran-foundation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'الرجاء إدخال نص للبحث' }, { status: 400 });
    }
    const results = await searchQuran(query, page);
    return NextResponse.json({ search: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error searching:', message);
    return NextResponse.json({ error: 'تعذر البحث' }, { status: 500 });
  }
}
