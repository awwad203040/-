import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    versionCode: 18,
    versionName: '3.6.0',
    apkUrl: 'https://awwad2030.vercel.app/Noor-AlQuran.apk',
    releaseDate: '2026-11-17',
    title: 'تناسق توقيت مواقيت الصلاة وأزرار سورة التلاوة',
    notes: 'ضبط شاشة التوقيت في مواقيت الصلاة لتظهر الساعة والدقائق والثواني بجانب بعضهم بتنسيق أفقي متناسق وأنيق، وضبط أزرار سورة التلاوة بحيث تظهر السورة التالية واسم السورة والسورة السابقة بجانب بعضهم بتناسق كامل ودون أي تداخل، مع الحفاظ الكامل على كافة الإعدادات والمميزات السابقة.',
  });
}
