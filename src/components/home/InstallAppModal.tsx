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
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    // Detect if already running as standalone PWA
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
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
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowManualGuide(true);
      }
    } else {
      setShowManualGuide(true);
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
            <img
              src="/logo.png"
              alt="نور القرآن"
              className="w-14 h-14 rounded-2xl border-2 border-[#C8A85B]/50 shadow-md object-cover"
            />
            <div>
              <h2 className="text-xl font-bold text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تثبيت تطبيق نور القرآن
              </h2>
              <p className="text-xs opacity-70" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                التثبيت الفوري المباشر على الهاتف (WebAPK) دون الحاجة لملفات خارجية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-black/5 text-[#17231D]/60 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#123B2A]/8 p-1 rounded-2xl mt-4 mb-5 text-xs font-bold" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center cursor-pointer ${
              activeTab === 'pwa'
                ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm'
                : 'text-[#123B2A] opacity-70 hover:opacity-100'
            }`}
          >
            التثبيت الفوري (WebAPK) ⚡
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center cursor-pointer ${
              activeTab === 'apk'
                ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm'
                : 'text-[#123B2A] opacity-70 hover:opacity-100'
            }`}
          >
            ملف APK مباشر 📦
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`flex-1 py-2.5 rounded-xl transition-all text-center cursor-pointer ${
              activeTab === 'developer'
                ? 'bg-[#123B2A] text-[#C8A85B] shadow-sm'
                : 'text-[#123B2A] opacity-70 hover:opacity-100'
            }`}
          >
            مشروع Gradle 🛠️
          </button>
        </div>

        {/* Tab 1: PWA / WebAPK (التثبيت الفوري) */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#C8A85B]/30 shadow-xs">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚡</span>
                <h3 className="font-bold text-sm text-[#123B2A]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                  التثبيت الفوري بنقرة واحدة (WebAPK الرسمي)
                </h3>
              </div>
              <p className="text-xs leading-relaxed opacity-85" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                يقوم متصفح هاتفك تلقائياً بتثبيت تطبيق <strong>نور القرآن</strong> في قائمة التطبيقات على شاشة جهازك كأي تطبيق رسمي، مع حفظ كافة صفحاتك وإعداداتك وتحديثاتها التلقائية، وبدون الحاجة لتنزيل ملفات APK.
              </p>
            </div>

            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center">
                ✓ التطبيق مثبت بالفعل على هذا الجهاز ويعمل بنجاح.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98 cursor-pointer bg-gradient-to-r from-[#123B2A] via-[#0E4933] to-[#123B2A] text-[#C8A85B] border border-[#C8A85B]/50 hover:brightness-110"
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              >
                <span className="text-xl">📲</span>
                <span>تثبيت تطبيق نور القرآن فورياً على الجوال</span>
              </button>
            )}

            {/* Illustrated Instant Guide for Chrome / Samsung Browser */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-300/80 text-xs text-[#123B2A] space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                <span>💡</span>
                <span>طريقة التثبيت الفوري من المتصفح مباشرة:</span>
              </div>
              <div className="space-y-1.5 text-xs text-amber-950/90 leading-relaxed pr-1">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#123B2A]">1.</span>
                  <span>اضغط على قائمة المتصفح (نقاط الخيارات الثلاث <strong>⋮</strong> في أعلى زاوية الشاشة).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#123B2A]">2.</span>
                  <span>اختر من القائمة: <strong>«تثبيت التطبيق» (Install app)</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#123B2A]">3.</span>
                  <span>سيتم تثبيت أيقونة نور القرآن الرسمية فوراً على جوالك، وتعمل معك دائماً مع حفظ كامل الإعدادات!</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Standalone APK */}
        {activeTab === 'apk' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#C8A85B]/30 shadow-xs space-y-2">
              <h3 className="font-bold text-sm text-[#123B2A] flex items-center gap-2" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                <span>📦</span>
                <span>تحميل ملف APK المباشر للأندرويد (.apk)</span>
              </h3>
              <p className="text-xs leading-relaxed opacity-80" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                ملف APK رسمي مجهز بأعلى كفاءة ويعمل مع محرك الأذكار في الخلفية (بحجم 16.7 ميجابايت).
              </p>
            </div>

            <a
              href="/api/download-apk"
              download="Noor-AlQuran.apk"
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer text-center block"
              style={{
                backgroundColor: '#123B2A',
                color: '#C8A85B',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              <span>📥</span>
              <span>تحميل تطبيق نور القرآن APK المحدث الآن</span>
            </a>

            <div className="p-4 rounded-2xl bg-[#C8A85B]/15 border border-[#C8A85B]/40 text-xs text-[#123B2A] space-y-2">
              <p className="font-bold">طريقة تثبيت ملف الـ APK:</p>
              <p>1. اضغط على زر التحميل أعلاه.</p>
              <p>2. بعد اكتمال التنزيل، افتح الملف واضغط على «تثبيت» (قد يطلب منك السماح بالتثبيت من هذا المصدر).</p>
              <p>3. سيتم تثبيت التطبيق ويعمل مباشرة مع الحفاظ التام على تقدمك وإعداداتك.</p>
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
                تم بالفعل إنشاء مشروع أندرويد كامل داخل مجلد <code>android/</code> متوافق مع Android Studio ومع كافة الصلاحيات.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-900 text-gray-100 text-xs font-mono rounded-xl space-y-1.5" dir="ltr">
              <p className="text-gray-400"># 1. Open project in Android Studio:</p>
              <p className="text-emerald-400">File &gt; Open &gt; scratch/noor-alquran/android</p>
              <p className="text-gray-400 mt-2"># 2. Or build APK from command line:</p>
              <p className="text-emerald-400">cd android &amp;&amp; ./gradlew assembleRelease</p>
              <p className="text-yellow-400">Noor-AlQuran.apk</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
