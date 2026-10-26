export type Chapter = {
  id: number;
  revelationPlace: 'makkah' | 'madinah';
  revelationOrder: number;
  bismillahPre: boolean;
  nameSimple: string;
  nameComplex: string;
  nameArabic: string;
  versesCount: number;
  pages: number[];
  translatedName: {
    name: string;
    languageName: string;
  };
};

export type Verse = {
  id: number;
  verseNumber: number;
  verseKey: string;
  hizbNumber: number;
  rubElHizbNumber: number;
  sajdahNumber: number | null;
  sajdahType: string | null;
  pageNumber: number;
  juzNumber: number;
  textUthmani: string;
  textImlaei?: string;
  chapterNumber?: number;
  chapterId?: number;
  text_uthmani?: string;
  verse_number?: number;
  verse_key?: string;
  hizb_number?: number;
  rub_el_hizb_number?: number;
  sajdah_number?: number | null;
  sajdah_type?: string | null;
  page_number?: number;
  juz_number?: number;
  chapter_id?: number;
};

export type MushafPage = {
  pageNumber: number;
  verses: Verse[];
  chapters: PageChapterInfo[];
};

export type PageChapterInfo = {
  chapterNumber: number;
  nameArabic: string;
  nameSimple: string;
  versesCount: number;
  revelationPlace: 'makkah' | 'madinah';
};

export type Reciter = {
  id: number;
  name: string;
  arabicName?: string;
  style?: string;
  translatedName?: {
    name: string;
    languageName: string;
  };
  reciterId?: number;
};

export type AudioFile = {
  url: string;
  duration?: number;
  format?: string;
  chapterId: number;
  audioUrl?: string;
};

export type Tafsir = {
  id: number;
  resourceId?: number;
  text: string;
  resourceName?: string;
  languageName?: string;
  verseKey?: string;
};

export type TafsirResource = {
  id: number;
  name: string;
  authorName: string;
  slug: string;
  languageName: string;
  translatedName: {
    name: string;
    languageName: string;
  };
};

export type Bookmark = {
  id: string;
  userId?: string;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  verseKey: string;
  note?: string;
  createdAt: string;
};

export type ReadingProgress = {
  id?: string;
  userId?: string;
  pageNumber: number;
  surahNumber?: number;
  ayahNumber?: number;
  updatedAt: string;
  surahName?: string;
  juzNumber?: number;
  customPagesReadCount?: number;
};

export type ReadingStats = {
  pagesRead: number;
  totalPages: number;
  percentage: number;
  currentPage: number;
  lastReadAt?: string;
};

export type UserSettings = {
  fontSize: number;
  nightMode: boolean;
  readingMode: 'mushaf' | 'verse';
  selectedReciterId?: number;
  selectedTafsirId?: number;
};

export type SearchResult = {
  results: Verse[];
  totalResults: number;
};

export type Khatmah = {
  id: string;
  startDate: string;
  targetDays: number;
  startPage: number;
  currentPage: number;
  completed: boolean;
};

export type DailyWird = {
  date: string;
  pagesRead: number;
  targetPages: number;
};
