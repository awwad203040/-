import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 5,
    versionName: '2.3.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-08',
    title: 'تحديث التوافق الشامل مع شاشات الجوال والتحديث التلقائي',
    notes: 'ضبط وتوسيط جميع النوافذ المنبثقة لتلائم كافة شاشات الهواتف بدقة تامة، مع ميزة التحديث التلقائي الفوري عند فتح التطبيق.',
  });
}
