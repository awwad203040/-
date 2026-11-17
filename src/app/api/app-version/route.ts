import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 17,
    versionName: '3.5.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-17',
    title: 'التعرف الصوتي على إذاعات القرآن الكريم للمكفوفين',
    notes: 'إتاحة التعرف الصوتي الذكي على نافذة إذاعات القرآن الكريم وتشغيل الإذاعات المباشرة بالصوت للمكفوفين (مثل: افتح إذاعة القرآن الكريم مصر، إذاعة السعودية، إذاعة المنشاوي، وغيرها) مع فتح نافذة الإذاعات والاستماع الفوري والحفاظ على كافة الإعدادات.',
  });
}
