const CACHE_NAME = 'catetin-shell-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/supabase-client.js',
  './js/state.js',
  './js/util.js',
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
  './js/app.js',
  './manifest.json',
  './icons/icon.svg'
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Supabase / CDN requests always go to network
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
