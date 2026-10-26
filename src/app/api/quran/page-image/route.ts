import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy API for Quran page images to:
 * 1. Ensure full CORS support (Access-Control-Allow-Origin: *) for all mobile browsers & WebViews.
 * 2. Allow clients to fetch clean non-opaque Blobs to store in IndexedDB without 7MB opaque padding.
 * 3. Provide long-term caching headers for maximum performance.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');

    if (!pageParam) {
      return NextResponse.json({ error: 'Page number is required' }, { status: 400 });
    }

    const pageNum = parseInt(pageParam, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      return NextResponse.json({ error: 'Page number must be between 1 and 604' }, { status: 400 });
    }

    const pad = pageNum.toString().padStart(3, '0');
    const primaryUrl = `https://files.quran.app/hafs/madani/width_1024/page${pad}.png`;
    const fallbackUrl = `https://android.quran.com/data/width_1024/page${pad}.png`;

    let imageRes: Response;
    try {
      imageRes = await fetch(primaryUrl, {
        next: { revalidate: 31536000 },
        headers: { 'User-Agent': 'NoorAlQuran/1.0' },
      });
      if (!imageRes.ok) {
        imageRes = await fetch(fallbackUrl, {
          next: { revalidate: 31536000 },
          headers: { 'User-Agent': 'NoorAlQuran/1.0' },
        });
      }
    } catch {
      imageRes = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'NoorAlQuran/1.0' },
      });
    }

    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch page image' }, { status: 502 });
    }

    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (error) {
    console.error('Error proxying page image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
