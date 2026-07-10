const CACHE_NAME = 'soundfield-v72';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './palettes.js',
  './audio.js',
  './tools.js',
  './scene3d.js',
  './visual.js',
  './scripts.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(r => r)
      .catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
