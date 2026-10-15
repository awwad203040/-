import { NextResponse } from 'next/server';
import { getTafsirs } from '@/lib/quran-foundation';

export async function GET() {
  try {
    const tafsirs = await getTafsirs();
    return NextResponse.json({ tafsirs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching tafsirs:', message);
    return NextResponse.json({ error: 'تعذر تحميل التفاسير' }, { status: 500 });
  }
}
