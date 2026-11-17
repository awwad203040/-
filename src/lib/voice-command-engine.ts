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
  action:
    | 'play_surah'
    | 'pause'
    | 'resume'
    | 'next'
    | 'previous'
    | 'where_am_i'
    | 'open_read_quran'
    | 'open_radios'
    | 'play_radio'
    | 'unknown';
  surahNumber?: number;
  surahName?: string;
  reciterId?: number;
  reciterName?: string;
  stationId?: string;
  stationName?: string;
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
  68: ['القلم', 'نون', 'ن والقلم'],
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
  // مصحف معلم ومجود للمنشاوي
  {
    id: 100,
    name: 'محمد صديق المنشاوي (المصحف المعلم)',
    keys: [
      'المنشاوي المعلم',
      'المنشاوي معلم',
      'المصحف المعلم للمنشاوي',
      'المصحف المعلم منشاوي',
      'منشاوي معلم',
      'منشاوي المعلم',
      'منشاوي مع الاطفال',
      'المنشاوي مع الاطفال',
      'المنشاوي بترديد الاطفال',
      'منشاوي بترديد الاطفال',
      'منشاوي ترديد',
      'المصحف المعلم',
      'مصحف معلم',
      'المعلم المنشاوي',
    ],
  },
  {
    id: 101,
    name: 'محمد صديق المنشاوي (مجود)',
    keys: ['المنشاوي مجود', 'منشاوي تجويد', 'تجويد المنشاوي', 'منشاوي مجود', 'المنشاوي تجويد'],
  },
  {
    id: 9,
    name: 'محمد صديق المنشاوي',
    keys: ['المنشاوي', 'منشاوي', 'صديق المنشاوي', 'محمد صديق المنشاوي'],
  },

  // مصحف معلم ومجود للحصري
  {
    id: 102,
    name: 'محمود خليل الحصري (المصحف المعلم)',
    keys: [
      'الحصري المعلم',
      'الحصري معلم',
      'المصحف المعلم للحصري',
      'المصحف المعلم حصري',
      'حصري معلم',
      'حصري المعلم',
      'حصري مع الاطفال',
      'الحصري مع الاطفال',
      'الحصري بترديد الاطفال',
      'حصري بترديد الاطفال',
      'حصري ترديد',
      'المعلم الحصري',
    ],
  },
  {
    id: 103,
    name: 'محمود خليل الحصري (مجود)',
    keys: ['الحصري مجود', 'حصري مجود', 'تجويد الحصري', 'الحصري تجويد'],
  },
  {
    id: 6,
    name: 'محمود خليل الحصري',
    keys: ['الحصري', 'حصري', 'محمود خليل الحصري'],
  },

  // باقي المشايخ والقراء
  { id: 7, name: 'مشاري راشد العفاسي', keys: ['العفاسي', 'مشاري', 'مشاري العفاسي', 'عفاسي'] },
  { id: 2, name: 'عبد الباسط عبد الصمد (مجود)', keys: ['عبد الباسط مجود', 'عبدالباسط مجود', 'تجويد عبد الباسط'] },
  { id: 1, name: 'عبد الباسط عبد الصمد', keys: ['عبد الباسط', 'عبدالباسط', 'عبد الصمد', 'عبدالصمد'] },
  { id: 104, name: 'ياسر الدوسري', keys: ['الدوسري', 'دوسري', 'ياسر الدوسري'] },
  { id: 8, name: 'ماهر المعيقلي', keys: ['المعيقلي', 'معيقلي', 'ماهر المعيقلي'] },
  { id: 3, name: 'عبد الرحمن السديس', keys: ['السديس', 'سديس', 'عبد الرحمن السديس', 'عبدالرحمن السديس'] },
  { id: 10, name: 'سعود الشريم', keys: ['الشريم', 'شريم', 'سعود الشريم'] },
  { id: 105, name: 'أحمد بن علي العجمي', keys: ['العجمي', 'عجمي', 'احمد العجمي', 'احمد بن علي العجمي'] },
  { id: 12, name: 'سعد الغامدي', keys: ['الغامدي', 'غامدي', 'سعد الغامدي'] },
  { id: 106, name: 'فارس عباد', keys: ['فارس عباد', 'عباد'] },
  { id: 107, name: 'ناصر القطامي', keys: ['القطامي', 'قطامي', 'ناصر القطامي'] },
  { id: 108, name: 'علي عبد الرحمن الحذيفي', keys: ['الحذيفي', 'حذيفي', 'علي الحذيفي', 'علي بن عبد الرحمن الحذيفي'] },
  { id: 109, name: 'علي عبد الله جابر', keys: ['علي جابر', 'علي عبد الله جابر'] },
  { id: 110, name: 'عبد الله بصفر', keys: ['بصفر', 'عبد الله بصفر', 'عبدالله بصفر'] },
  { id: 111, name: 'إدريس أبكر', keys: ['ابكر', 'ادريس ابكر', 'إدريس أبكر'] },
  { id: 112, name: 'محمد أيوب', keys: ['ايوب', 'محمد ايوب', 'الشيخ ايوب'] },
  { id: 113, name: 'محمد جبريل', keys: ['جبريل', 'محمد جبريل'] },
  { id: 114, name: 'محمد رفعت (التسجيلات الإذاعية النادرة)', keys: ['محمد رفعت', 'رفعت', 'الشيخ رفعت', 'الشيخ محمد رفعت', 'قيثارة السماء'] },
  { id: 4, name: 'أبو بكر الشاطري', keys: ['الشاطري', 'شاطري', 'ابو بكر', 'ابوبكر'] },
  { id: 5, name: 'هاني الرفاعي', keys: ['الرفاعي', 'رفاعي'] },
];

function detectReciterFromText(normalized: string): ReciterMatch | null {
  let bestMatch: ReciterMatch | null = null;
  let bestLength = 0;

  for (const r of RECITER_VOICE_KEYS) {
    for (const key of r.keys) {
      const normKey = normalizeArabicSpeech(key);
      if (normalized.includes(normKey) && normKey.length > bestLength) {
        bestMatch = { id: r.id, name: r.name };
        bestLength = normKey.length;
      }
    }
  }
  return bestMatch;
}

// 4.5 قاموس إذاعات القرآن الكريم ومحرك التعرف الصوتي عليها
interface RadioStationVoiceAlias {
  id: string;
  name: string;
  aliases: string[];
}

const RADIO_STATION_VOICE_ALIASES: RadioStationVoiceAlias[] = [
  // 1. مصر - القاهرة
  {
    id: 'cairo-egypt',
    name: 'إذاعة القرآن الكريم من القاهرة',
    aliases: [
      'اذاعه القران الكريم مصر',
      'اذاعه القران الكريم من القاهره',
      'اذاعه القران الكريم القاهره',
      'اذاعه القران مصر',
      'اذاعه القران القاهره',
      'اذاعه مصر',
      'اذاعه القاهره',
      'قران القاهره',
      'قران مصر',
      'راديو مصر',
      'راديو القاهره',
      'اذاعه مصر للقران',
      'محطه القاهره',
      'محطه مصر',
      'مصر',
      'القاهره',
    ],
  },
  // 2. السعودية - مكة والحرمين
  {
    id: 'saudi-mix',
    name: 'إذاعة القرآن الكريم من السعودية',
    aliases: [
      'اذاعه القران الكريم السعوديه',
      'اذاعه القران الكريم من السعوديه',
      'اذاعه القران الكريم مكه',
      'اذاعه القران الكريم الرياض',
      'اذاعه القران السعوديه',
      'اذاعه السعوديه',
      'اذاعه مكه',
      'اذاعه الحرمين',
      'اذاعه الحرم المكي',
      'اذاعه الرياض',
      'قران السعوديه',
      'قران مكه',
      'راديو السعوديه',
      'راديو مكه',
      'السعوديه',
      'مكه المكرمه',
      'مكه',
      'الحرمين',
      'الرياض',
    ],
  },
  // 3. الشارقة - الإمارات
  {
    id: 'sharjah-uae',
    name: 'إذاعة القرآن الكريم من الشارقة',
    aliases: [
      'اذاعه القران الكريم من الشارقه',
      'اذاعه القران الكريم الشارقه',
      'اذاعه القران الكريم الامارات',
      'اذاعه الشارقه',
      'اذاعه الامارات',
      'قران الشارقه',
      'قران الامارات',
      'راديو الشارقه',
      'الشارقه',
      'الامارات',
    ],
  },
  // 4. الكويت
  {
    id: 'kuwait-quran',
    name: 'إذاعة القرآن الكريم من الكويت',
    aliases: [
      'اذاعه القران الكريم من الكويت',
      'اذاعه القران الكريم الكويت',
      'اذاعه الكويت',
      'قران الكويت',
      'راديو الكويت',
      'الكويت',
    ],
  },
  // 5. فلسطين - القدس ونابلس
  {
    id: 'palestine-nablus',
    name: 'إذاعة القرآن الكريم من فلسطين (نابلس)',
    aliases: [
      'اذاعه القران الكريم من فلسطين',
      'اذاعه القران الكريم فلسطين',
      'اذاعه القران الكريم القدس',
      'اذاعه القران الكريم نابلس',
      'اذاعه فلسطين',
      'اذاعه القدس',
      'اذاعه نابلس',
      'قران فلسطين',
      'قران القدس',
      'فلسطين',
      'القدس',
      'نابلس',
    ],
  },
  // 6. الأردن
  {
    id: 'jordan-quran',
    name: 'إذاعة القرآن الكريم من الأردن 93.1 FM',
    aliases: [
      'اذاعه القران الكريم من الاردن',
      'اذاعه القران الكريم الاردن',
      'اذاعه الاردن',
      'اذاعه عمان',
      'قران الاردن',
      'الاردن',
      'عمان',
    ],
  },
  // 7. البحرين
  {
    id: 'bahrain-quran',
    name: 'إذاعة القرآن الكريم من البحرين 106.1 FM',
    aliases: [
      'اذاعه القران الكريم من البحرين',
      'اذاعه القران الكريم البحرين',
      'اذاعه البحرين',
      'قران البحرين',
      'البحرين',
      'المنامه',
    ],
  },
  // 8. الشيخ عبد الباسط عبد الصمد
  {
    id: 'reciter-abdulbasit',
    name: 'إذاعة الشيخ عبد الباسط عبد الصمد',
    aliases: [
      'اذاعه عبد الباسط',
      'اذاعه الشيخ عبد الباسط',
      'اذاعه عبدالباسط',
      'اذاعه عبد الباسط عبد الصمد',
      'راديو عبد الباسط',
      'قران عبد الباسط',
    ],
  },
  // 9. الشيخ محمد صديق المنشاوي
  {
    id: 'reciter-minshawi',
    name: 'إذاعة الشيخ محمد صديق المنشاوي',
    aliases: [
      'اذاعه المنشاوي',
      'اذاعه الشيخ المنشاوي',
      'اذاعه محمد صديق المنشاوي',
      'راديو المنشاوي',
      'قران المنشاوي',
    ],
  },
  // 10. الشيخ محمود خليل الحصري
  {
    id: 'reciter-hussary',
    name: 'إذاعة الشيخ محمود خليل الحصري',
    aliases: [
      'اذاعه الحصري',
      'اذاعه الشيخ الحصري',
      'اذاعه محمود خليل الحصري',
      'راديو الحصري',
      'قران الحصري',
    ],
  },
  // 11. الشيخ ماهر المعيقلي
  {
    id: 'reciter-mueaqly',
    name: 'إذاعة الشيخ ماهر المعيقلي',
    aliases: [
      'اذاعه المعيقلي',
      'اذاعه ماهر المعيقلي',
      'اذاعه الشيخ ماهر المعيقلي',
      'راديو المعيقلي',
    ],
  },
  // 12. الشيخ مشاري راشد العفاسي
  {
    id: 'reciter-afasy',
    name: 'إذاعة الشيخ مشاري راشد العفاسي',
    aliases: [
      'اذاعه العفاسي',
      'اذاعه مشاري العفاسي',
      'اذاعه الشيخ مشاري العفاسي',
      'اذاعه مشاري',
      'راديو العفاسي',
    ],
  },
  // 13. الشيخ عبد الرحمن السديس
  {
    id: 'reciter-sudais',
    name: 'إذاعة الشيخ عبد الرحمن السديس',
    aliases: [
      'اذاعه السديس',
      'اذاعه عبد الرحمن السديس',
      'اذاعه الشيخ السديس',
      'راديو السديس',
    ],
  },
  // 14. الشيخ سعود الشريم
  {
    id: 'reciter-shuraim',
    name: 'إذاعة الشيخ سعود الشريم',
    aliases: [
      'اذاعه الشريم',
      'اذاعه سعود الشريم',
      'اذاعه الشيخ الشريم',
      'راديو الشريم',
    ],
  },
  // 15. الشيخ ياسر الدوسري
  {
    id: 'reciter-dosari',
    name: 'إذاعة الشيخ ياسر الدوسري',
    aliases: [
      'اذاعه الدوسري',
      'اذاعه ياسر الدوسري',
      'اذاعه الشيخ ياسر الدوسري',
      'راديو الدوسري',
    ],
  },
  // 16. الشيخ علي الحذيفي
  {
    id: 'reciter-huthaifi',
    name: 'إذاعة الشيخ علي بن عبد الرحمن الحذيفي',
    aliases: [
      'اذاعه الحذيفي',
      'اذاعه علي الحذيفي',
      'اذاعه الشيخ الحذيفي',
      'راديو الحذيفي',
    ],
  },
  // 17. المصحف المعلم للمنشاوي
  {
    id: 'reciter-minshawi-molem',
    name: 'إذاعة الشيخ محمد صديق المنشاوي (المصحف المعلم)',
    aliases: [
      'اذاعه المنشاوي المعلم',
      'اذاعه المنشاوي مع الاطفال',
      'اذاعه المصحف المعلم للمنشاوي',
      'اذاعه مصحف المنشاوي المعلم',
      'اذاعه المنشاوي بترديد الاطفال',
    ],
  },
  // 18. المصحف المعلم للحصري
  {
    id: 'reciter-hussary-molem',
    name: 'إذاعة الشيخ محمود خليل الحصري (المصحف المعلم)',
    aliases: [
      'اذاعه الحصري المعلم',
      'اذاعه الحصري مع الاطفال',
      'اذاعه المصحف المعلم للحصري',
      'اذاعه مصحف الحصري المعلم',
    ],
  },
  // 19. الشيخ أحمد العجمي
  {
    id: 'reciter-ajmi',
    name: 'إذاعة الشيخ أحمد بن علي العجمي',
    aliases: [
      'اذاعه العجمي',
      'اذاعه احمد العجمي',
      'اذاعه الشيخ احمد العجمي',
      'راديو العجمي',
    ],
  },
  // 20. الشيخ فارس عباد
  {
    id: 'reciter-fares',
    name: 'إذاعة الشيخ فارس عباد',
    aliases: [
      'اذاعه فارس عباد',
      'اذاعه الشيخ فارس عباد',
      'راديو فارس عباد',
    ],
  },
  // 21. الشيخ سعد الغامدي
  {
    id: 'reciter-ghamdi',
    name: 'إذاعة الشيخ سعد الغامدي',
    aliases: [
      'اذاعه الغامدي',
      'اذاعه سعد الغامدي',
      'اذاعه الشيخ سعد الغامدي',
      'راديو الغامدي',
    ],
  },
  // 22. الشيخ ناصر القطامي
  {
    id: 'reciter-qatami',
    name: 'إذاعة الشيخ ناصر القطامي',
    aliases: [
      'اذاعه القطامي',
      'اذاعه ناصر القطامي',
      'اذاعه الشيخ ناصر القطامي',
      'راديو القطامي',
    ],
  },
  // 23. الشيخ علي جابر
  {
    id: 'reciter-jaber',
    name: 'إذاعة الشيخ علي عبد الله جابر',
    aliases: [
      'اذاعه علي جابر',
      'اذاعه الشيخ علي جابر',
      'راديو علي جابر',
    ],
  },
  // 24. الشيخ إدريس أبكر
  {
    id: 'reciter-abkar',
    name: 'إذاعة الشيخ إدريس أبكر',
    aliases: [
      'اذاعه ادريس ابكر',
      'اذاعه ابكر',
      'اذاعه الشيخ ادريس ابكر',
      'راديو ادريس ابكر',
    ],
  },
  // 25. الشيخ محمد أيوب
  {
    id: 'reciter-ayyub',
    name: 'إذاعة الشيخ محمد أيوب',
    aliases: [
      'اذاعه محمد ايوب',
      'اذاعه ايوب',
      'اذاعه الشيخ محمد ايوب',
      'راديو محمد ايوب',
    ],
  },
  // 26. الشيخ محمد جبريل
  {
    id: 'reciter-jibreel',
    name: 'إذاعة الشيخ محمد جبريل',
    aliases: [
      'اذاعه محمد جبريل',
      'اذاعه جبريل',
      'اذاعه الشيخ محمد جبريل',
      'راديو محمد جبريل',
    ],
  },
  // 27. تفسير القرآن الكريم
  {
    id: 'tafsir-quran',
    name: 'إذاعة تفسير القرآن الكريم',
    aliases: [
      'اذاعه التفسير',
      'اذاعه تفسير القران',
      'اذاعه تفسير القران الكريم',
      'راديو التفسير',
      'تفسير القران',
    ],
  },
  // 28. أذكار الصباح والمساء
  {
    id: 'athkar-sabah-masa',
    name: 'إذاعة أذكار الصباح والمساء واليوم والليلة',
    aliases: [
      'اذاعه الاذكار',
      'اذاعه اذكار الصباح والمساء',
      'اذاعه اذكار الصباح',
      'اذاعه اذكار المساء',
      'راديو الاذكار',
    ],
  },
  // 29. الرقية الشرعية
  {
    id: 'roqiah-shariah',
    name: 'إذاعة الرقية الشرعية',
    aliases: [
      'اذاعه الرقيه',
      'اذاعه الرقيه الشرعيه',
      'راديو الرقيه',
      'الرقيه الشرعيه',
    ],
  },
];

interface RadioMatch {
  stationId: string;
  stationName: string;
}

function detectRadioCommand(normalized: string): {
  isRadioIntent: boolean;
  stationMatch: RadioMatch | null;
  isGeneralOpen: boolean;
} {
  const radioKeywords = [
    'اذاعه',
    'اذاعات',
    'الإذاعة',
    'الإذاعات',
    'راديو',
    'الراديو',
    'محطه',
    'محطات',
    'بث مباشر',
    'بث حي',
  ];

  const hasRadioKeyword = radioKeywords.some((kw) => {
    const normKw = normalizeArabicSpeech(kw);
    return normalized.includes(normKw);
  });

  const isDirectCountryRadio =
    normalized.includes('القران الكريم مصر') ||
    normalized.includes('القران الكريم من القاهره') ||
    normalized.includes('القران الكريم القاهره') ||
    normalized.includes('القران الكريم السعوديه') ||
    normalized.includes('القران الكريم من السعوديه') ||
    normalized.includes('القران الكريم مكه') ||
    normalized.includes('القران الكريم الشارقه') ||
    normalized.includes('القران الكريم الامارات') ||
    normalized.includes('القران الكريم الكويت') ||
    normalized.includes('القران الكريم فلسطين') ||
    normalized.includes('القران الكريم الاردن') ||
    normalized.includes('القران الكريم البحرين');

  if (!hasRadioKeyword && !isDirectCountryRadio) {
    return { isRadioIntent: false, stationMatch: null, isGeneralOpen: false };
  }

  // 1. فحص أسماء الإذاعات المحددة أولاً
  let bestStation: RadioMatch | null = null;
  let maxScore = 0;

  for (const station of RADIO_STATION_VOICE_ALIASES) {
    for (const rawAlias of station.aliases) {
      const normAlias = normalizeArabicSpeech(rawAlias);
      if (!normAlias) continue;

      let score = 0;
      if (normalized === normAlias) {
        score = 2500 + normAlias.length * 10;
      } else if (normalized.includes(normAlias)) {
        score = 1500 + normAlias.length * 10;
      }

      if (score > maxScore) {
        maxScore = score;
        bestStation = { stationId: station.id, stationName: station.name };
      }
    }
  }

  if (bestStation && maxScore >= 1500) {
    return { isRadioIntent: true, stationMatch: bestStation, isGeneralOpen: false };
  }

  // 2. فحص أوامر فتح نافذة الإذاعات العامة
  const generalOpenPhrases = [
    'افتح اذاعات',
    'افتح الاذاعات',
    'اذاعات القران',
    'اذاعات القران الكريم',
    'اذاعات',
    'الاذاعات',
    'افتح الراديو',
    'الراديو',
    'راديو القران',
    'راديو القران الكريم',
    'قائمه الاذاعات',
    'نافذه الاذاعات',
    'نافذه اذاعات القران',
    'محطات القران',
    'محطات الاذاعه',
    'بث مباشر',
  ];

  const clean = normalized
    .replace(/^(افتح لي|افتح|اريد|ابغى|ابي|ودنا|ورني|عرض|شغل لي|شغل)\s*/g, '')
    .trim();

  const isGeneralOpen = generalOpenPhrases.some((phrase) => {
    const normP = normalizeArabicSpeech(phrase);
    return normalized === normP || clean === normP || normalized.includes(normP);
  });

  if (isGeneralOpen) {
    return { isRadioIntent: true, stationMatch: null, isGeneralOpen: true };
  }

  // 3. إذا قال "إذاعة القرآن الكريم" أو "شغل إذاعة القرآن" دون تحديد دولة، يتم توجيهه لإذاعة القاهرة كافتراضي رسمي
  if (
    normalized.includes('اذاعه القران') ||
    normalized.includes('اذاعه القران الكريم') ||
    normalized.includes('راديو القران')
  ) {
    return {
      isRadioIntent: true,
      stationMatch: { stationId: 'cairo-egypt', stationName: 'إذاعة القرآن الكريم من القاهرة' },
      isGeneralOpen: false,
    };
  }

  return { isRadioIntent: true, stationMatch: null, isGeneralOpen: true };
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

  // ز. أوامر إذاعات القرآن الكريم المباشرة (مثل: "افتح إذاعة القرآن الكريم مصر", "إذاعات القرآن", "افتح الراديو")
  const radioDetect = detectRadioCommand(normalized);
  if (radioDetect.isRadioIntent) {
    if (radioDetect.stationMatch) {
      return {
        action: 'play_radio',
        stationId: radioDetect.stationMatch.stationId,
        stationName: radioDetect.stationMatch.stationName,
        originalText: rawInput,
        feedbackMessage: `جاري تشغيل ${radioDetect.stationMatch.stationName} وفتح نافذة الإذاعات.`,
      };
    } else if (radioDetect.isGeneralOpen) {
      return {
        action: 'open_radios',
        originalText: rawInput,
        feedbackMessage: 'تم فتح نافذة إذاعات القرآن الكريم.',
      };
    }
  }

  // ح. فحص اسم القارئ إن ذكر
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
  // فصل نص السورة عن جزء القارئ عند ورود كلمات "بصوت" أو "صوت"
  const splitParts = normalized.split(/(?:^|\s)(?:بصوت|صوت|للقارئ|لقارئ|للشيخ)(?:\s|$)/);
  const surahClause = (splitParts[0] || '').trim();

  let cleanName = surahClause
    .replace(/^(شغل لي|شغل|تشغيل|استمع الى|استمع لـ|استمع ل|استمع|اسمعني|اسمع|اقرا لي|اقرا|تلاوة|تلاوه|افتح لي|افتح|اريد|ابغى|ابغي|ابي|ودي اسمع|ممكن سورة|ممكن سوره|القران|القران الكريم)\s*/g, '')
    .replace(/^(?:سوره|سورة)\s+/g, '')
    .replace(/\s+(كامله|كاملة|كاملا)$/g, '')
    .trim();

  // إزالة اسم القارئ من العبارة إن وجد بدون كلمة "بصوت"
  for (const r of RECITER_VOICE_KEYS) {
    for (const k of r.keys) {
      const normKey = normalizeArabicSpeech(k);
      cleanName = cleanName.replace(new RegExp(`(?:^|\\s)(?:الشيخ|قارئ|القارئ)?\\s*${normKey}(?:\\s|$)`, 'g'), ' ').trim();
    }
  }
  cleanName = cleanName.replace(/(?:^|\s)(?:الشيخ|قارئ|القارئ)(?:\s|$)/g, ' ').replace(/\s+/g, ' ').trim();

  const cleanTokens = cleanName.split(/\s+/).filter(Boolean);
  const cleanWithoutAl = cleanName.startsWith('ال') && cleanName.length > 2 ? cleanName.substring(2) : cleanName;

  // ي. مطابقة اسم السورة النقي بأعلى درجات الدقة والتمييز بين السور المتشابهة
  let bestMatch: { surahNumber: number; surahName: string; score: number } | null = null;
  let highestScore = 0;

  for (let s = 1; s <= 114; s++) {
    const meta = SURAH_METADATA[s];
    if (!meta) continue;

    const normOfficial = normalizeArabicSpeech(meta.name);
    const normOfficialWithoutAl = normOfficial.startsWith('ال') && normOfficial.length > 2
      ? normOfficial.substring(2)
      : normOfficial;

    const aliases = (SURAH_ALIASES[s] || []).map((a) => normalizeArabicSpeech(a)).filter((a) => a.length > 1 || a === 'ص' || a === 'ق');
    const candidateNames = [normOfficial, ...aliases];

    for (const name of candidateNames) {
      if (!name) continue;
      const nameWithoutAl = name.startsWith('ال') && name.length > 2 ? name.substring(2) : name;

      let score = 0;

      // معاملة خاصة للسور ذات الحرف الواحد (ص: 38، ق: 50) لمنع تطابقها مع حروف الكلمات الأخرى
      if (name.length === 1) {
        if (cleanName === name) {
          score = 1500;
        } else if (cleanTokens.includes(name) && cleanTokens.length <= 2) {
          score = 1200;
        }
      } else {
        // السور متعددة الحروف:
        // 1. تطابق تام مع الاسم النقي (مع أو بدون "ال")
        if (cleanName === name) {
          score = 2000 + name.length * 10;
        } else if (cleanName === nameWithoutAl) {
          score = 1900 + name.length * 10;
        } else if (cleanWithoutAl === name) {
          score = 1850 + name.length * 10;
        } else if (cleanWithoutAl === nameWithoutAl) {
          score = 1800 + name.length * 10;
        }
        // 2. تطابق ككلمة مستقلة كاملة
        else if (cleanTokens.includes(name)) {
          score = 1400 + name.length * 10;
        } else if (cleanTokens.includes(nameWithoutAl)) {
          score = 1350 + name.length * 10;
        }
        // 3. تطابق عبارة بديلة متعددة الكلمات (مثل "قل هو الله احد")
        else if (name.includes(' ') && cleanName.includes(name)) {
          score = 1600 + name.length * 10;
        }
        // 4. تطابق ككلمة كاملة بحدود فراغية
        else {
          const wordRegexWithAl = new RegExp(`(?:^|\\s)${name}(?:\\s|$)`, 'u');
          const wordRegexNoAl = new RegExp(`(?:^|\\s)${nameWithoutAl}(?:\\s|$)`, 'u');

          if (wordRegexWithAl.test(cleanName)) {
            score = 1000 + name.length * 10;
          } else if (wordRegexNoAl.test(cleanName)) {
            score = 950 + name.length * 10;
          } else if (wordRegexWithAl.test(normalized)) {
            score = 700 + name.length * 5;
          } else if (wordRegexNoAl.test(normalized)) {
            score = 650 + name.length * 5;
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = { surahNumber: s, surahName: meta.name, score };
      }
    }
  }

  if (bestMatch && bestMatch.surahNumber >= 1 && bestMatch.surahNumber <= 114) {
    const meta = SURAH_METADATA[bestMatch.surahNumber];
    const reciterMsg = detectedReciter ? ` بصوت الشيخ ${detectedReciter.name}` : '';
    return {
      action: 'play_surah',
      surahNumber: bestMatch.surahNumber,
      surahName: meta.name,
      reciterId: detectedReciter?.id,
      reciterName: detectedReciter?.name,
      originalText: rawInput,
      feedbackMessage: `جاري تشغيل سورة ${meta.name}${reciterMsg}.`,
    };
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
