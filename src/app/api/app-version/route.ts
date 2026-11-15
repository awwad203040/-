import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 12,
    versionName: '3.0.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-15',
    title: 'تحديث التحكم الكامل بالصوت من الإشعارات وإضافة مصحف الشيخ محمد رفعت والتحميل التلقائي للمصحف',
    notes: 'إصلاح كامل لأزرار التحكم بالصوت من شريط إشعارات أندرويد، حل مشكلة تأخر فتح التطبيق وتكرار تحميل التحديث، إضافة مصحف الشيخ محمد رفعت، والتحميل التلقائي لمصحف القراءة ومصحف الشيخ المنشاوي دون اتصال.',
  });
}
