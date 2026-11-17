import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 19,
    versionName: '3.7.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-17',
    title: 'قص الأذان والوقوف التام عند لا إله إلا الله',
    notes: 'تم فحص وقص ملف الأذان بصوت الشيخ محمد جازي بدقة متناهية ليقف فور اكتمال جملة "لا إله إلا الله" وحذف أي عبارة تليها نهائياً مع المحافظة على كافة الإعدادات والميزات السابقة.',
  });
}
