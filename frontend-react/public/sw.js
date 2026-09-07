// ORCA Service Worker — Offshore Marine PWA Offline Engine
const CACHE_NAME = 'orca-marine-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg'
];

// 1. Install: Precache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ORCA SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ORCA SW] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch strategy: Network-First with Stale-While-Revalidate for APIs, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Static Assets & App Shell: Cache-First with Background Update
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background (Stale-While-Revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Offline, background update ignored */});
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
    );
    return;
  }

  // B. API Requests: Network-First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // Check if previously cached API response is available
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return structured offline fallback
            return new Response(
              JSON.stringify({
                offline: true,
                status: 'offline_cached_marine_mode',
                timestamp: new Date().toISOString(),
                message: 'Operating in Offline Marine Mode beyond cellular range. Showing onboard cached intelligence.'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 200
              }
            );
          });
        })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
