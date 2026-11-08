import 'server-only';
import { getDirectReciterAudioUrl, RECITER_AYAH_FOLDERS, getDirectAyahAudioUrl } from './quran-meta';
export { RECITER_AYAH_FOLDERS, getDirectAyahAudioUrl };

const QF_AUTH_URL = 'https://oauth2.quran.foundation';
const QF_API_URL = 'https://apis.quran.foundation';
const QF_PUBLIC_API_URL = 'https://api.quran.com';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch(`${QF_AUTH_URL}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'content',
      }),
    });

    if (!response.ok) {
      console.warn(`QF Authentication failed (${response.status}), falling back to public content gateway.`);
      return null;
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
  } catch (err) {
    console.warn('QF Authentication network error, falling back to public content gateway:', err);
    return null;
  }
}

async function qfFetch<T>(endpoint: string, retried = false): Promise<T> {
  const token = await getAccessToken();
  const clientId = process.env.QF_CLIENT_ID || '';

  // If token is available, try enterprise OAuth2 gateway first
  if (token && clientId) {
    try {
      const response = await fetch(`${QF_API_URL}${endpoint}`, {
        headers: {
          'x-auth-token': token,
          'x-client-id': clientId,
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 },
      });

      if (response.status === 401 && !retried) {
        cachedToken = null;
        tokenExpiry = 0;
        return qfFetch<T>(endpoint, true);
      }

      if (response.ok) {
        return response.json() as Promise<T>;
      }
      console.warn(`QF enterprise API returned ${response.status}, falling back to verified public gateway.`);
    } catch (err) {
      console.warn('QF enterprise request error, falling back to verified public gateway:', err);
    }
  }

  // Seamless fallback to Quran Foundation official verified public Content API (api.quran.com)
  const publicResponse = await fetch(`${QF_PUBLIC_API_URL}${endpoint}`, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 },
  });

  if (!publicResponse.ok) {
    throw new Error(`QF API error (${publicResponse.status}): ${publicResponse.statusText}`);
  }

  return publicResponse.json() as Promise<T>;
}

export async function getChapters() {
  type Resp = { chapters: Record<string, unknown>[] };
  const data = await qfFetch<Resp>('/api/v4/chapters?language=ar');
  return data.chapters;
}

export async function getChapter(id: number) {
  type Resp = { chapter: Record<string, unknown> };
  const data = await qfFetch<Resp>(`/api/v4/chapters/${id}?language=ar`);
  return data.chapter;
}

export async function getVersesByPage(page: number) {
  if (page < 1 || page > 604) throw new Error('Invalid page number (1-604)');
  type Resp = { verses: Record<string, unknown>[] };
  const data = await qfFetch<Resp>(
    `/api/v4/verses/by_page/${page}?language=ar&words=false&per_page=50&fields=text_uthmani,chapter_id,verse_number,verse_key,hizb_number,rub_el_hizb_number,sajdah_number,sajdah_type,page_number,juz_number`
  );
  return data.verses;
}

export async function getVersesByChapter(chapter: number, page = 1) {
  type Resp = { verses: Record<string, unknown>[]; pagination: Record<string, unknown> };
  const data = await qfFetch<Resp>(
    `/api/v4/verses/by_chapter/${chapter}?language=ar&words=false&per_page=50&page=${page}&fields=text_uthmani,chapter_id,verse_number,verse_key,hizb_number,rub_el_hizb_number,sajdah_number,sajdah_type,page_number,juz_number`
  );
  return data;
}

export async function getVerseByKey(verseKey: string) {
  type Resp = { verse: Record<string, unknown> };
  const data = await qfFetch<Resp>(
    `/api/v4/verses/by_key/${verseKey}?language=ar&words=false&fields=text_uthmani,chapter_id,verse_number,verse_key,hizb_number,rub_el_hizb_number,sajdah_number,sajdah_type,page_number,juz_number`
  );
  return data.verse;
}

export async function getReciters() {
  type Resp = { reciters?: Record<string, unknown>[]; recitations?: Record<string, unknown>[] };
  const data = await qfFetch<Resp>('/api/v4/resources/recitations?language=ar');
  return data.reciters || data.recitations || [];
}

export async function getChapterRecitation(reciterId: number, chapterNumber: number) {
  const audioUrl = getDirectReciterAudioUrl(reciterId, chapterNumber);
  return {
    id: chapterNumber,
    chapter_id: chapterNumber,
    audio_url: audioUrl,
    url: audioUrl,
  };
}

export async function getAyahRecitation(reciterId: number, verseKey: string) {
  const audioUrl = getDirectAyahAudioUrl(reciterId, verseKey);
  return {
    verse_key: verseKey,
    audio_url: audioUrl,
    url: audioUrl,
  };
}

export async function getTafsirs() {
  type Resp = { tafsirs: Record<string, unknown>[] };
  const data = await qfFetch<Resp>('/api/v4/resources/tafsirs?language=ar');
  return data.tafsirs;
}

export async function getTafsir(tafsirId: number, verseKey: string) {
  type Resp = { tafsir: Record<string, unknown> };
  const data = await qfFetch<Resp>(`/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}?language=ar`);
  return data.tafsir;
}

export async function searchQuran(query: string, page = 1) {
  type Resp = { search: { results: Record<string, unknown>[]; total_results: number } };
  const data = await qfFetch<Resp>(`/api/v4/search?q=${encodeURIComponent(query)}&page=${page}`);
  return data.search;
}
