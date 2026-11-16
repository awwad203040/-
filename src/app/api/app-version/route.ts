import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 15,
    versionName: '3.3.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-16',
    title: 'تخصيص تسجيلات الشيخ محمد رفعت الإذاعية وقص الآذان والصامت التلقائي',
    notes: 'حل مشكلة تداخل صوت الشيخ المنشاوي عند تشغيل الشيخ محمد رفعت وتوضيح التسجيلات الـ 31 النادرة للإذاعة، وقص جملة وصلى الله على سيدنا محمد بعد الآذان، وتفعيل الصامت التلقائي لمدة 20 دقيقة بعد الآذان.',
  });
}
