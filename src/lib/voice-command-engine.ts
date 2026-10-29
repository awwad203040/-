// Centralized Arabic Voice Command & Speech Recognition Engine
// محرك التعرف الصوتي والأوامر المنطوقة للمكفوفين وضعاف البصر - تطبيق نور القرآن

import { Capacitor } from '@capacitor/core';
import { SURAH_METADATA, POPULAR_RECITERS } from './quran-meta';
import { speakAccessibility, triggerHaptic, announceToScreenReader } from './accessibility';
import { getReadingProgress } from './storage';
import {
  startNativeSpeechRecognition,
  stopNativeSpeechRecognition,
  addNativeSpeechListener,
  launchNativeVoiceDialog,
} from './athkar-native-bridge';

export interface VoiceCommandResult {
  action: 'play_surah' | 'pause' | 'resume' | 'next' | 'previous' | 'where_am_i' | 'open_read_quran' | 'unknown';
  surahNumber?: number;
  surahName?: string;
  reciterId?: number;
  reciterName?: string;
  originalText: string;
  feedbackMessage: string;
}

// 1. فحص دعم المتصفح أو بيئة الهاتف الأصلية للتعرف الصوتي
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// 2. تطبيع وتنظيف النص العربي المنطوق لتسهيل المطابقة الدقيقة
export function normalizeArabicSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    // إزالة التشكيل والتنوين والشدة
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // تطبيع الهمزات والألف
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    // إزالة المد والتطويل
    .replace(/\u0640/g, '')
    // تحويل الأرقام العربية الهندية إلى أرقام غربية
    .replace(/٠/g, '0')
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/٥/g, '5')
    .replace(/٦/g, '6')
    .replace(/٧/g, '7')
    .replace(/٨/g, '8')
    .replace(/٩/g, '9')
    // إزالة علامات الترقيم والرموز غير المرغوبة
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 3. قاموس الأسماء البديلة والشائعة لجميع سور القرآن الكريم
const SURAH_ALIASES: Record<number, string[]> = {
  1: ['الفاتحه', 'الحمد', 'ام الكتاب', 'ام القران', 'السبع المثاني', 'فاتحه الكتاب'],
  2: ['البقره'],
  3: ['ال عمران', 'عمران'],
  4: ['النساء'],
  5: ['المائده'],
  6: ['الانعام'],
  7: ['الاعراف'],
  8: ['الانفال'],
  9: ['التوبه', 'براءه', 'التوبة'],
  10: ['يونس'],
  11: ['هود'],
  12: ['يوسف'],
  13: ['الرعد'],
  14: ['ابراهيم'],
  15: ['الحجر'],
  16: ['النحل'],
  17: ['الاسراء', 'بني اسرائيل', 'سبحان'],
  18: ['الكهف', 'اهل الكهف'],
  19: ['مريم'],
  20: ['طه'],
  21: ['الانبياء'],
  22: ['الحج'],
  23: ['المؤمنون', 'المؤمنين'],
  24: ['النور'],
  25: ['الفرقان'],
  26: ['الشعراء'],
  27: ['النمل'],
  28: ['القصص'],
  29: ['العنكبوت'],
  30: ['الروم'],
  31: ['لقمان'],
  32: ['السجده', 'الم تنزيل'],
  33: ['الاحزاب'],
  34: ['سبا'],
  35: ['فاطر', 'الملائكه'],
  36: ['يس', 'ياسين'],
  37: ['الصافات'],
  38: ['ص', 'صاد'],
  39: ['الزمر'],
  40: ['غافر', 'المؤمن'],
  41: ['فصلت', 'حم السجده'],
  42: ['الشورى'],
  43: ['الزخرف'],
  44: ['الدخان'],
  45: ['الجاثيه'],
  46: ['الاحقاف'],
  47: ['محمد', 'القتال'],
  48: ['الفتح', 'انا فتحنا'],
  49: ['الحجرات'],
  50: ['ق', 'قاف'],
  51: ['الذاريات'],
  52: ['الطور'],
  53: ['النجم'],
  54: ['القمر', 'اقتربت الساعه'],
  55: ['الرحمن'],
  56: ['الواقعه'],
  57: ['الحديد'],
  58: ['المجادله', 'قد سمع'],
  59: ['الحشر'],
  60: ['الممتحنه'],
  61: ['الصف'],
  62: ['الجمعه'],
  63: ['المنافقون', 'المنافقين'],
  64: ['التغابن'],
  65: ['الطلاق'],
  66: ['التحريم', 'يا ايها النبي لم تحرم'],
  67: ['الملك', 'تبارك', 'تبارك الذي بيده الملك', 'المنجيه', 'الواقيه'],
  68: ['القلم', 'ن', 'نون', 'ن والقلم'],
  69: ['الحاقه'],
  70: ['المعارج', 'سال سائل'],
  71: ['نوح'],
  72: ['الجن', 'قل اوحي'],
  73: ['المزمل'],
  74: ['المدثر'],
  75: ['القيامه', 'لا اقسم بيوم القيامه'],
  76: ['الانسان', 'الدهر', 'هل اتى', 'هل اتى على الانسان'],
  77: ['المرسلات', 'والمرسلات'],
  78: ['النبا', 'عم', 'عم يتساءلون'],
  79: ['النازعات', 'والنازعات'],
  80: ['عبس', 'عبس وتولى'],
  81: ['التكوير', 'اذا الشمس كورت', 'كورت'],
  82: ['الانفطار', 'اذا السماء انفطرت'],
  83: ['المطففين', 'ويل للمطففين'],
  84: ['الانشقاق', 'اذا السماء انشقت'],
  85: ['البروج', 'والسماء ذات البروج'],
  86: ['الطارق', 'والسماء والطارق'],
  87: ['الاعلى', 'سبح اسم ربك الاعلى'],
  88: ['الغاشيه', 'هل اتاك حديث الغاشيه'],
  89: ['الفجر', 'والفجر'],
  90: ['البلد', 'لا اقسم بهذا البلد'],
  91: ['الشمس', 'والشمس وضحاها'],
  92: ['الليل', 'والليل اذا يغشى'],
  93: ['الضحى', 'والضحى'],
  94: ['الشرح', 'الانشراح', 'الم نشرح', 'الم نشرح لك صدرك'],
  95: ['التين', 'والتين', 'والتين والزيتون'],
  96: ['العلق', 'اقرا', 'اقرا باسم ربك'],
  97: ['القدر', 'انا انزلناه في ليلة القدر'],
  98: ['البينه', 'لم يكن', 'لم يكن الذين كفروا'],
  99: ['الزلزله', 'الزلزال', 'اذا زلزلت'],
  100: ['العاديات', 'والعاديات'],
  101: ['القارعه'],
  102: ['التكاثر', 'الهاكم التكاثر'],
  103: ['العصر', 'والعصر'],
  104: ['الهمزه', 'ويل لكل همزه'],
  105: ['الفيل', 'الم تر كيف فعل ربك'],
  106: ['قريش', 'لايلاف قريش'],
  107: ['الماعون', 'ارايت الذي'],
  108: ['الكوثر', 'انا اعطيناك الكوثر'],
  109: ['الكافرون', 'قل يا ايها الكافرون'],
  110: ['النصر', 'اذا جاء نصر الله'],
  111: ['المسد', 'تبت', 'تبت يدا'],
  112: ['الاخلاص', 'قل هو الله احد', 'التوحيد'],
  113: ['الفلق', 'قل اعوذ برب الفلق', 'المعوذه الاولى', 'المعوذتين'],
  114: ['الناس', 'قل اعوذ برب الناس', 'المعوذه الثانيه'],
};

// 4. مطابقة القارئ الصوتي إن ذكر المستخدم اسمه بالصوت
interface ReciterMatch {
  id: number;
  name: string;
}

const RECITER_VOICE_KEYS: { id: number; name: string; keys: string[] }[] = [
  { id: 7, name: 'مشاري راشد العفاسي', keys: ['العفاسي', 'مشاري', 'مشاري العفاسي', 'عفاسي'] },
  { id: 1, name: 'عبد الباسط عبد الصمد', keys: ['عبد الباسط', 'عبدالباسط', 'عبد الصمد', 'عبدالصمد'] },
  { id: 3, name: 'عبد الرحمن السديس', keys: ['السديس', 'سديس', 'عبد الرحمن السديس', 'عبدالرحمن السديس'] },
  { id: 4, name: 'أبو بكر الشاطري', keys: ['الشاطري', 'شاطري', 'ابو بكر', 'ابوبكر'] },
  { id: 5, name: 'هاني الرفاعي', keys: ['الرفاعي', 'رفاعي', 'هاني'] },
  { id: 6, name: 'محمود خليل الحصري', keys: ['الحصري', 'حصري', 'محمود خليل الحصري'] },
  { id: 8, name: 'ماهر المعيقلي', keys: ['المعيقلي', 'معيقلي', 'ماهر المعيقلي', 'ماهر'] },
  { id: 9, name: 'محمد صديق المنشاوي', keys: ['المنشاوي', 'منشاوي', 'صديق المنشاوي'] },
  { id: 10, name: 'سعود الشريم', keys: ['الشريم', 'شريم', 'سعود الشريم'] },
  { id: 12, name: 'سعد الغامدي', keys: ['الغامدي', 'غامدي', 'سعد الغامدي'] },
];

function detectReciterFromText(normalized: string): ReciterMatch | null {
  for (const r of RECITER_VOICE_KEYS) {
    for (const key of r.keys) {
      const normKey = normalizeArabicSpeech(key);
      if (normalized.includes(normKey)) {
        return { id: r.id, name: r.name };
      }
    }
  }
  return null;
}

// 5. محرك تحليل ومطابقة الأمر الصوتي
export function parseVoiceCommand(rawInput: string): VoiceCommandResult {
  const normalized = normalizeArabicSpeech(rawInput);

  if (!normalized) {
    return {
      action: 'unknown',
      originalText: rawInput,
      feedbackMessage: 'لم أسمع أمراً واضحاً، يرجى التحدث مجدداً ونطق اسم السورة.',
    };
  }

  // أ. أوامر الإيقاف المؤقت
  const pauseKeywords = ['وقف', 'ايقاف', 'توقف', 'اسكت', 'كفى', 'سكون', 'اصمت', 'تسكيت'];
  if (pauseKeywords.some((kw) => normalized === kw || normalized.startsWith(kw + ' ') || normalized.endsWith(' ' + kw))) {
    return {
      action: 'pause',
      originalText: rawInput,
      feedbackMessage: 'تم إيقاف التلاوة مؤقتاً.',
    };
  }

  // ب. أوامر الاستئناف والتشغيل
  const resumeKeywords = ['استئناف', 'واصل', 'تابع', 'اكمل', 'كمل', 'شغل التلاوه', 'شغل الصوت'];
  if (resumeKeywords.some((kw) => normalized.includes(kw))) {
    return {
      action: 'resume',
      originalText: rawInput,
      feedbackMessage: 'جاري استئناف التلاوة.',
    };
  }

  // ج. أوامر التنقل: السورة التالية
  const nextKeywords = ['التالي', 'التاليه', 'السوره التاليه', 'بعدها', 'اللي بعدها', 'بعده'];
  if (nextKeywords.some((kw) => normalized.includes(kw))) {
    return {
      action: 'next',
      originalText: rawInput,
      feedbackMessage: 'الانتقال إلى السورة التالية.',
    };
  }

  // د. أوامر التنقل: السورة السابقة
  const prevKeywords = ['السابق', 'السابقه', 'السوره السابقه', 'قبلها', 'اللي قبلها', 'قبله'];
  if (prevKeywords.some((kw) => normalized.includes(kw))) {
    return {
      action: 'previous',
      originalText: rawInput,
      feedbackMessage: 'الانتقال إلى السورة السابقة.',
    };
  }

  // هـ. معرفة موضع القراءة الحالي والختمة ("أين توقفت")
  const locationKeywords = ['اين توقفت', 'وين وصلت', 'موقعي', 'مكاني', 'ختمتي', 'اخر قراءه', 'اين وصلت'];
  if (locationKeywords.some((kw) => normalized.includes(kw))) {
    const prog = getReadingProgress();
    const page = prog?.pageNumber || 1;
    const sNum = prog?.surahNumber || 1;
    const sName = SURAH_METADATA[sNum]?.name || 'الفاتحة';
    return {
      action: 'where_am_i',
      originalText: rawInput,
      surahNumber: sNum,
      surahName: sName,
      feedbackMessage: `آخر موضع قرأته هو سورة ${sName} في الصفحة ${page}.`,
    };
  }

  // و. فتح نافذة اقرأ القرآن
  const openReadKeywords = ['اقرا القران', 'فهرس القران', 'المصحف الشريف', 'فتح الفهرس', 'قائمه السور'];
  if (openReadKeywords.some((kw) => normalized.includes(kw))) {
    return {
      action: 'open_read_quran',
      originalText: rawInput,
      feedbackMessage: 'تم فتح نافذة اقرأ القرآن.',
    };
  }

  // ز. فحص اسم القارئ إن ذكر
  const detectedReciter = detectReciterFromText(normalized);

  // ح. البحث عن السورة بالرقم المباشر (مثلاً "سورة رقم 18" أو "سورة 2")
  const numberMatch = normalized.match(/(?:سوره|رقم)\s*(\d{1,3})/);
  if (numberMatch && numberMatch[1]) {
    const num = parseInt(numberMatch[1], 10);
    if (num >= 1 && num <= 114) {
      const meta = SURAH_METADATA[num];
      const reciterMsg = detectedReciter ? ` بصوت الشيخ ${detectedReciter.name}` : '';
      return {
        action: 'play_surah',
        surahNumber: num,
        surahName: meta.name,
        reciterId: detectedReciter?.id,
        reciterName: detectedReciter?.name,
        originalText: rawInput,
        feedbackMessage: `جاري تشغيل سورة ${meta.name}${reciterMsg}.`,
      };
    }
  }

  // ط. تنظيف كلمات الطلب المعتادة للوصول إلى اسم السورة الصافي
  let cleanName = normalized
    .replace(/^(شغل لي|شغل|تشغيل|استمع الى|استمع لـ|استمع ل|استمع|اسمعني|اسمع|اقرا لي|اقرا|تلاوة|تلاوه|افتح لي|افتح|اريد|ابغى|ابغي|ابي|ودي اسمع|ممكن سورة|ممكن سوره|القران|القران الكريم)\s*/g, '')
    .replace(/^سوره\s+/g, '')
    .replace(/^سورة\s+/g, '')
    .replace(/\s+(كامله|كاملة|كاملا)$/g, '')
    .trim();

  // إزالة اسم القارئ من العبارة للمطابقة النقية
  if (detectedReciter) {
    for (const r of RECITER_VOICE_KEYS) {
      for (const k of r.keys) {
        cleanName = cleanName.replace(new RegExp(`(?:بصوت|صوت|الشيخ|قارئ)?\\s*${normalizeArabicSpeech(k)}`, 'g'), '').trim();
      }
    }
    cleanName = cleanName.replace(/(?:بصوت|صوت|الشيخ|قارئ)/g, '').trim();
  }

  // ي. مطابقة اسم السورة النقي مع الأسماء الرسمية والبدائل (114 سورة)
  for (let s = 1; s <= 114; s++) {
    const meta = SURAH_METADATA[s];
    const normMetaName = normalizeArabicSpeech(meta.name);

    // مطابقة تامة مع الاسم الرسمي (مع أو بدون "ال")
    if (cleanName === normMetaName || cleanName === normMetaName.replace(/^ال/, '') || normalized.includes(normMetaName)) {
      const reciterMsg = detectedReciter ? ` بصوت الشيخ ${detectedReciter.name}` : '';
      return {
        action: 'play_surah',
        surahNumber: s,
        surahName: meta.name,
        reciterId: detectedReciter?.id,
        reciterName: detectedReciter?.name,
        originalText: rawInput,
        feedbackMessage: `جاري تشغيل سورة ${meta.name}${reciterMsg}.`,
      };
    }

    // مطابقة مع القاموس الموسع للأسماء والآيات المشهورة
    const aliases = SURAH_ALIASES[s] || [];
    for (const alias of aliases) {
      const normAlias = normalizeArabicSpeech(alias);
      if (
        cleanName === normAlias ||
        cleanName === normAlias.replace(/^ال/, '') ||
        cleanName.includes(normAlias) ||
        normalized.includes(normAlias)
      ) {
        const reciterMsg = detectedReciter ? ` بصوت الشيخ ${detectedReciter.name}` : '';
        return {
          action: 'play_surah',
          surahNumber: s,
          surahName: meta.name,
          reciterId: detectedReciter?.id,
          reciterName: detectedReciter?.name,
          originalText: rawInput,
          feedbackMessage: `جاري تشغيل سورة ${meta.name}${reciterMsg}.`,
        };
      }
    }
  }

  // لم يتم التعرف على اسم سورة محدد
  return {
    action: 'unknown',
    originalText: rawInput,
    feedbackMessage: `عذراً، لم أتعرف على "${rawInput}". تفضل بنطق اسم السورة مثل: "سورة الكهف" أو "سورة البقرة".`,
  };
}

// 6. صوت نغمة التنبيه الصوتي المهدئ (Web Audio Tone) لإعلام المكفوف ببدء الاستماع وانتهائه
export function playAuditoryChime(type: 'listen_start' | 'listen_stop' | 'success') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'listen_start') {
      // نغمة صاعدة تشير إلى بدء الاستماع
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'success') {
      // نغمة نجاح ثلاثية
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // نغمة هابطة خفيفة
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch {}
}

// 7. إدارة جلسة التعرف على الصوت (دعم مزدوج: Native Android SpeechRecognizer + Web Speech API)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeRecognition: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeNativeSpeechListeners: any[] = [];

function clearNativeSpeechListeners() {
  for (const l of activeNativeSpeechListeners) {
    try {
      if (typeof l?.remove === 'function') l.remove();
    } catch {}
  }
  activeNativeSpeechListeners = [];
}

export interface VoiceListenerOptions {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (result: VoiceCommandResult) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  forceDialog?: boolean;
}

export function startVoiceListening(options: VoiceListenerOptions): boolean {
  if (typeof window === 'undefined') return false;

  // إيقاف أي جلسة سابقة
  stopVoiceListening();

  // 1. الأولوية المطلقة: محرك أندرويد الأصلي (Android Native SpeechRecognizer)
  // يحل مشكلة WebView نهائياً ويوفر وقتاً كافياً للتحدث دون انقطاع
  if (Capacitor.isNativePlatform()) {
    try {
      clearNativeSpeechListeners();

      const lStart = addNativeSpeechListener('onSpeechStart', () => {
        playAuditoryChime('listen_start');
        triggerHaptic('tap');
        options.onStart?.();
      });

      const lPartial = addNativeSpeechListener('onSpeechPartial', (data: { text?: string }) => {
        if (data?.text && options.onInterimResult) {
          options.onInterimResult(data.text);
        }
      });

      const lResult = addNativeSpeechListener('onSpeechResult', (data: { text?: string; matches?: string[] }) => {
        const candidates = [data?.text, ...(data?.matches || [])].filter(Boolean) as string[];
        if (candidates.length > 0) {
          playAuditoryChime('success');
          triggerHaptic('success');
          let bestResult: VoiceCommandResult | null = null;
          for (const cand of candidates) {
            const parsed = parseVoiceCommand(cand);
            if (parsed.action !== 'unknown') {
              bestResult = parsed;
              break;
            }
          }
          if (!bestResult) {
            bestResult = parseVoiceCommand(candidates[0]);
          }
          options.onFinalResult?.(bestResult);
        } else {
          playAuditoryChime('listen_stop');
          options.onError?.('لم يتم تمييز السورة، يرجى إعادة المحاولة ونطق اسم السورة');
        }
      });

      const lError = addNativeSpeechListener('onSpeechError', (data: { message?: string; error?: string }) => {
        playAuditoryChime('listen_stop');
        options.onError?.(data?.message || 'حدث خطأ أثناء الاستماع');
      });

      const lEnd = addNativeSpeechListener('onSpeechEnd', () => {
        options.onEnd?.();
      });

      activeNativeSpeechListeners = [lStart, lPartial, lResult, lError, lEnd];

      const starterPromise = options.forceDialog
        ? launchNativeVoiceDialog({ language: 'ar-SA' })
        : startNativeSpeechRecognition({ language: 'ar-SA' });

      starterPromise.then((started) => {
        if (!started) {
          options.onError?.('انتهى الاستماع، انقر على الميكروفون للتحدث مجدداً');
        }
      }).catch(() => {
        options.onError?.('تعذر بدء المساعد الصوتي');
      });

      return true;
    } catch (e) {
      console.warn('Native speech listening failed:', e);
      options.onError?.('تعذر تشغيل المساعد الصوتي');
      return false;
    }
  }

  // 2. البديل لبيئة المتصفح (Web Speech API)
  const SpeechRecognitionClass =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    const errorMsg = 'التعرف الصوتي غير مدعوم في هذا المتصفح';
    options.onError?.(errorMsg);
    speakAccessibility(errorMsg, { force: true });
    return false;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      playAuditoryChime('listen_start');
      triggerHaptic('tap');
      options.onStart?.();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim && options.onInterimResult) {
        options.onInterimResult(interim);
      }

      if (final) {
        playAuditoryChime('success');
        triggerHaptic('success');
        const parsed = parseVoiceCommand(final);
        options.onFinalResult?.(parsed);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      const err = event.error || 'error';
      let friendly = 'حدث خطأ أثناء الاستماع';
      if (err === 'no-speech') {
        friendly = 'لم يتم سماع صوت، يرجى المحاولة ونطق اسم السورة';
      } else if (err === 'not-allowed') {
        friendly = 'يرجى السماح بصلاحية الميكروفون لاستخدام المساعد الصوتي';
      }
      playAuditoryChime('listen_stop');
      options.onError?.(friendly);
    };

    recognition.onend = () => {
      activeRecognition = null;
      options.onEnd?.();
    };

    activeRecognition = recognition;
    recognition.start();
    return true;
  } catch (e) {
    console.warn('Failed to start speech recognition:', e);
    options.onError?.('تعذر تشغيل الميكروفون');
    return false;
  }
}

export function stopVoiceListening() {
  if (Capacitor.isNativePlatform()) {
    stopNativeSpeechRecognition().catch(() => {});
    clearNativeSpeechListeners();
  }
  if (activeRecognition) {
    try {
      activeRecognition.abort();
    } catch {}
    activeRecognition = null;
  }
}
