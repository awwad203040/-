// Noor Al-Quran Service Worker (PWA Offline Support & Instant Updates v26)
const CACHE_NAME = 'noor-alquran-v26';
const PAGES_CACHE_NAME = 'noor-mushaf-pages-v1';

const CORE_ASSETS = [
  '/',
  '/mushaf',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/audio/adhan.ogg',
  '/audio/adhan.ogg?v=mohamed-jazi-v2',
  '/audio/athkar/tasbeeh-azeem.mp3',
  '/audio/athkar/tawheed-1.mp3',
  '/audio/athkar/hawqala-1.mp3',
  '/audio/athkar/salawat-nabi.mp3',
  '/audio/athkar/tasbeeh-quddoos.mp3',
  '/audio/athkar/baqiyat-1.mp3',
  '/audio/athkar/istighfar-custom.mp3',
  '/audio/athkar/istighfar-1.mp3',
  '/audio/athkar/tasbeeh-1.mp3',
  '/audio/athkar/tasbeeh-2.mp3',
  '/audio/athkar/tahmeed-1.mp3',
  '/audio/athkar/salawat-1.mp3',
];

// Pre-cache core assets individually so a failure in one never blocks the others
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && (res.ok || res.type === 'opaque')) {
              await cache.put(url, res.clone());
              const cleanUrl = url.split('?')[0];
              if (cleanUrl !== url) {
                await cache.put(cleanUrl, res.clone());
              }
            }
          } catch (e) {
            console.warn('Pre-cache skip:', url, e);
          }
        })
      );
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

  // 1. Local Adhan & Athkar Audio: Cache-First with 206 Partial Content Range support for mobile players
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cleanPath = url.pathname;
        const rangeHeader = event.request.headers.get('range');

        // Look up cached audio: try exact URL, clean pathname, and ignoreSearch
        let cached = await cache.match(event.request, { ignoreSearch: true });
        if (!cached) cached = await cache.match(cleanPath, { ignoreSearch: true });
        if (!cached) cached = await cache.match(cleanPath);

        // If found in cache
        if (cached) {
          if (!rangeHeader) {
            return cached;
          }

          // Handle Range requests from mobile media engines (e.g. Chrome on Android sends bytes=0-)
          try {
            const arrayBuffer = await cached.arrayBuffer();
            const total = arrayBuffer.byteLength;
            const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);

            if (matches) {
              const start = parseInt(matches[1], 10);
              const end = matches[2] ? parseInt(matches[2], 10) : total - 1;
              const chunk = arrayBuffer.slice(start, end + 1);

              const contentType =
                cached.headers.get('Content-Type') ||
                (cleanPath.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg');

              return new Response(chunk, {
                status: 206,
                statusText: 'Partial Content',
                headers: {
                  'Content-Range': `bytes ${start}-${end}/${total}`,
                  'Content-Length': String(chunk.byteLength),
                  'Content-Type': contentType,
                  'Accept-Ranges': 'bytes',
                },
              });
            }
          } catch (_) {
            return cached;
          }
          return cached;
        }

        // If not in cache, fetch from network and store full audio in cache
        try {
          const networkRes = await fetch(cleanPath);
          if (networkRes && networkRes.ok) {
            cache.put(cleanPath, networkRes.clone()).catch(() => {});
            cache.put(event.request.url, networkRes.clone()).catch(() => {});
          }
          return networkRes;
        } catch (_) {
          // If offline and requested adhan, return any cached adhan
          if (cleanPath.includes('adhan')) {
            const adhanFallback =
              (await cache.match('/audio/adhan.ogg?v=mohamed-jazi-v2', { ignoreSearch: true })) ||
              (await cache.match('/audio/adhan.ogg', { ignoreSearch: true }));
            if (adhanFallback) return adhanFallback;
          }
          return new Response('Audio unavailable offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Heavy external recitation audio streams bypass SW
  if (url.hostname.includes('verses.quran.com') || url.hostname.includes('audio.qurancdn.com')) {
    return;
  }

  // 2. Navigation (HTML Pages): Network-First with 100% offline fallback
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

          return new Response('Offline - No connection', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 3. Static Images (Logo, Icons, Favicons): Cache-First for instant offline display
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/i) && !url.pathname.startsWith('/api/quran/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached =
          (await cache.match(event.request, { ignoreSearch: true })) ||
          (await cache.match(url.pathname, { ignoreSearch: true }));
        if (cached) return cached;

        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.ok) {
            cache.put(url.pathname, networkRes.clone()).catch(() => {});
          }
          return networkRes;
        } catch (_) {
          if (url.pathname.includes('logo')) {
            const iconFallback = await cache.match('/icon-192.png', { ignoreSearch: true });
            if (iconFallback) return iconFallback;
          }
          return new Response('', { status: 404 });
        }
      })()
    );
    return;
  }

  // 4. Next.js Static Chunks (_next/static/): Cache-First
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

  // 5. Quran Page Images (files.quran.app): Cache-First from PAGES_CACHE_NAME
  if (url.hostname.includes('files.quran.app') || url.pathname.includes('/hafs/madani/')) {
    event.respondWith(
      caches.open(PAGES_CACHE_NAME).then((pagesCache) => {
        return pagesCache.match(event.request.url, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          return caches.match(event.request.url, { ignoreSearch: true }).then((anyCached) => {
            if (anyCached) return anyCached;
            return fetch(event.request)
              .then((response) => {
                if (response && (response.ok || response.type === 'opaque')) {
                  try {
                    const clone = response.clone();
                    pagesCache.put(event.request.url, clone).catch(() => {});
                  } catch (_) {}
                }
                return response;
              })
              .catch(() => {
                return pagesCache.match(event.request.url, { ignoreSearch: true });
              });
          });
        });
      })
    );
    return;
  }

  // 6. Default Network-First for other requests
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

// 7. Notification Click Handler - Focus existing PWA window or launch start_url
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 8. Message Listener for Instant Programmatic Update & Skip Waiting
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});
