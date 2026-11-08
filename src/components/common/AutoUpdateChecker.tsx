'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { downloadAndInstallNativeUpdate } from '@/lib/adhan-native-bridge';
import { forcePwaUpdate } from '@/components/PwaRegister';
import { triggerHaptic } from '@/lib/accessibility';

export const CURRENT_APP_VERSION_CODE = 5;
export const CURRENT_APP_VERSION_NAME = '2.3.0';

interface RemoteVersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseDate?: string;
  title?: string;
  notes?: string;
}

export default function AutoUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<RemoteVersionInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const performUpdate = useCallback(async (info: RemoteVersionInfo) => {
    setIsUpdating(true);
    setUpdateStatus('جاري تجهيز وتنزيل التحديث تلقائياً...');
    triggerHaptic('success');

    try {
      if (Capacitor.isNativePlatform()) {
        setUpdateStatus('جاري تنزيل ملف التحديث عبر مدير تنزيلات الأندرويد...');
        const res = await downloadAndInstallNativeUpdate(info.apkUrl);
        if (res && res.success) {
          setUpdateStatus('✅ تم بدء تنزيل التحديث، سيظهر إشعار التثبيت على جوالك الآن.');
        } else {
          setUpdateStatus('جاري توجيهك لتحميل التحديث مباشرة...');
          if (typeof window !== 'undefined') {
            window.location.href = info.apkUrl;
          }
        }
      } else {
        // PWA or Browser mode
        setUpdateStatus('جاري تحديث نسخة الويب وحفظ كافة بياناتك...');
        await forcePwaUpdate();
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 1200);
      }
    } catch {
      setUpdateStatus('جاري التحميل المباشر للتحديث...');
      if (typeof window !== 'undefined') {
        window.location.href = info.apkUrl;
      }
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
      }, 4000);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const checkUpdate = async () => {
      try {
        // First try the live production endpoint so even offline/cached builds detect new remote releases
        let res: Response | null = null;
        try {
          res = await fetch('https://awwad2030.vercel.app/api/app-version', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
          });
        } catch {
          // Fallback to relative endpoint
          res = await fetch('/api/app-version', { cache: 'no-store' });
        }

        if (!res || !res.ok) return;
        const data = (await res.json()) as RemoteVersionInfo;

        if (isCancelled || !data || !data.versionCode) return;

        // Check if remote version is higher than compiled app version
        const storedInstalledCode = typeof window !== 'undefined'
          ? parseInt(localStorage.getItem('noor_installed_version_code') || '0', 10)
          : 0;

        const effectiveCurrentCode = Math.max(CURRENT_APP_VERSION_CODE, storedInstalledCode);

        if (data.versionCode > effectiveCurrentCode) {
          setUpdateAvailable(data);
          setShowModal(true);

          // If on native mobile and update not dismissed in last 30 minutes, automatically initiate seamless update
          const lastAutoPrompt = typeof window !== 'undefined'
            ? parseInt(localStorage.getItem('noor_last_auto_update_prompt') || '0', 10)
            : 0;

          const now = Date.now();
          if (now - lastAutoPrompt > 30 * 60 * 1000) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('noor_last_auto_update_prompt', String(now));
            }
            // Trigger automatic download and install prompt
            performUpdate(data);
          }
        } else {
          // Synchronize local installed version code
          if (typeof window !== 'undefined') {
            localStorage.setItem('noor_installed_version_code', String(CURRENT_APP_VERSION_CODE));
          }
        }
      } catch {
        // Silent fail for network-less scenarios
      }
    };

    // Small delay after app startup for smooth launch rendering
    const timer = setTimeout(() => {
      checkUpdate();
    }, 1800);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [performUpdate]);

  if (!showModal || !updateAvailable) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-update-title"
      dir="rtl"
    >
      <div
        className="relative w-full max-w-md my-auto bg-gradient-to-b from-[#123B2A] to-[#0A2318] border-2 border-[#C8A85B] rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto flash-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8A85B]/40 pb-3 shrink-0 flash-modal-header">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">🚀</span>
            <div>
              <h2 id="auto-update-title" className="text-base sm:text-lg font-bold text-[#F7EED8]" style={{ fontFamily: "'Tajawal', sans-serif" }}>
                تحديث جديد متوفر للتطبيق
              </h2>
              <span className="text-[11px] text-[#C8A85B]">
                إصدار {updateAvailable.versionName} • تحديث فوري تلقائي
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
            aria-label="إغلاق نافذة التحديث"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-3.5 rounded-2xl bg-black/30 border border-[#C8A85B]/30 space-y-2">
            <p className="font-bold text-[#F7EED8] flex items-center gap-1.5">
              <span>🌟</span>
              <span>{updateAvailable.title || 'مميزات التحديث الجديد:'}</span>
            </p>
            <p className="text-white/80 leading-relaxed text-xs">
              {updateAvailable.notes || 'ضبط وتوسيط جميع النوافذ المنبثقة لتلائم كافة شاشات الهواتف بدقة تامة، مع ميزة التحديث التلقائي الفوري عند فتح التطبيق مع الحفاظ على كافة إعداداتك وموضع قراءتك.'}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-200 flex items-center gap-2">
            <span>🛡️</span>
            <span>جميع إعداداتك، موضع ختمتك، وأذكارك محفوظة بالكامل ولن تتأثر بالتحديث.</span>
          </div>

          {updateStatus && (
            <div className="p-3 rounded-xl bg-[#C8A85B]/15 border border-[#C8A85B]/50 text-[#F7EED8] text-xs flex items-center gap-2 animate-pulse">
              <span>⏳</span>
              <span>{updateStatus}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => performUpdate(updateAvailable)}
            disabled={isUpdating}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#C8A85B] text-[#123B2A] font-bold text-xs sm:text-sm hover:bg-[#d4b66d] active:scale-95 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            <span>{isUpdating ? '⏳' : '⚡'}</span>
            <span>{isUpdating ? 'جاري التحديث والتنزيل...' : 'تحديث فوري الآن'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm transition cursor-pointer"
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
