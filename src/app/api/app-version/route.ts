import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 9,
    versionName: '2.7.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-12',
    title: 'تحديث شامل: خدمة الخلفية الدائمة للصلاة على النبي عند فتح الجوال (مثل الشفيع) وحل مشكلة إغلاق التطبيق',
    notes: 'نطق (صلي على النبي محمد) عند قفل وفتح الجوال حتى والتطبيق مغلق تماماً عبر خدمة أندرويد الدائمة، مع إضافة نافذة إصلاح قيود البطارية والتشغيل التلقائي مثل تطبيق الشفيع.',
  });
}
