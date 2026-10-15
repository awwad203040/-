import { NextResponse } from 'next/server';
import { getChapters } from '@/lib/quran-foundation';

export async function GET() {
  try {
    const chapters = await getChapters();
    return NextResponse.json({ chapters });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching chapters:', message);
    return NextResponse.json({ error: 'تعذر تحميل السور' }, { status: 500 });
  }
}
