import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 4,
    versionName: '2.2.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-05',
    title: 'تحديث شريط مواقيت الصلاة والأذان الدائم كـ صلاتك',
    notes: 'ظهور دائم لشريط الصلاة مع لون أحمر عالي الوضوح، تحديث تلقائي للدقائق والثواني، وعدم الاختفاء عند مسح الإشعارات.',
  });
}
