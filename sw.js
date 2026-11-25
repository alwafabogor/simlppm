/* SIM-LPPM Service Worker — aset statis: stale-while-revalidate; API GAS: selalu jaringan (tidak pernah dicache). */
const VERSI = 'simlppm-3.0.0';
const ASET = ['./', './index.html', './manifest.json', './css/style.css?v=3.0.0', './js/config.js?v=3.0.0', './js/core.js?v=3.0.0', './js/ui.js?v=3.0.0', './js/pages-main.js?v=3.0.0', './js/pages-data.js?v=3.0.0', './js/pages-akr.js?v=3.0.0', './js/pages-sys.js?v=3.0.0', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSI).then(c => c.addAll(ASET)).catch(() => { })); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;                                   // POST API → biarkan ke jaringan
  if (/script\.google(usercontent)?\.com|accounts\.google\.com|googleapis\.com\/(?!css)/.test(u.host + u.pathname)) return; // API & login: jaringan saja
  if (u.pathname.endsWith('/js/config.js') || u.search.indexOf('nocache') >= 0) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return; }
  e.respondWith(caches.open(VERSI).then(async c => {
    const lama = await c.match(e.request);
    const baru = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => lama);
    return lama || baru;
  }));
});
