'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'developer'>('pwa');

  useEffect(() => {
    // Detect if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('لتثبيت التطبيق مباشرة على أندرويد:\n1. افتح خيارات المتصفح (⋮) في أعلى الشاشة.\n2. اضغط على "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden text-right border border-[#C8A85B]/40 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#FBF8EF', color: '#17231D' }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#123B2A]/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#123B2A] flex items-center justify-center text-2xl shadow-sm">
              📱
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تثبيت تطبيق نور القرآن على الأندرويد
              </h2>
              <p className="text-xs opacity-70" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                نسخة الهاتف المحمول (Android APK & PWA)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-black/5 text-[#17231D]/60"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#123B2A]/8 p-1 rounded-2xl mt-4 mb-5 text-xs font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              activeTab === 'pwa'
                ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm'
                : 'text-[#123B2A] opacity-70 hover:opacity-100'
            }`}
          >
            التثبيت الفوري (WebAPK) ⚡
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              activeTab === 'apk'
                ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm'
                : 'text-[#123B2A] opacity-70 hover:opacity-100'
            }`}
          >
            ملف APK مباشر 📦
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center ${
              activeTab === 'developer'
                ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm'
                : 'text-[#123B2A] opacity-70 hover:opacity-100'
            }`}
          >
            مشروع Gradle 🛠️
          </button>
        </div>

        {/* Tab 1: PWA / WebAPK */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#C8A85B]/30 shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="font-bold text-sm text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  التثبيت المباشر على الهاتف (أسهل وأسرع طريقة)
                </h3>
              </div>
              <p className="text-xs leading-relaxed opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                يقوم نظام الأندرويد تلقائياً بإنشاء حزمة <strong>WebAPK</strong> وتثبيتها في قائمة التطبيقات بهاتفك مع أيقونة رسمية كاملة، وتعمل بدون شريط المتصفح ومع دعم القراءة أوفلاين.
              </p>
            </div>

            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center">
                ✓ التطبيق مثبت بالفعل على هذا الجهاز ويعمل بنجاح.
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer"
                style={{
                  backgroundColor: '#123B2A',
                  color: '#C8A85B',
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                <span>📲</span>
                <span>تثبيت التطبيق على الهاتف الآن</span>
              </button>
            )}

            <div className="p-4 rounded-2xl bg-[#123B2A]/5 text-xs text-[#17231D]/80 space-y-1.5">
              <p className="font-bold text-[#123B2A]">طريقة التثبيت اليدوية من متصفح كروم / سامسونج:</p>
              <p>1. اضغط على قائمة الخيارات (نقاط القائمة الثلاث <strong>⋮</strong> أعلى المتصفح).</p>
              <p>2. اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</p>
              <p>3. ستظهر أيقونة المصحف «نور القرآن» مباشرة في شاشة التطبيقات كأي تطبيق أندرويد أصيل.</p>
            </div>
          </div>
        )}

        {/* Tab 2: Standalone APK */}
        {activeTab === 'apk' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#C8A85B]/30 shadow-xs space-y-2">
              <h3 className="font-bold text-sm text-[#123B2A] flex items-center gap-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                <span>📦</span>
                <span>توليد ملف APK جاهز للتثبيت (.apk)</span>
              </h3>
              <p className="text-xs leading-relaxed opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تم تجهيز وضبط ملف المانيفست (Manifest) وأيقونات التطبيق بدقة فائقة لتوليد ملف APK جاهز في ثوانٍ معدودة عبر خدمة <strong>PWABuilder الرسمية من مايكروسوفت</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#C8A85B]/15 border border-[#C8A85B]/40 text-xs text-[#123B2A] space-y-2">
              <p className="font-bold">خطوات الحصول على ملف الـ APK فوراً:</p>
              <p>1. ارفع التطبيق أو رابطه إلى Vercel أو نطاقك الخاص (أو استخدم ngrok للرابط المحلي).</p>
              <p>2. افتح الرابط في أداة: <a href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" className="font-bold underline text-[#0B5B43]">PWABuilder.com</a></p>
              <p>3. اضغط على <strong>«Build My App»</strong> ثم اختر <strong>«Android»</strong>.</p>
              <p>4. ستحصل فوراً على ملف <strong>.apk</strong> موقع وجاهز للتثبيت المباشر على أي هاتف أندرويد.</p>
            </div>
          </div>
        )}

        {/* Tab 3: Developer / Gradle Project */}
        {activeTab === 'developer' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#C8A85B]/30 shadow-xs space-y-2">
              <h3 className="font-bold text-sm text-[#123B2A] flex items-center gap-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                <span>⚙️</span>
                <span>مشروع أندرويد الأصيل (Android Studio & Gradle)</span>
              </h3>
              <p className="text-xs leading-relaxed opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تم بالفعل إنشاء مشروع أندرويد كامل داخل مجلد <code>android/</code> متوافق مع Android Studio ومع كافة الصلاحيات (الميكروفون لتصحيح التلاوة، الصوت، وضع اليقظة).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-900 text-gray-100 text-xs font-mono rounded-xl space-y-1.5" dir="ltr">
              <p className="text-gray-400"># 1. Open project in Android Studio:</p>
              <p className="text-emerald-400">File &gt; Open &gt; scratch/noor-alquran/android</p>
              <p className="text-gray-400 mt-2"># 2. Or build APK from command line:</p>
              <p className="text-emerald-400">cd android &amp;&amp; ./gradlew assembleDebug</p>
              <p className="text-gray-400 mt-2"># 3. Output APK location:</p>
              <p className="text-yellow-400">android/app/build/outputs/apk/debug/app-debug.apk</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#123B2A]/5 text-xs text-[#17231D]/80">
              <p className="font-bold text-[#123B2A] mb-1">🤖 البناء التلقائي عبر GitHub Actions:</p>
              <p>تم إعداد ملف العمل <code>.github/workflows/build-apk.yml</code>، بحيث يتم بناء ملف الـ APK تلقائياً في السحابة بمجرد رفع الكود على GitHub، ويمكن تحميله من قسم Artifacts مباشرة.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
