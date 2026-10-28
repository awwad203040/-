// Centralized Accessibility & Blind-Assistance Engine for Noor-AlQuran
// محرك إمكانية الوصول وخدمة المكفوفين وضعاف البصر
import { speakNativeVoice, stopNativeVoice } from './athkar-native-bridge';

export interface AccessibilitySettings {
  blindMode: boolean; // وضع تسهيل الوصول للمكفوفين
  hapticFeedback: boolean; // الاهتزاز اللمسي الذكي
  voiceGuidance: boolean; // المساعد الصوتي الناطق
  speechRate: number; // سرعة النطق (1.0 = عادي)
  voiceCommandsEnabled: boolean; // المساعد الصوتي والتعرف على الأوامر المنطوقة
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  blindMode: false,
  hapticFeedback: true,
  voiceGuidance: false,
  speechRate: 1.0,
  voiceCommandsEnabled: true,
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
const activeUtterances = new Set<SpeechSynthesisUtterance>();
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  };
  loadVoices();
  if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// Pronunciation tuning for Arabic speech
export function prepareAccessibilitySpeechText(text: string): string {
  if (!text) return '';
  return text
    // Replace ligatures and symbols
    .replace(/ﷺ/g, 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمْ')
    .replace(/ﷻ/g, 'جَلَّ جَلَالُه')
    // Remove symbols and markdown
    .replace(/[*#_~`\[\]()«»"']/g, ' ')
    // Remove awkward punctuation that causes speech to say "فاصلة" or stutter
    .replace(/[،,؛;:\-–—]/g, ' ')
    // Clear double spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export async function speakAccessibility(text: string, options?: { force?: boolean; rate?: number; pitch?: number }) {
  if (typeof window === 'undefined') return;
  const settings = getAccessibilitySettings();

  // لا ننطق إذا كان المساعد الصوتي ووضع المكفوفين غير مفعل، إلا لو كان force = true
  if (!settings.blindMode && !settings.voiceGuidance && !options?.force) return;

  const cleanText = prepareAccessibilitySpeechText(text);
  if (!cleanText) return;

  const targetRate = options?.rate || settings.speechRate || 1.0;
  const targetPitch = options?.pitch || 1.0;

  // 1. الأولوية للناطق الأصلي بهاتف أندرويد (Google TextToSpeech Engine)
  try {
    const nativeSpoken = await speakNativeVoice(cleanText, targetRate, targetPitch);
    if (nativeSpoken) {
      return;
    }
  } catch {}

  // 2. البديل عبر Web Speech Synthesis (للمتصفح مع تجنب أخطاء كروميوم)
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // إلغاء أي نطق سابق

    // تأخير طفيف (40ms) لضمان اكتمال الإلغاء في أندرويد قبل بدء النطق الجديد
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ar-SA';
        utterance.rate = targetRate;
        utterance.pitch = targetPitch;

        // اختيار أفضل صوت عربي طبيعي متوفر
        const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
        const arabicVoice =
          voices.find((v) => v.lang === 'ar-SA' || v.lang === 'ar_SA') ||
          voices.find((v) => v.lang.startsWith('ar') || v.lang.includes('Arabic')) ||
          voices.find((v) => v.name.toLowerCase().includes('arabic') || v.name.toLowerCase().includes('saudi'));

        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        activeUtterances.add(utterance);
        utterance.onend = () => activeUtterances.delete(utterance);
        utterance.onerror = () => activeUtterances.delete(utterance);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
      }
    }, 40);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

export function stopAccessibilitySpeech() {
  if (typeof window === 'undefined') return;
  stopNativeVoice().catch(() => {});
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterances.clear();
    } catch {}
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
