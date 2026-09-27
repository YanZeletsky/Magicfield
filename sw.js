const CACHE_NAME = 'soundfield-v183';
const FONTS = ['./fonts/manrope-cyrillic-400-normal.woff2','./fonts/manrope-cyrillic-500-normal.woff2','./fonts/manrope-cyrillic-600-normal.woff2','./fonts/manrope-cyrillic-700-normal.woff2','./fonts/manrope-latin-400-normal.woff2','./fonts/manrope-latin-500-normal.woff2','./fonts/manrope-latin-600-normal.woff2','./fonts/manrope-latin-700-normal.woff2','./fonts/space-grotesk-latin-500-normal.woff2','./fonts/space-grotesk-latin-600-normal.woff2','./fonts/space-grotesk-latin-700-normal.woff2'];
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './palettes.js',
  './audio.js',
  './tools.js',
  './scene3d.js',
  
  './scripts.js',
  
  './i18n.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.ico'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).then(function(){ return Promise.all(FONTS.map(function(f){ return c.add(f).catch(function(){}); })); }))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  // Медиа/Range/не-GET — мимо SW (аудио шлёт Range-запросы, SW их ломает → 503)
  if (e.request.method !== 'GET' || e.request.headers.has('range') || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(e.request.url)) return;
  e.respondWith(
    fetch(e.request)
      .then(r => r)
      .catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
