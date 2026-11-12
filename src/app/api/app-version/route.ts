import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 8,
    versionName: '2.6.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-12',
    title: 'تحديث شامل: إيقاف الأذان الدقيق، الفلاش بدون اهتزاز، إشعار التحكم بالصوت والتحديث التلقائي الصامت',
    notes: 'إيقاف صوت الأذان فوراً بعد كلمة لا إله إلا الله، تشغيل فلاش الكاميرا بدون أي اهتزاز، إشعار دائم للتحكم بالصوت مع أزرار التشغيل والإيقاف التام، ونطق الصلاة على النبي عند فتح الجوال.',
  });
}
