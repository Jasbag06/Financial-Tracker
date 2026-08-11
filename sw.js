const CACHE_NAME = 'catetin-shell-v20';
const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/supabase-client.js',
  './js/state.js',
  './js/util.js',
  './js/modal.js',
  './js/auth.js',
  './js/router.js',
  './js/dashboard.js',
  './js/trips.js',
  './js/quickadd.js',
  './js/history.js',
  './js/budget.js',
  './js/categories.js',
  './js/accounts.js',
  './js/settings.js',
  './js/scan.js',
  './js/shortcuts.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first (falling back to cache only when offline) so shell updates are
// visible immediately whenever there's a connection — cache is purely an offline
// safety net, not the default source.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Supabase / CDN requests always go to network
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
