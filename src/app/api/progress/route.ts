import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ progress: null, message: 'Use client-side localStorage for guest mode' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { pageNumber?: number; surahNumber?: number; ayahNumber?: number };
    const { pageNumber, surahNumber, ayahNumber } = body;
    if (!pageNumber || pageNumber < 1 || pageNumber > 604) {
      return NextResponse.json({ error: 'رقم صفحة غير صالح' }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      progress: { pageNumber, surahNumber, ayahNumber, updatedAt: new Date().toISOString() }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving progress:', message);
    return NextResponse.json({ error: 'تعذر حفظ تقدم القراءة' }, { status: 500 });
  }
}
