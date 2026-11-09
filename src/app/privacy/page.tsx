import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية — تطبيق نور القرآن',
  description: 'سياسة الخصوصية وحماية بيانات المستخدمين لتطبيق نور القرآن الكريم',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FBF8EF] text-[#17231D] py-10 px-4 sm:px-6 md:px-12" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-[#C8A85B]/40 space-y-6">
        {/* Header */}
        <div className="text-center pb-6 border-b border-[#C8A85B]/30">
          <div className="w-16 h-16 rounded-2xl bg-[#123B2A] text-[#C8A85B] flex items-center justify-center text-3xl mx-auto mb-3 shadow-md">
            📖
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#123B2A]" style={{ fontFamily: "'Amiri', serif" }}>
            سياسة الخصوصية — تطبيق نور القرآن
          </h1>
          <p className="text-xs sm:text-sm text-[#C8A85B] font-bold mt-1">
            Privacy Policy — Noor Al-Quran Application
          </p>
          <p className="text-xs text-gray-500 mt-2">
            آخر تحديث: نوفمبر 2026
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#123B2A] flex items-center gap-2">
            <span>🛡️</span>
            <span>مقدمة والتزامنا بالخصوصية</span>
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            تطبيق <strong>«نور القرآن» (Noor Al-Quran)</strong> هو تطبيق إسلامي مجاني بالكامل خالي من الإعلانات، تم تطويره كـ <strong>صدقة جارية</strong> لخدمة كتاب الله عز وجل والمسلمين حول العالم. نؤكد التزامنا التام بحماية خصوصية وأمان مستخدمينا، وتوضيح كيفية التعامل مع أي بيانات.
          </p>
        </section>

        {/* Data Collection */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#123B2A] flex items-center gap-2">
            <span>🔒</span>
            <span>جمع واستخدام البيانات (Data Collection)</span>
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            <strong>نحن لا نجمع أو نشارك أو نبيع أي بيانات شخصية أو معلومات تعريفية بالمستخدم نهائياً.</strong>
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-gray-700 space-y-1.5 pr-2">
            <li><strong>تقدم القراءة والعلامات المرجعية:</strong> يتم تخزين موضع التوقف والعلامات المرجعية والأذكار محلياً فقط على جهاز المستخدم (Local Storage / IndexedDB) ولا تُرفع لأي خوادم خارجية.</li>
            <li><strong>التلاوات بدون إنترنت:</strong> عند تحميل سور أو صفحات المصحف للقراءة بدون نت، تُحفظ الملفات على جهاز المستخدم فقط.</li>
          </ul>
        </section>

        {/* Permissions */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#123B2A] flex items-center gap-2">
            <span>📱</span>
            <span>الأذونات المطلوبة والغرض منها (Permissions)</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="font-bold text-[#123B2A]">1. الاتصال بالإنترنت (INTERNET & ACCESS_NETWORK_STATE):</p>
              <p className="text-xs text-gray-600 mt-0.5">يُستخدم حصراً لتحميل تلاوات القرآن الكريم من المصادر الرسمية المعتمدة، وبث إذاعات القرآن الكريم، وتنزيل صفحات المصحف.</p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="font-bold text-[#123B2A]">2. التشغيل في الخلفية (FOREGROUND_SERVICE & WAKE_LOCK):</p>
              <p className="text-xs text-gray-600 mt-0.5">يُستخدم للسماح باستمرار الاستماع للتلاوة العطرة وإذاعات القرآن الكريم وأذكار الصباح والمساء عند قفل شاشة الهاتف أو الخروج من التطبيق.</p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="font-bold text-[#123B2A]">3. الإشعارات والمنبهات الدقيقة (POST_NOTIFICATIONS & SCHEDULE_EXACT_ALARM):</p>
              <p className="text-xs text-gray-600 mt-0.5">يُستخدم لتنبيهات مواقيت الصلاة والأذان، وأذكار الصباح والمساء، والتذكير بالورد اليومي وقراءة سورة الكهف يوم الجمعة.</p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="font-bold text-[#123B2A]">4. الميكروفون (RECORD_AUDIO - اختياري):</p>
              <p className="text-xs text-gray-600 mt-0.5">يُستخدم فقط عند تفعيل <strong>المساعد الصوتي للمكفوفين</strong> لنطق اسم السورة لتشغيلها بصوتك، أو في ميزة تصحيح التلاوة. لا يتم حفظ أو تسجيل أي صوت، وتتم المعالجة فورياً ولا تُخزن المقاطع الصوتية على أي خادم.</p>
            </div>
          </div>
        </section>

        {/* Children's Privacy */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#123B2A] flex items-center gap-2">
            <span>👶</span>
            <span>خصوصية الأطفال (Children&apos;s Privacy)</span>
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            تطبيق نور القرآن آمن ومناسب لجميع الأعمار بما في ذلك الأطفال وجميع أفراد الأسرة، حيث لا يحتوي على أي إعلانات، ولا يجمع أي معلومات، ومتوافق تماماً مع سياسات حماية الأطفال (COPPA).
          </p>
        </section>

        {/* Security & Third-Party */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#123B2A] flex items-center gap-2">
            <span>🌐</span>
            <span>خدمات الطرف الثالث والأمان</span>
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            يعتمد التطبيق على خوادم ومصادر موثوقة ومفتوحة مثل خوادم مجمع الملك فهد لطباعة المصحف الشريف وQuran Foundation وEveryAyah لجلب التلاوات القرآنية وبيانات السور. جميع الاتصالات مشفرة ببروتوكول الأمان العالي (HTTPS).
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-2 pt-4 border-t border-[#C8A85B]/30">
          <h2 className="text-lg font-bold text-[#123B2A] flex items-center gap-2">
            <span>📬</span>
            <span>التواصل والاستفسارات</span>
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            إذا كان لديك أي سؤال أو استفسار حول سياسة الخصوصية أو تطبيق نور القرآن، يسعدنا تواصلكم عبر البريد الإلكتروني:
          </p>
          <div className="p-3 rounded-xl bg-[#123B2A]/10 border border-[#123B2A]/20 text-center font-bold text-sm text-[#123B2A]">
            support@nooralquran.app
          </div>
        </section>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-[#123B2A] text-white hover:bg-[#0B5B43] transition shadow-md"
          >
            <span>←</span>
            <span>العودة للصفحة الرئيسية للتطبيق</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
