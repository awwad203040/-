import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 20,
    versionName: '3.7.1',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-18',
    title: 'تأكيد وحماية كافة إعدادات المستخدم ومنع تغييرها تلقائياً',
    notes: 'حماية كاملة لإعدادات المستخدم وتفضيلاته، منع تحويل الهاتف للصامت عند تجربة الأذان، منع تغيير المدينة اليدوية بالخلفية، والتأكد التام من توقف الأذان عند لا إله إلا الله.',
  });
}
