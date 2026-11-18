import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 23,
    versionName: '3.7.4',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-18',
    title: 'إيقاف فلاش الكاميرا أثناء الأذان وتخصيص فلاش إشعار الشاشة فقط',
    notes: 'إيقاف تشغيل فلاش الكاميرا أثناء الأذان، وجعل فلاش إشعار الشعار في أعلى الشاشة هو الوحيد الذي يعمل مع الحفاظ الكامل على كافة الإعدادات والميزات.',
  });
}
