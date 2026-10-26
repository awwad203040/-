// Centralized Accessibility & Blind-Assistance Engine for Noor-AlQuran
// محرك إمكانية الوصول وخدمة المكفوفين وضعاف البصر

export interface AccessibilitySettings {
  blindMode: boolean; // وضع تسهيل الوصول للمكفوفين
  hapticFeedback: boolean; // الاهتزاز اللمسي الذكي
  voiceGuidance: boolean; // المساعد الصوتي الناطق
  speechRate: number; // سرعة النطق (1.0 = عادي)
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  blindMode: false,
  hapticFeedback: true,
  voiceGuidance: false,
  speechRate: 1.0,
};

const STORAGE_KEY = 'noor_accessibility_settings';

export function getAccessibilitySettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveAccessibilitySettings(settings: Partial<AccessibilitySettings>): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const current = getAccessibilitySettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// 1. الاهتزاز اللمسي الذكي (Haptic Feedback)
export type HapticType = 'tap' | 'play' | 'pause' | 'next' | 'prev' | 'repeat' | 'success' | 'alert';

export function triggerHaptic(type: HapticType = 'tap') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  const settings = getAccessibilitySettings();
  if (!settings.hapticFeedback) return;

  try {
    switch (type) {
      case 'tap':
        navigator.vibrate(30);
        break;
      case 'play':
        navigator.vibrate([40, 50, 40]); // نبضتان قصيرتان لبدء التشغيل
        break;
      case 'pause':
        navigator.vibrate(60); // نبضة واحدة للإيقاف
        break;
      case 'next':
        navigator.vibrate([25, 30, 25]);
        break;
      case 'prev':
        navigator.vibrate([25, 30, 25]);
        break;
      case 'repeat':
        navigator.vibrate([45, 35, 45, 35, 70]); // نمط مميز لدورة التكرار
        break;
      case 'success':
        navigator.vibrate([30, 50, 60]);
        break;
      case 'alert':
        navigator.vibrate([80, 50, 80]);
        break;
    }
  } catch {}
}

// 2. المساعد الصوتي الناطق للمكفوفين (Arabic Speech Synthesis)
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakAccessibility(text: string, options?: { force?: boolean; rate?: number }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const settings = getAccessibilitySettings();

  // لا ننطق إذا كان المساعد الصوتي ووضع المكفوفين غير مفعل، إلا لو كان force = true
  if (!settings.blindMode && !settings.voiceGuidance && !options?.force) return;

  try {
    window.speechSynthesis.cancel(); // إلغاء أي نطق سابق لتفادي التراكم

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = options?.rate || settings.speechRate || 1.0;
    utterance.pitch = 1.0;

    // محاولة انتقاء صوت عربي إن وجد
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((v) => v.lang.startsWith('ar') || v.lang.includes('Arabic'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

// 3. قارئ الشاشة الحي (Live ARIA Announcer للـ TalkBack)
export function announceToScreenReader(message: string, assertive = false) {
  if (typeof document === 'undefined') return;

  let announcer = document.getElementById('noor-screen-reader-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'noor-screen-reader-announcer';
    announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.margin = '-1px';
    announcer.style.padding = '0';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.border = '0';
    document.body.appendChild(announcer);
  }

  announcer.textContent = '';
  setTimeout(() => {
    if (announcer) {
      announcer.textContent = message;
    }
  }, 50);
}
