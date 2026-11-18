import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 21,
    versionName: '3.7.2',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-18',
    title: 'إضافة فحص وتفعيل صلاحية الوضع الصامت بعد الأذان وضمان عودة الرنين',
    notes: 'إضافة بطاقة وزر فحص مباشر لصلاحية عدم الإزعاج لتحويل الهاتف للصامت لمدة 20 دقيقة بعد انتهاء الأذان، مع ضمان حماية واستعادة رنين الهاتف الطبيعي بالكامل فور انتهاء الـ 20 دقيقة.',
  });
}
