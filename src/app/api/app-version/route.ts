import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 7,
    versionName: '2.5.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-10',
    title: 'تحديث نطق الصلاة على النبي عند فتح الجوال مثل تطبيق الشفيع والتحديث التلقائي',
    notes: 'ضبط مستشعر فتح وتشغيل شاشة الجوال لينطق بصوت ندي «صلي على النبي محمد» تماماً مثل تطبيق الشفيع مع مسار صوتي مضخم ومنع التعليق، مع الحفاظ على كافة الإعدادات السابقة.',
  });
}
