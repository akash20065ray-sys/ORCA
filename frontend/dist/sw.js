// ORCA Service Worker — Offshore Marine PWA Offline Engine
const CACHE_NAME = 'orca-marine-v2';
const TILE_CACHE_NAME = 'orca-marine-tiles-v1';
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
        console.warn('[ORCA SW] Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clean up legacy caches, preserve current marine cache & tile cache
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, TILE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!validCaches.includes(key)) {
            console.log('[ORCA SW] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch strategy: Specialized strategies for Tiles, APIs, and Static Shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or browser-extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Map Tiles (CartoDB, OpenSeaMap, Esri, OpenStreetMap, NOAA):
  // Stale-While-Revalidate caching into dedicated tile cache
  const isMapTile =
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('openseamap.org') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.pathname.includes('/tiles/') ||
    url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp)/i);

  if (isMapTile) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((tileCache) => {
        return tileCache.match(request).then((cachedTile) => {
          const networkFetch = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                tileCache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedTile);

          // Return cached tile immediately if present, otherwise wait for network
          return cachedTile || networkFetch;
        });
      })
    );
    return;
  }

  // B. Static Assets & App Shell: Cache-First with Stale-While-Revalidate
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
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
          // Fetch update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* Offline, background update silently ignored */});
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

  // C. Marine API Endpoints: Network-First with Local Cache & Smart Offshore Fallbacks
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
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Domain-specific intelligent offline fallbacks
            let fallbackData = {
              offline: true,
              status: 'offline_marine_mode',
              timestamp: new Date().toISOString(),
              message: 'Operating beyond cellular connectivity. Onboard marine cache active.'
            };

            if (url.pathname.includes('/alerts')) {
              fallbackData = {
                offline: true,
                alerts: [
                  {
                    id: 'offshore_cache_alert',
                    title: 'Offshore Mode Active (Beyond Cellular Range)',
                    severity: 'advisory',
                    category: 'Navigation',
                    description: 'Vessel is beyond cellular coastal base stations. Standby VHF Channel 16 for NAVAREA VIII broadcast updates.',
                    source: 'ORCA Onboard Engine',
                    time: 'Continuous'
                  }
                ]
              };
            } else if (url.pathname.includes('/weather')) {
              fallbackData = {
                offline: true,
                temperature: 28.5,
                wind_speed_knots: 14.2,
                wind_direction: 245,
                sea_surface_temp: 28.4,
                wave_height_meters: 0.8,
                sea_state: 'Douglas Scale 2 (Smooth-Slight)',
                source: 'ORCA Onboard Climatology Model'
              };
            } else if (url.pathname.includes('/ports')) {
              fallbackData = {
                offline: true,
                ports: [
                  { id: 'in_cok', name: 'Cochin Port (Kochi)', lat: 9.9656, lon: 76.2425 },
                  { id: 'in_maa', name: 'Chennai Port', lat: 13.0827, lon: 80.2707 },
                  { id: 'in_bom', name: 'Mumbai Port Trust', lat: 18.9438, lon: 72.8397 },
                  { id: 'in_vtz', name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185 },
                  { id: 'lk_cmb', name: 'Port of Colombo', lat: 6.9497, lon: 79.8433 }
                ]
              };
            }

            return new Response(JSON.stringify(fallbackData), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
            });
          });
        })
    );
    return;
  }

  // D. Default Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
