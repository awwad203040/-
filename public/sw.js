// Noor Al-Quran Service Worker (PWA Offline Support)
const CACHE_NAME = 'noor-alquran-v17';
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
      return cache.addAll(STATIC_ASSETS).catch(() => {});
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

  // 0. Local Athkar audio clips: Cache-First for 100% offline audio playback
  if (url.pathname.startsWith('/audio/athkar/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Heavy external recitation audio streams bypass SW
  if (url.hostname.includes('verses.quran.com') || url.hostname.includes('audio.qurancdn.com')) {
    return;
  }

  // 1. Navigation (HTML Pages): ALWAYS Network-First!
  // Ensures user immediately gets the latest Next.js build and never gets stuck with stale chunk hashes.
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
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (url.pathname.startsWith('/mushaf')) {
              return caches.match('/mushaf').then((mushafHtml) => mushafHtml || caches.match('/'));
            }
            return caches.match('/').then((homeHtml) => homeHtml || caches.match('/mushaf'));
          });
        })
    );
    return;
  }

  // 2. Next.js Static Chunks (_next/static/): Cache-First with network fallback
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
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
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3b. API Quran Page Images: Cache-First from PAGES_CACHE_NAME for fast offline rendering
  if (url.pathname.startsWith('/api/quran/page-image')) {
    event.respondWith(
      caches.open(PAGES_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
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
      caches.match(event.request).then((cached) => {
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
        // Match by exact URL string first to bypass any request mode/Vary differences
        return pagesCache.match(event.request.url).then((cached) => {
          if (cached) return cached;
          return caches.match(event.request.url).then((anyCached) => {
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
              return pagesCache.match(event.request.url);
            });
          });
        });
      })
    );
    return;
  }

  // 6. Default Network-First for other assets
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
        return caches.match(event.request);
      })
  );
});
