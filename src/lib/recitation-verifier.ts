// Smart Quranic Recitation Verifier and Arabic Phonetic Alignment Engine
// High-precision Arabic speech verification with Uthmani script normalization and Tajweed phonetic tolerance

export interface QuranWord {
  index: number;
  original: string;
  clean: string;
  status: 'pending' | 'current' | 'correct' | 'incorrect';
  spokenText?: string;
  hint?: string;
}

export interface VerificationResult {
  words: QuranWord[];
  currentWordIndex: number;
  correctCount: number;
  totalWords: number;
  accuracyPercentage: number;
  isComplete: boolean;
  hasErrors: boolean;
  lastError: {
    expectedWord: string;
    spokenWord: string;
    wordIndex: number;
    tip?: string;
  } | null;
  fullTranscript: string;
}

// Common Uthmani orthography variations to standard spoken Arabic
const UTHMANI_MAPPINGS: Record<string, string> = {
  'الصلوة': 'الصلاة',
  'الزكوة': 'الزكاة',
  'الحيوة': 'الحياة',
  'الربوا': 'الربا',
  'مشكوة': 'مشكاة',
  'الغدوة': 'الغداة',
  'منوة': 'مناة',
  'نجوة': 'نجاة',
  'ابرهيم': 'ابراهيم',
  'اسمعيل': 'اسماعيل',
  'اسحق': 'اسحاق',
  'هرون': 'هارون',
  'سليمن': 'سليمان',
  'داوود': 'داود',
  'ءامنوا': 'امنوا',
  'ايت': 'ايات',
  'السموت': 'السماوات',
  'السموات': 'السماوات',
};

/**
 * Normalizes Arabic text for fair, phonetic comparison:
 * - Converts dagger alif (\u0670), small waw (\u06E5), small yaa (\u06E6) to full letters
 * - Strips all Quranic waqf marks and special symbols
 * - Strips all Arabic harakat / diacritics
 * - Normalizes Alif variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Yaa / Alif Maqsura (ى -> ي)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Replaces Uthmani script peculiarities with spoken equivalents
 */
export function normalizeArabicForComparison(text: string): string {
  if (!text) return '';

  let normalized = text
    // Replace dagger alif with standard Alif before stripping diacritics
    .replace(/\u0670/g, 'ا')
    // Replace small waw & small yaa
    .replace(/\u06E5/g, 'و')
    .replace(/\u06E6/g, 'ي')
    // Remove Quranic waqf and annotation marks (Unicode range \u06D6 - \u06ED and others)
    .replace(/[\u06D6-\u06ED\u0615-\u061A\u0600-\u0605\uFD3E\uFD3F]/g, '')
    // Remove all Arabic tashkeel / diacritics
    .replace(/[\u064B-\u065F]/g, '')
    // Normalize Alif Wasla and variants to bare Alif
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Alif Maqsura to Yaa
    .replace(/ى/g, 'ي')
    // Normalize Taa Marbuta to Haa for speech recognition equivalence
    .replace(/ة/g, 'ه')
    // Normalize Hamza on Waw / Yaa
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Remove Tatweel (Kashida)
    .replace(/ـ/g, '')
    // Remove punctuation, brackets, ayah end symbols
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،«»""'']/g, '')
    .replace(/[\u0660-\u0669\d﴿﴾]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Apply Uthmani mapping for known words
  const words = normalized.split(/\s+/).map((w) => UTHMANI_MAPPINGS[w] || w);
  return words.join(' ');
}

/**
 * Splits Quranic Uthmani text into words with both original and normalized representation.
 */
export function splitQuranWords(textUthmani: string): QuranWord[] {
  if (!textUthmani) return [];

  // Remove trailing ayah end numbers if present (e.g. ﴿١﴾ or digits)
  const cleanedText = textUthmani.replace(/[\u0660-\u0669\d\(\)\[\]﴿﴾]/g, ' ').trim();
  const rawWords = cleanedText.split(/\s+/).filter((w) => w.length > 0);

  return rawWords.map((original, index) => {
    const clean = normalizeArabicForComparison(original);
    return {
      index,
      original,
      clean,
      status: index === 0 ? 'current' : 'pending',
    };
  });
}

/**
 * Phonetically aware similarity between two normalized Arabic words
 */
export function wordSimilarity(word1: string, word2: string): number {
  if (!word1 || !word2) return 0.0;
  if (word1 === word2) return 1.0;

  // 1. Definite article handling (ال التعريف): e.g. "الرحمن" vs "رحمن"
  const w1NoAl = word1.startsWith('ال') && word1.length > 3 ? word1.substring(2) : word1;
  const w2NoAl = word2.startsWith('ال') && word2.length > 3 ? word2.substring(2) : word2;
  if (w1NoAl === w2NoAl) return 0.95;

  // 2. Conjunction prefixes (و / ف / ب / ل / ك): e.g. "وبالحق" vs "بالحق"
  const stripPrefix = (w: string) => (w.length > 3 && (w.startsWith('و') || w.startsWith('ف') || w.startsWith('ب') || w.startsWith('ل')) ? w.substring(1) : w);
  if (stripPrefix(word1) === stripPrefix(word2)) return 0.90;

  // 3. Phonetic interchangeability in Arabic Speech Recognition (ASR):
  // ذ <-> ز, ث <-> س, ظ <-> ض, ق <-> ك/غ
  const phonetize = (s: string) =>
    s
      .replace(/[ذز]/g, 'ز')
      .replace(/[ثسص]/g, 'س')
      .replace(/[ظض]/g, 'ض')
      .replace(/[طت]/g, 'ت');

  if (phonetize(word1) === phonetize(word2)) return 0.92;

  // 4. Levenshtein edit distance with length weighting
  const s1 = word1.length < word2.length ? word1 : word2;
  const s2 = word1.length < word2.length ? word2 : word1;
  const longerLength = s2.length;
  if (longerLength === 0) return 1.0;

  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    costs[i] = i;
  }

  for (let i = 1; i <= s2.length; i++) {
    costs[0] = i;
    let nw = i - 1;
    for (let j = 1; j <= s1.length; j++) {
      const cj = Math.min(
        1 + Math.min(costs[j], costs[j - 1]),
        s2.charAt(i - 1) === s1.charAt(j - 1) ? nw : nw + 1
      );
      nw = costs[j];
      costs[j] = cj;
    }
  }

  const rawSim = (longerLength - costs[s1.length]) / longerLength;

  // Boost similarity if prefix or suffix matches
  if (rawSim > 0.5 && (word1.startsWith(word2) || word2.startsWith(word1) || word1.endsWith(word2) || word2.endsWith(word1))) {
    return Math.min(1.0, rawSim + 0.15);
  }

  return rawSim;
}

/**
 * Compare spoken transcript against the Quranic verse words with compound word resolution
 */
export function verifyRecitation(
  verseWords: QuranWord[],
  spokenTranscript: string
): VerificationResult {
  const normalizedSpoken = normalizeArabicForComparison(spokenTranscript);
  const spokenWords = normalizedSpoken.split(/\s+/).filter((w) => w.length > 0);

  const updatedWords: QuranWord[] = verseWords.map((w) => ({
    ...w,
    status: 'pending',
    spokenText: undefined,
    hint: undefined,
  }));

  let spokenPointer = 0;
  let correctCount = 0;
  let lastError: VerificationResult['lastError'] = null;
  let hasErrors = false;

  for (let vIndex = 0; vIndex < updatedWords.length; vIndex++) {
    const qWord = updatedWords[vIndex];

    if (spokenPointer >= spokenWords.length) {
      if (vIndex === correctCount) {
        qWord.status = 'current';
      } else {
        qWord.status = 'pending';
      }
      continue;
    }

    const currentSpoken = spokenWords[spokenPointer];
    const similarity = wordSimilarity(qWord.clean, currentSpoken);

    // Adaptive threshold based on word length
    const threshold = qWord.clean.length <= 2 ? 0.70 : qWord.clean.length <= 4 ? 0.68 : 0.65;

    // Direct match
    if (similarity >= threshold) {
      qWord.status = 'correct';
      qWord.spokenText = currentSpoken;
      correctCount++;
      spokenPointer++;
      continue;
    }

    // Compound word check 1: Two spoken words form one Quran word (e.g. "في" + "ما" -> "فيما")
    if (spokenPointer + 1 < spokenWords.length) {
      const combinedSpoken = currentSpoken + spokenWords[spokenPointer + 1];
      if (wordSimilarity(qWord.clean, combinedSpoken) >= 0.75) {
        qWord.status = 'correct';
        qWord.spokenText = `${currentSpoken} ${spokenWords[spokenPointer + 1]}`;
        correctCount++;
        spokenPointer += 2;
        continue;
      }
    }

    // Compound word check 2: One spoken word covers two Quran words (e.g. "يأيها" -> "يا" + "أيها")
    if (vIndex + 1 < updatedWords.length) {
      const combinedQuran = qWord.clean + updatedWords[vIndex + 1].clean;
      if (wordSimilarity(combinedQuran, currentSpoken) >= 0.75) {
        qWord.status = 'correct';
        qWord.spokenText = currentSpoken;
        updatedWords[vIndex + 1].status = 'correct';
        updatedWords[vIndex + 1].spokenText = currentSpoken;
        correctCount += 2;
        vIndex++;
        spokenPointer++;
        continue;
      }
    }

    // Lookahead for user hesitation, stutter, or repeated word
    let foundAhead = false;
    for (let lookahead = 1; lookahead <= 2 && spokenPointer + lookahead < spokenWords.length; lookahead++) {
      if (wordSimilarity(qWord.clean, spokenWords[spokenPointer + lookahead]) >= threshold) {
        spokenPointer += lookahead + 1;
        qWord.status = 'correct';
        correctCount++;
        foundAhead = true;
        break;
      }
    }

    if (!foundAhead) {
      qWord.status = 'incorrect';
      qWord.spokenText = currentSpoken;
      hasErrors = true;

      // Provide Tajweed / pronunciation hint
      let tip = 'انتبه لنطق الحروف ومخارجها';
      if (qWord.clean.startsWith('ال') && !currentSpoken.startsWith('ال')) {
        tip = 'انتبه لهمزة الوصل وال التعريف';
      } else if (qWord.clean.length > currentSpoken.length) {
        tip = 'تأكد من عدم إسقاط حروف الكلمة أو المد الطبيعي';
      }

      qWord.hint = tip;
      lastError = {
        expectedWord: qWord.original,
        spokenWord: currentSpoken,
        wordIndex: vIndex,
        tip,
      };
      spokenPointer++;
    }
  }

  const totalWords = updatedWords.length;
  const accuracyPercentage = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;
  const isComplete = correctCount === totalWords;

  // Mark first non-correct word as current
  const firstNonCorrect = updatedWords.findIndex((w) => w.status !== 'correct');
  const currentWordIndex = firstNonCorrect !== -1 ? firstNonCorrect : totalWords - 1;
  if (firstNonCorrect !== -1 && updatedWords[firstNonCorrect].status === 'pending') {
    updatedWords[firstNonCorrect].status = 'current';
  }

  return {
    words: updatedWords,
    currentWordIndex,
    correctCount,
    totalWords,
    accuracyPercentage,
    isComplete,
    hasErrors,
    lastError,
    fullTranscript: spokenTranscript,
  };
}
