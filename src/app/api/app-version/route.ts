import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 11,
    versionName: '2.9.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-12',
    title: 'تحديث صوت الأذان: التوقف التام فور (لا إله إلا الله) وحذف أي زيادات صوتية بعدها',
    notes: 'حذف الجملة المنطوقة بعد الأذان (وصلى الله على سيدنا محمد...) بالكامل، وجعل صوت الأذان يقف فوراً وبدقة عند (لا إله إلا الله).',
  });
}
