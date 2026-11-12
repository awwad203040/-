import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 10,
    versionName: '2.8.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-12',
    title: 'تحديث التحكم بصوت الإذاعة والتلاوة: زر الإيقاف التام في شريط الإشعارات وشاشة القفل',
    notes: 'إضافة زر الإيقاف التام (إيقاف تام) لنافذة التحكم بالصوت في شريط الإشعارات وقفل الشاشة، مع إغلاق الإشعار وإيقاف البث المباشر فوراً عند الضغط على إيقاف أو إيقاف مؤقت للإذاعة.',
  });
}
