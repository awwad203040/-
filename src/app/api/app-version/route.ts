import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 22,
    versionName: '3.7.3',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-18',
    title: 'تحديث مؤقت إشعار الصلاة بالأحمر (ساعة تصاعدي ثم تنازلي للصلاة القادمة)',
    notes: 'إظهار الوقت المنقضي بعد الأذان باللون الأحمر لمدة ساعة، ثم التحول تلقائياً إلى عد تنازلي للوقت المتبقي على الصلاة القادمة مع الحفاظ على جميع الإعدادات.',
  });
}
