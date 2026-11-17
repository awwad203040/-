import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 16,
    versionName: '3.4.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-17',
    title: 'ضبط نطق الصلاة على النبي عند فتح الجوال مرة واحدة بدقة',
    notes: 'ضبط التطبيق بحيث ينطق عبارة (صلي على النبي محمد) مرة واحدة فقط وبدقة فائقة عند فتح أو إضاءة شاشة الجوال، ومنع تكرار الصوت أو تداخله نهائياً مع الحفاظ على جميع الإعدادات والمميزات.',
  });
}
