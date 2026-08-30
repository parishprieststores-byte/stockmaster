// StockMaster service worker — enables the app to load offline once installed.
// Bump this version string whenever index.html changes, so returning users
// get the update instead of a stale cached copy.
const CACHE_NAME = 'stockmaster-v1';

const APP_SHELL = [
  './stockmaster.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll fails all-or-nothing, so missing optional icons won't break install.
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function () { /* ignore missing optional file */ });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Cache-first for the app shell, falling back to network, so the app opens
// instantly offline. Anything not in the cache is fetched normally.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        // Opportunistically cache newly-seen same-origin GET requests.
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function () {
        // Offline and not cached — fall back to the shell page for navigations.
        if (event.request.mode === 'navigate') return caches.match('./stockmaster.html');
      });
    })
  );
});
