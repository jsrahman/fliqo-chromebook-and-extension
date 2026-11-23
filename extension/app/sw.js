// Fliqlo Web - Full Offline Progressive Web App Service Worker
const CACHE_VERSION = 'fliqlo-offline-v1.0.1';
const CACHE_NAME = `${CACHE_VERSION}`;

// Core assets to precache immediately on service worker installation
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './og-image.png',
  './fonts/FliqloBold.otf',
  './fonts/FliqloMedium.otf',
  './fonts/BarlowCondensed-400.woff2',
  './fonts/BarlowCondensed-500.woff2',
  './fonts/BarlowCondensed-600.woff2',
  './fonts/BarlowCondensed-700.woff2',
  './fonts/BarlowCondensed-800.woff2',
  './fonts/BarlowCondensed-900.woff2',
  './fonts/BarlowCondensed-Black.woff2',
  './fonts/BarlowCondensed-Bold.woff2',
  './fonts/BarlowCondensed-ExtraBold.woff2',
  './fonts/LibreBaskerville-400.woff2',
  './fonts/LibreBaskerville-700.woff2',
  './fonts/LibreBaskerville-Bold.woff2',
  './fonts/Ubuntu-400.woff2',
  './fonts/Ubuntu-500.woff2',
  './fonts/Ubuntu-700.woff2',
  './fonts/Ubuntu-Bold.woff2',
  './assets/index-B1UKSg4m.css',
  './assets/index-DRRRypNk.js',
];

// Install: precache all core application shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use Promise.allSettled so one missing non-critical asset doesn't abort the entire precache
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(asset, response);
            }
          } catch (err) {
            console.debug('Precache item skipped:', asset, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up previous cache versions and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name.startsWith('fliqlo-')) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener to allow immediate skipWaiting if triggered from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Offline-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore cross-origin third-party requests (e.g. GitHub API) except fonts or same origin
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Navigation requests (HTML document loads, e.g. '/', '/index.html', '?tab=countdown', etc.)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network fetch first with a fast timeout (1.5s) to get freshest index.html if online
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch {
          // Network failed or offline or aborted due to timeout -> fall back to cache
        }

        // Offline / failed: match exact request or fall back to cached index.html
        const cachedDoc =
          (await caches.match(request)) ||
          (await caches.match('./index.html')) ||
          (await caches.match('/index.html')) ||
          (await caches.match('./'));

        if (cachedDoc) {
          return cachedDoc;
        }

        return new Response('Offline - Fliqlo is ready to run offline.', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      })()
    );
    return;
  }

  // 2. Static assets (JS, CSS, Fonts, Images): Cache-First, then Network with Dynamic Caching
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'basic')) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return cachedResponse || Response.error();
      }
    })()
  );
});
