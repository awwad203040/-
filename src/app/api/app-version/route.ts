import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 6,
    versionName: '2.4.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-10',
    title: 'تحديث تناسق التصميم والتحديث التلقائي الفوري عند الفتح',
    notes: 'توحيد لون نافذة تقدمك في القراءة مع باقي النوافذ بنمط العاج والذهب الملكي، وتفعيل التحديث التلقائي الذاتي عند فتح التطبيق مع الحفاظ الكامل على كافة الإعدادات والبيانات.',
  });
}
