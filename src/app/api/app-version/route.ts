import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 14,
    versionName: '3.2.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-15',
    title: 'طلب كافة الصلاحيات تلقائياً فور التثبيت وإزالة نافذة الإصلاح',
    notes: 'حذف نافذة وبطاقة (التطبيق لا يعمل معي - إصلاح) ومنح التطبيق كافة الصلاحيات تلقائياً عند التثبيت ليعمل في الخلفية بسلاسة تامة.',
  });
}
