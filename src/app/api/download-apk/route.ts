import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Use high-speed GitHub raw mirror as primary reliable host for 75MB APK
  const githubApkUrl = 'https://github.com/awwad203040/awwad2030/raw/main/public/Noor-AlQuran.apk';
  
  return NextResponse.redirect(githubApkUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
