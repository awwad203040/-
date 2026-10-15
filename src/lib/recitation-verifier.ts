// Smart Quranic Recitation Verifier and Arabic Phonetic Alignment Engine
// Compares live spoken words against verified Quran Foundation text

export interface QuranWord {
  index: number;
  original: string;
  clean: string;
  status: 'pending' | 'current' | 'correct' | 'incorrect';
  spokenText?: string;
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
  } | null;
  fullTranscript: string;
}

/**
 * Normalizes Arabic text for fair, phonetic comparison:
 * - Strips all Quranic waqf marks and special symbols
 * - Strips all Arabic harakat / diacritics
 * - Normalizes Alif variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Yaa / Alif Maqsura (ى -> ي)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes spaces
 */
export function normalizeArabicForComparison(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove Quranic waqf and annotation marks (Unicode range \u06D6 - \u06ED and others)
      .replace(/[\u06D6-\u06ED\u0615-\u061A\u0600-\u0605\uFD3E\uFD3F]/g, '')
      // Remove all Arabic tashkeel / diacritics (Fatha, Damma, Kasra, Sukun, Shadda, Tanween, etc.)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Normalize Alif Wasla and variants to bare Alif
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize Alif Maqsura to Yaa
      .replace(/ى/g, 'ي')
      // Normalize Taa Marbuta to Haa for oral recognition equivalence
      .replace(/ة/g, 'ه')
      // Remove Tatweel (Kashida)
      .replace(/ـ/g, '')
      // Remove punctuation and extra symbols
      .replace(/[.,/#!$%^&*;:{}=\-_`~()؟،«»""'']/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
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
 * Levenshtein distance between two normalized Arabic words to tolerate slight ASR variations
 */
function wordSimilarity(word1: string, word2: string): number {
  if (word1 === word2) return 1.0;
  if (!word1 || !word2) return 0.0;

  // Direct prefix/suffix match (Arabic prefixes like و / ف / ب / ك)
  if (word1.length > 2 && word2.length > 2) {
    if (word1.startsWith(word2) || word2.startsWith(word1)) return 0.85;
    if (word1.endsWith(word2) || word2.endsWith(word1)) return 0.85;
  }

  const s1 = word1.length < word2.length ? word1 : word2;
  const s2 = word1.length < word2.length ? word2 : word1;

  let longer = s2;
  let shorter = s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  // Edit distance calculation
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    costs[i] = i;
  }

  for (let i = 1; i <= longer.length; i++) {
    costs[0] = i;
    let nw = i - 1;
    for (let j = 1; j <= shorter.length; j++) {
      const cj = Math.min(
        1 + Math.min(costs[j], costs[j - 1]),
        longer.charAt(i - 1) === shorter.charAt(j - 1) ? nw : nw + 1
      );
      nw = costs[j];
      costs[j] = cj;
    }
  }

  return (longerLength - costs[shorter.length]) / longerLength;
}

/**
 * Compare spoken transcript against the Quranic verse words
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
  }));

  let spokenPointer = 0;
  let correctCount = 0;
  let lastError: VerificationResult['lastError'] = null;
  let hasErrors = false;

  for (let vIndex = 0; vIndex < updatedWords.length; vIndex++) {
    const qWord = updatedWords[vIndex];

    if (spokenPointer >= spokenWords.length) {
      // User hasn't reached this word yet
      if (vIndex === correctCount) {
        qWord.status = 'current';
      } else {
        qWord.status = 'pending';
      }
      continue;
    }

    const currentSpoken = spokenWords[spokenPointer];
    const similarity = wordSimilarity(qWord.clean, currentSpoken);

    if (similarity >= 0.72) {
      // Matches! Correct word recited
      qWord.status = 'correct';
      qWord.spokenText = currentSpoken;
      correctCount++;
      spokenPointer++;
    } else {
      // Check if user spoke a compound word or skipped ahead
      let foundAhead = false;
      for (let lookahead = 1; lookahead <= 2 && spokenPointer + lookahead < spokenWords.length; lookahead++) {
        if (wordSimilarity(qWord.clean, spokenWords[spokenPointer + lookahead]) >= 0.75) {
          // User corrected themselves or added a filler, advance spoken pointer
          spokenPointer += lookahead + 1;
          qWord.status = 'correct';
          correctCount++;
          foundAhead = true;
          break;
        }
      }

      if (!foundAhead) {
        // Mark as mistake or error
        qWord.status = 'incorrect';
        qWord.spokenText = currentSpoken;
        hasErrors = true;
        lastError = {
          expectedWord: qWord.original,
          spokenWord: currentSpoken,
          wordIndex: vIndex,
        };
        // Advance spoken pointer to keep trying next words
        spokenPointer++;
      }
    }
  }

  const totalWords = updatedWords.length;
  const accuracyPercentage = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;
  const isComplete = correctCount === totalWords;

  // Find the first non-correct word to mark as current if not complete
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
