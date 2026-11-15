import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 13,
    versionName: '3.1.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-15',
    title: 'تشغيل صوت الشيخ محمد رفعت (قيثارة السماء)',
    notes: 'إصلاح وضبط سيرفرات تلاوة الشيخ محمد رفعت عبر شبكة CDN المباشرة وضمان عملها بسلاسة.',
  });
}
