// Noor Al-Quran Service Worker (PWA Offline Support)
const CACHE_NAME = 'noor-alquran-v20';
const PAGES_CACHE_NAME = 'noor-mushaf-pages-v1';

const STATIC_ASSETS = [
  '/',
  '/mushaf',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/audio/adhan.ogg?v=mohamed-jazi-v2',
  '/audio/adhan.ogg',
  '/audio/athkar/istighfar-1.mp3?v=male-v3',
  '/audio/athkar/tasbeeh-1.mp3?v=male-v3',
  '/audio/athkar/tasbeeh-2.mp3?v=male-v3',
  '/audio/athkar/hawqala-1.mp3?v=male-v3',
  '/audio/athkar/tahmeed-1.mp3?v=male-v3',
  '/audio/athkar/salawat-1.mp3?v=male-v3',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache error in SW install:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== PAGES_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 0. Local Adhan & Athkar audio: Cache-First for 100% offline audio playback
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          if (url.pathname.includes('adhan')) {
            return caches.match('/audio/adhan.ogg?v=mohamed-jazi-v2', { ignoreSearch: true })
              .then((m) => m || caches.match('/audio/adhan.ogg', { ignoreSearch: true }));
          }
          return caches.match(event.request, { ignoreSearch: true });
        });
      })
    );
    return;
  }

  // Heavy external recitation audio streams bypass SW
  if (url.hostname.includes('verses.quran.com') || url.hostname.includes('audio.qurancdn.com')) {
    return;
  }

  // 1. Navigation (HTML Pages): Network-First with complete offline fallback
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Robust offline fallback with ignoreSearch
          const directMatch = await caches.match(event.request, { ignoreSearch: true });
          if (directMatch) return directMatch;

          if (url.pathname.startsWith('/mushaf')) {
            const mushafHtml = await caches.match('/mushaf', { ignoreSearch: true });
            if (mushafHtml) return mushafHtml;
          }

          const homeHtml = await caches.match('/', { ignoreSearch: true });
          if (homeHtml) return homeHtml;

          const anyMushaf = await caches.match('/mushaf', { ignoreSearch: true });
          if (anyMushaf) return anyMushaf;

          // Search any cached HTML page in CACHE_NAME
          try {
            const cache = await caches.open(CACHE_NAME);
            const keys = await cache.keys();
            for (const req of keys) {
              if (req.url.endsWith('/') || req.url.includes('/mushaf')) {
                const res = await cache.match(req);
                if (res) return res;
              }
            }
          } catch (_) {}

          return new Response('Offline - No connection', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        })
    );
    return;
  }

  // 2. Next.js Static Chunks (_next/static/): Cache-First with network fallback
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // 3. API Quran Pages: Network-First with runtime caching for offline reading
  if (url.pathname.startsWith('/api/quran/pages/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request, { ignoreSearch: true });
        })
    );
    return;
  }

  // 3b. API Quran Page Images: Cache-First from PAGES_CACHE_NAME for fast offline rendering
  if (url.pathname.startsWith('/api/quran/page-image')) {
    event.respondWith(
      caches.open(PAGES_CACHE_NAME).then((cache) => {
        return cache.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // 4. External Fonts: Cache-First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // 5. Quran Page Images (files.quran.app): Cache-First from PAGES_CACHE_NAME for instant offline reading
  if (url.hostname.includes('files.quran.app') || url.pathname.includes('/hafs/madani/')) {
    event.respondWith(
      caches.open(PAGES_CACHE_NAME).then((pagesCache) => {
        return pagesCache.match(event.request.url, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          return caches.match(event.request.url, { ignoreSearch: true }).then((anyCached) => {
            if (anyCached) return anyCached;
            return fetch(event.request).then((response) => {
              if (response && (response.ok || response.type === 'opaque')) {
                try {
                  const clone = response.clone();
                  pagesCache.put(event.request.url, clone).catch(() => {});
                } catch (_) {}
              }
              return response;
            }).catch(() => {
              return pagesCache.match(event.request.url, { ignoreSearch: true });
            });
          });
        });
      })
    );
    return;
  }

  // 6. Default Network-First with offline cache fallback for all other assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.ok && event.request.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});
