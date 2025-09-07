// Simple PWA Service Worker for offline-friendly static site
const VERSION = 'v1.0.4';
const CORE = [
  './',
  './index.html',
  './profile.html',
  './info.html',
  './assets/style.css',
  './assets/main.js',
  './assets/base.js',
  './assets/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Bypass caching for API, admin, and media (and Range requests for media streaming)
  const isAPI = url.pathname.startsWith('/api/');
  const isAdmin = url.pathname.startsWith('/admin');
  const isMedia = /(\.mp4|\.webm|\.mov|\.m4v|\.mp3|\.wav|\.ogg)$/i.test(url.pathname);
  const hasRange = req.headers.has('range');
  if (isAPI || isAdmin || isMedia || hasRange) {
    e.respondWith(fetch(req));
    return;
  }

  // Cache-first for other same-origin GETs
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
