// Verified Quran Metadata constants for UI navigation and display
// Note: These are UI labels, classifications, and page indices, NOT Quran sacred text

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  revelationPlace: 'makkah' | 'madinah';
  versesCount: number;
  startPage: number;
}

export const SURAH_METADATA: Record<number, SurahMeta> = {
  1: { number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', revelationPlace: 'makkah', versesCount: 7, startPage: 1 },
  2: { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', revelationPlace: 'madinah', versesCount: 286, startPage: 2 },
  3: { number: 3, name: 'آل عمران', englishName: "Ali 'Imran", revelationPlace: 'madinah', versesCount: 200, startPage: 50 },
  4: { number: 4, name: 'النساء', englishName: 'An-Nisa', revelationPlace: 'madinah', versesCount: 176, startPage: 77 },
  5: { number: 5, name: 'المائدة', englishName: "Al-Ma'idah", revelationPlace: 'madinah', versesCount: 120, startPage: 106 },
  6: { number: 6, name: 'الأنعام', englishName: "Al-An'am", revelationPlace: 'makkah', versesCount: 165, startPage: 128 },
  7: { number: 7, name: 'الأعراف', englishName: "Al-A'raf", revelationPlace: 'makkah', versesCount: 206, startPage: 151 },
  8: { number: 8, name: 'الأنفال', englishName: 'Al-Anfal', revelationPlace: 'madinah', versesCount: 75, startPage: 177 },
  9: { number: 9, name: 'التوبة', englishName: 'At-Tawbah', revelationPlace: 'madinah', versesCount: 129, startPage: 187 },
  10: { number: 10, name: 'يونس', englishName: 'Yunus', revelationPlace: 'makkah', versesCount: 109, startPage: 208 },
  11: { number: 11, name: 'هود', englishName: 'Hud', revelationPlace: 'makkah', versesCount: 123, startPage: 221 },
  12: { number: 12, name: 'يوسف', englishName: 'Yusuf', revelationPlace: 'makkah', versesCount: 111, startPage: 235 },
  13: { number: 13, name: 'الرعد', englishName: "Ar-Ra'd", revelationPlace: 'madinah', versesCount: 43, startPage: 249 },
  14: { number: 14, name: 'إبراهيم', englishName: 'Ibrahim', revelationPlace: 'makkah', versesCount: 52, startPage: 255 },
  15: { number: 15, name: 'الحجر', englishName: 'Al-Hijr', revelationPlace: 'makkah', versesCount: 99, startPage: 262 },
  16: { number: 16, name: 'النحل', englishName: 'An-Nahl', revelationPlace: 'makkah', versesCount: 128, startPage: 267 },
  17: { number: 17, name: 'الإسراء', englishName: "Al-Isra'", revelationPlace: 'makkah', versesCount: 111, startPage: 282 },
  18: { number: 18, name: 'الكهف', englishName: 'Al-Kahf', revelationPlace: 'makkah', versesCount: 110, startPage: 293 },
  19: { number: 19, name: 'مريم', englishName: 'Maryam', revelationPlace: 'makkah', versesCount: 98, startPage: 305 },
  20: { number: 20, name: 'طه', englishName: 'Taha', revelationPlace: 'makkah', versesCount: 135, startPage: 312 },
  21: { number: 21, name: 'الأنبياء', englishName: 'Al-Anbiya', revelationPlace: 'makkah', versesCount: 112, startPage: 322 },
  22: { number: 22, name: 'الحج', englishName: 'Al-Hajj', revelationPlace: 'madinah', versesCount: 78, startPage: 332 },
  23: { number: 23, name: 'المؤمنون', englishName: "Al-Mu'minun", revelationPlace: 'makkah', versesCount: 118, startPage: 342 },
  24: { number: 24, name: 'النور', englishName: 'An-Nur', revelationPlace: 'madinah', versesCount: 64, startPage: 350 },
  25: { number: 25, name: 'الفرقان', englishName: 'Al-Furqan', revelationPlace: 'makkah', versesCount: 77, startPage: 359 },
  26: { number: 26, name: 'الشعراء', englishName: "Ash-Shu'ara", revelationPlace: 'makkah', versesCount: 227, startPage: 367 },
  27: { number: 27, name: 'النمل', englishName: 'An-Naml', revelationPlace: 'makkah', versesCount: 93, startPage: 377 },
  28: { number: 28, name: 'القصص', englishName: 'Al-Qasas', revelationPlace: 'makkah', versesCount: 88, startPage: 385 },
  29: { number: 29, name: 'العنكبوت', englishName: "Al-'Ankabut", revelationPlace: 'makkah', versesCount: 69, startPage: 396 },
  30: { number: 30, name: 'الروم', englishName: 'Ar-Rum', revelationPlace: 'makkah', versesCount: 60, startPage: 404 },
  31: { number: 31, name: 'لقمان', englishName: 'Luqman', revelationPlace: 'makkah', versesCount: 34, startPage: 411 },
  32: { number: 32, name: 'السجدة', englishName: 'As-Sajdah', revelationPlace: 'makkah', versesCount: 30, startPage: 415 },
  33: { number: 33, name: 'الأحزاب', englishName: 'Al-Ahzab', revelationPlace: 'madinah', versesCount: 73, startPage: 418 },
  34: { number: 34, name: 'سبأ', englishName: 'Saba', revelationPlace: 'makkah', versesCount: 54, startPage: 428 },
  35: { number: 35, name: 'فاطر', englishName: 'Fatir', revelationPlace: 'makkah', versesCount: 45, startPage: 434 },
  36: { number: 36, name: 'يس', englishName: 'Ya-Sin', revelationPlace: 'makkah', versesCount: 83, startPage: 440 },
  37: { number: 37, name: 'الصافات', englishName: 'As-Saffat', revelationPlace: 'makkah', versesCount: 182, startPage: 446 },
  38: { number: 38, name: 'ص', englishName: 'Sad', revelationPlace: 'makkah', versesCount: 88, startPage: 453 },
  39: { number: 39, name: 'الزمر', englishName: 'Az-Zumar', revelationPlace: 'makkah', versesCount: 75, startPage: 458 },
  40: { number: 40, name: 'غافر', englishName: 'Ghafir', revelationPlace: 'makkah', versesCount: 85, startPage: 467 },
  41: { number: 41, name: 'فصلت', englishName: 'Fussilat', revelationPlace: 'makkah', versesCount: 54, startPage: 477 },
  42: { number: 42, name: 'الشورى', englishName: 'Ash-Shura', revelationPlace: 'makkah', versesCount: 53, startPage: 483 },
  43: { number: 43, name: 'الزخرف', englishName: 'Az-Zukhruf', revelationPlace: 'makkah', versesCount: 89, startPage: 489 },
  44: { number: 44, name: 'الدخان', englishName: 'Ad-Dukhan', revelationPlace: 'makkah', versesCount: 59, startPage: 496 },
  45: { number: 45, name: 'الجاثية', englishName: 'Al-Jathiyah', revelationPlace: 'makkah', versesCount: 37, startPage: 499 },
  46: { number: 46, name: 'الأحقاف', englishName: 'Al-Ahqaf', revelationPlace: 'makkah', versesCount: 35, startPage: 502 },
  47: { number: 47, name: 'محمد', englishName: 'Muhammad', revelationPlace: 'madinah', versesCount: 38, startPage: 507 },
  48: { number: 48, name: 'الفتح', englishName: 'Al-Fath', revelationPlace: 'madinah', versesCount: 29, startPage: 511 },
  49: { number: 49, name: 'الحجرات', englishName: 'Al-Hujurat', revelationPlace: 'madinah', versesCount: 18, startPage: 515 },
  50: { number: 50, name: 'ق', englishName: 'Qaf', revelationPlace: 'makkah', versesCount: 45, startPage: 518 },
  51: { number: 51, name: 'الذاريات', englishName: 'Adh-Dhariyat', revelationPlace: 'makkah', versesCount: 60, startPage: 520 },
  52: { number: 52, name: 'الطور', englishName: 'At-Tur', revelationPlace: 'makkah', versesCount: 49, startPage: 523 },
  53: { number: 53, name: 'النجم', englishName: 'An-Najm', revelationPlace: 'makkah', versesCount: 62, startPage: 526 },
  54: { number: 54, name: 'القمر', englishName: 'Al-Qamar', revelationPlace: 'makkah', versesCount: 55, startPage: 528 },
  55: { number: 55, name: 'الرحمن', englishName: 'Ar-Rahman', revelationPlace: 'madinah', versesCount: 78, startPage: 531 },
  56: { number: 56, name: 'الواقعة', englishName: "Al-Waqi'ah", revelationPlace: 'makkah', versesCount: 96, startPage: 534 },
  57: { number: 57, name: 'الحديد', englishName: 'Al-Hadid', revelationPlace: 'madinah', versesCount: 29, startPage: 537 },
  58: { number: 58, name: 'المجادلة', englishName: 'Al-Mujadila', revelationPlace: 'madinah', versesCount: 22, startPage: 542 },
  59: { number: 59, name: 'الحشر', englishName: 'Al-Hashr', revelationPlace: 'madinah', versesCount: 24, startPage: 545 },
  60: { number: 60, name: 'الممتحنة', englishName: 'Al-Mumtahanah', revelationPlace: 'madinah', versesCount: 13, startPage: 549 },
  61: { number: 61, name: 'الصف', englishName: 'As-Saf', revelationPlace: 'madinah', versesCount: 14, startPage: 551 },
  62: { number: 62, name: 'الجمعة', englishName: "Al-Jumu'ah", revelationPlace: 'madinah', versesCount: 11, startPage: 553 },
  63: { number: 63, name: 'المنافقون', englishName: 'Al-Munafiqun', revelationPlace: 'madinah', versesCount: 11, startPage: 554 },
  64: { number: 64, name: 'التغابن', englishName: 'At-Taghabun', revelationPlace: 'madinah', versesCount: 18, startPage: 556 },
  65: { number: 65, name: 'الطلاق', englishName: 'At-Talaq', revelationPlace: 'madinah', versesCount: 12, startPage: 558 },
  66: { number: 66, name: 'التحريم', englishName: 'At-Tahrim', revelationPlace: 'madinah', versesCount: 12, startPage: 560 },
  67: { number: 67, name: 'الملك', englishName: 'Al-Mulk', revelationPlace: 'makkah', versesCount: 30, startPage: 562 },
  68: { number: 68, name: 'القلم', englishName: 'Al-Qalam', revelationPlace: 'makkah', versesCount: 52, startPage: 564 },
  69: { number: 69, name: 'الحاقة', englishName: 'Al-Haqqah', revelationPlace: 'makkah', versesCount: 52, startPage: 566 },
  70: { number: 70, name: 'المعارج', englishName: "Al-Ma'arij", revelationPlace: 'makkah', versesCount: 44, startPage: 568 },
  71: { number: 71, name: 'نوح', englishName: 'Nuh', revelationPlace: 'makkah', versesCount: 28, startPage: 570 },
  72: { number: 72, name: 'الجن', englishName: 'Al-Jinn', revelationPlace: 'makkah', versesCount: 28, startPage: 572 },
  73: { number: 73, name: 'المزمل', englishName: 'Al-Muzzammil', revelationPlace: 'makkah', versesCount: 20, startPage: 574 },
  74: { number: 74, name: 'المدثر', englishName: 'Al-Muddaththir', revelationPlace: 'makkah', versesCount: 56, startPage: 575 },
  75: { number: 75, name: 'القيامة', englishName: 'Al-Qiyamah', revelationPlace: 'makkah', versesCount: 40, startPage: 577 },
  76: { number: 76, name: 'الإنسان', englishName: 'Al-Insan', revelationPlace: 'madinah', versesCount: 31, startPage: 578 },
  77: { number: 77, name: 'المرسلات', englishName: 'Al-Mursalat', revelationPlace: 'makkah', versesCount: 50, startPage: 580 },
  78: { number: 78, name: 'النبأ', englishName: "An-Naba'", revelationPlace: 'makkah', versesCount: 40, startPage: 582 },
  79: { number: 79, name: 'النازعات', englishName: "An-Nazi'at", revelationPlace: 'makkah', versesCount: 46, startPage: 583 },
  80: { number: 80, name: 'عبس', englishName: "'Abasa", revelationPlace: 'makkah', versesCount: 42, startPage: 585 },
  81: { number: 81, name: 'التكوير', englishName: 'At-Takwir', revelationPlace: 'makkah', versesCount: 29, startPage: 586 },
  82: { number: 82, name: 'الانفطار', englishName: 'Al-Infitar', revelationPlace: 'makkah', versesCount: 19, startPage: 587 },
  83: { number: 83, name: 'المطففين', englishName: 'Al-Mutaffifin', revelationPlace: 'makkah', versesCount: 36, startPage: 587 },
  84: { number: 84, name: 'الانشقاق', englishName: 'Al-Inshiqaq', revelationPlace: 'makkah', versesCount: 25, startPage: 589 },
  85: { number: 85, name: 'البروج', englishName: 'Al-Buruj', revelationPlace: 'makkah', versesCount: 22, startPage: 590 },
  86: { number: 86, name: 'الطارق', englishName: 'At-Tariq', revelationPlace: 'makkah', versesCount: 17, startPage: 591 },
  87: { number: 87, name: 'الأعلى', englishName: "Al-A'la", revelationPlace: 'makkah', versesCount: 19, startPage: 591 },
  88: { number: 88, name: 'الغاشية', englishName: 'Al-Ghashiyah', revelationPlace: 'makkah', versesCount: 26, startPage: 592 },
  89: { number: 89, name: 'الفجر', englishName: 'Al-Fajr', revelationPlace: 'makkah', versesCount: 30, startPage: 593 },
  90: { number: 90, name: 'البلد', englishName: 'Al-Balad', revelationPlace: 'makkah', versesCount: 20, startPage: 594 },
  91: { number: 91, name: 'الشمس', englishName: 'Ash-Shams', revelationPlace: 'makkah', versesCount: 15, startPage: 595 },
  92: { number: 92, name: 'الليل', englishName: 'Al-Layl', revelationPlace: 'makkah', versesCount: 21, startPage: 595 },
  93: { number: 93, name: 'الضحى', englishName: 'Ad-Duha', revelationPlace: 'makkah', versesCount: 11, startPage: 596 },
  94: { number: 94, name: 'الشرح', englishName: 'Ash-Sharh', revelationPlace: 'makkah', versesCount: 8, startPage: 596 },
  95: { number: 95, name: 'التين', englishName: 'At-Tin', revelationPlace: 'makkah', versesCount: 8, startPage: 597 },
  96: { number: 96, name: 'العلق', englishName: "Al-'Alaq", revelationPlace: 'makkah', versesCount: 19, startPage: 597 },
  97: { number: 97, name: 'القدر', englishName: 'Al-Qadr', revelationPlace: 'makkah', versesCount: 5, startPage: 598 },
  98: { number: 98, name: 'البينة', englishName: 'Al-Bayyinah', revelationPlace: 'madinah', versesCount: 8, startPage: 598 },
  99: { number: 99, name: 'الزلزلة', englishName: 'Az-Zalzalah', revelationPlace: 'madinah', versesCount: 8, startPage: 599 },
  100: { number: 100, name: 'العاديات', englishName: "Al-'Adiyat", revelationPlace: 'makkah', versesCount: 11, startPage: 599 },
  101: { number: 101, name: 'القارعة', englishName: "Al-Qari'ah", revelationPlace: 'makkah', versesCount: 11, startPage: 600 },
  102: { number: 102, name: 'التكاثر', englishName: 'At-Takathur', revelationPlace: 'makkah', versesCount: 8, startPage: 600 },
  103: { number: 103, name: 'العصر', englishName: "Al-'Asr", revelationPlace: 'makkah', versesCount: 3, startPage: 601 },
  104: { number: 104, name: 'الهمزة', englishName: 'Al-Humazah', revelationPlace: 'makkah', versesCount: 9, startPage: 601 },
  105: { number: 105, name: 'الفيل', englishName: 'Al-Fil', revelationPlace: 'makkah', versesCount: 5, startPage: 601 },
  106: { number: 106, name: 'قريش', englishName: 'Quraysh', revelationPlace: 'makkah', versesCount: 4, startPage: 602 },
  107: { number: 107, name: 'الماعون', englishName: "Al-Ma'un", revelationPlace: 'makkah', versesCount: 7, startPage: 602 },
  108: { number: 108, name: 'الكوثر', englishName: 'Al-Kawthar', revelationPlace: 'makkah', versesCount: 3, startPage: 602 },
  109: { number: 109, name: 'الكافرون', englishName: 'Al-Kafirun', revelationPlace: 'makkah', versesCount: 6, startPage: 603 },
  110: { number: 110, name: 'النصر', englishName: 'An-Nasr', revelationPlace: 'madinah', versesCount: 3, startPage: 603 },
  111: { number: 111, name: 'المسد', englishName: 'Al-Masad', revelationPlace: 'makkah', versesCount: 5, startPage: 603 },
  112: { number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', revelationPlace: 'makkah', versesCount: 4, startPage: 604 },
  113: { number: 113, name: 'الفلق', englishName: 'Al-Falaq', revelationPlace: 'makkah', versesCount: 5, startPage: 604 },
  114: { number: 114, name: 'الناس', englishName: 'An-Nas', revelationPlace: 'makkah', versesCount: 6, startPage: 604 },
};

export const SURAH_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(SURAH_METADATA).map(([num, meta]) => [num, meta.name])
);

export const SURAH_PAGES: Record<number, number> = Object.fromEntries(
  Object.entries(SURAH_METADATA).map(([num, meta]) => [num, meta.startPage])
);

export interface JuzInfo {
  juzNumber: number;
  name: string;
  startPage: number;
  startSurah: string;
}

export const JUZ_METADATA: JuzInfo[] = [
  { juzNumber: 1, name: 'الم', startPage: 1, startSurah: 'الفاتحة' },
  { juzNumber: 2, name: 'سيقول السفهاء', startPage: 22, startSurah: 'البقرة' },
  { juzNumber: 3, name: 'تلك الرسل', startPage: 42, startSurah: 'البقرة' },
  { juzNumber: 4, name: 'لن تنالوا البر', startPage: 62, startSurah: 'آل عمران' },
  { juzNumber: 5, name: 'والمحصنات', startPage: 82, startSurah: 'النساء' },
  { juzNumber: 6, name: 'لا يحب الله', startPage: 102, startSurah: 'النساء' },
  { juzNumber: 7, name: 'وإذا سمعوا', startPage: 121, startSurah: 'المائدة' },
  { juzNumber: 8, name: 'ولو أننا', startPage: 142, startSurah: 'الأنعام' },
  { juzNumber: 9, name: 'قال الملأ', startPage: 162, startSurah: 'الأعراف' },
  { juzNumber: 10, name: 'واعلموا', startPage: 182, startSurah: 'الأنفال' },
  { juzNumber: 11, name: 'يعتذرون إليكم', startPage: 201, startSurah: 'التوبة' },
  { juzNumber: 12, name: 'وما من دابة', startPage: 222, startSurah: 'هود' },
  { juzNumber: 13, name: 'وما أبرئ نفسي', startPage: 242, startSurah: 'يوسف' },
  { juzNumber: 14, name: 'ربما يود', startPage: 262, startSurah: 'الحجر' },
  { juzNumber: 15, name: 'سبحان الذي أسرى', startPage: 282, startSurah: 'الإسراء' },
  { juzNumber: 16, name: 'قال ألم أقل لك', startPage: 302, startSurah: 'الكهف' },
  { juzNumber: 17, name: 'اقترب للناس', startPage: 322, startSurah: 'الأنبياء' },
  { juzNumber: 18, name: 'قد أفلح المؤمنون', startPage: 342, startSurah: 'المؤمنون' },
  { juzNumber: 19, name: 'وقال الذين لا يرجون', startPage: 362, startSurah: 'الفرقان' },
  { juzNumber: 20, name: 'أمن خلق', startPage: 382, startSurah: 'النمل' },
  { juzNumber: 21, name: 'اتل ما أوحي', startPage: 402, startSurah: 'العنكبوت' },
  { juzNumber: 22, name: 'ومن يقنت', startPage: 422, startSurah: 'الأحزاب' },
  { juzNumber: 23, name: 'وما أنزلنا', startPage: 442, startSurah: 'يس' },
  { juzNumber: 24, name: 'فمن أظلم', startPage: 462, startSurah: 'الزمر' },
  { juzNumber: 25, name: 'إليه يرد علم الساعة', startPage: 482, startSurah: 'فصلت' },
  { juzNumber: 26, name: 'حم', startPage: 502, startSurah: 'الأحقاف' },
  { juzNumber: 27, name: 'قال فما خطبكم', startPage: 522, startSurah: 'الذاريات' },
  { juzNumber: 28, name: 'قد سمع الله', startPage: 542, startSurah: 'المجادلة' },
  { juzNumber: 29, name: 'تبارك الذي', startPage: 562, startSurah: 'الملك' },
  { juzNumber: 30, name: 'عمّ يتساءلون', startPage: 582, startSurah: 'النبأ' },
];

export interface ReciterInfo {
  id: number;
  name: string;
  englishName: string;
}

export const POPULAR_RECITERS: ReciterInfo[] = [
  { id: 7, name: 'مشاري راشد العفاسي', englishName: 'Mishari Rashid al-Afasy' },
  { id: 1, name: 'عبد الباسط عبد الصمد (مرتل)', englishName: 'AbdulBaset AbdulSamad (Murattal)' },
  { id: 2, name: 'عبد الباسط عبد الصمد (مجود)', englishName: 'AbdulBaset AbdulSamad (Mujawwad)' },
  { id: 3, name: 'عبد الرحمن السديس', englishName: 'Abdur-Rahman as-Sudais' },
  { id: 4, name: 'أبو بكر الشاطري', englishName: 'Abu Bakr al-Shatri' },
  { id: 5, name: 'هاني الرفاعي', englishName: 'Hani ar-Rifai' },
  { id: 6, name: 'محمود خليل الحصري', englishName: 'Mahmoud Khalil Al-Husary' },
  { id: 8, name: 'ماهر المعيقلي', englishName: 'Maher al-Muaiqly' },
  { id: 9, name: 'محمد صديق المنشاوي (مرتل)', englishName: 'Mohamed Siddiq al-Minshawi' },
  { id: 10, name: 'سعود الشريم', englishName: 'Saud ash-Shuraym' },
  { id: 12, name: 'سعد الغامدي', englishName: 'Saad Al-Ghamdi' },
];

export const RECITER_AUDIO_SERVERS: Record<number, string> = {
  7: 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1', // Mishari Rashid Alafasy
  1: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3', // AbdulBaset Murattal
  2: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1', // AbdulBaset Mujawwad
  3: 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1', // Abdur-Rahman as-Sudais
  4: 'https://cdn.mp3quran.net/audio/abubakr-shatri/r1', // Abu Bakr al-Shatri
  5: 'https://cdn.mp3quran.net/audio/hani-rifai/r1', // Hani ar-Rifai
  6: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1', // Mahmoud Khalil Al-Husary
  8: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1', // Maher al-Muaiqly
  9: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1', // Mohamed Siddiq al-Minshawi
  10: 'https://cdn.mp3quran.net/audio/saud-shuraim/r1', // Saud ash-Shuraym
  12: 'https://cdn.mp3quran.net/audio/saad-ghamdi/r1', // Saad Al-Ghamdi
};

export function getDirectReciterAudioUrl(reciterId: number, surahNumber: number): string {
  const pad3 = surahNumber.toString().padStart(3, '0');
  const server = RECITER_AUDIO_SERVERS[reciterId] || RECITER_AUDIO_SERVERS[7];
  return `${server}/${pad3}.mp3`;
}

export function getSurahMeta(surahNumber: number): SurahMeta | undefined {
  return SURAH_METADATA[surahNumber];
}

export function getSurahPage(surahNumber: number): number {
  return SURAH_METADATA[surahNumber]?.startPage || 1;
}

export function getSurahName(surahNumber: number): string {
  return SURAH_METADATA[surahNumber]?.name || `سورة ${surahNumber}`;
}

/**
 * Normalizes input containing Arabic-Indic numerals (٠-٩) or Persian numerals (۰-۹)
 * and extracts a valid positive integer.
 */
export function parseArabicOrWesternNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return NaN;
  if (typeof input === 'number') {
    return isNaN(input) ? NaN : Math.floor(input);
  }
  const str = input.toString().trim();
  if (!str) return NaN;

  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const easternPersian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let normalized = str;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replaceAll(arabicNumerals[i], i.toString());
    normalized = normalized.replaceAll(easternPersian[i], i.toString());
  }

  const digitsOnly = normalized.replace(/[^\d]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : NaN;
}

/**
 * Returns the primary Surah that appears or starts on the given page (1-604).
 */
export function getSurahForPage(page: number): SurahMeta | undefined {
  if (page < 1 || page > 604) return undefined;
  let result: SurahMeta = SURAH_METADATA[1];
  for (let i = 1; i <= 114; i++) {
    const meta = SURAH_METADATA[i];
    if (meta && meta.startPage <= page) {
      result = meta;
    } else {
      break;
    }
  }
  return result;
}

