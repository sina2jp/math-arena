// Math Arena service worker: makes the game open offline and installable.
// It only touches its own files (index.html, bank.js, the manifest, the icons), Google Fonts and ./kit/ (the art and music pack).
// Every other request, especially ./classic/ and ./calm/, goes straight to the network as if this file did not exist.
const VERSION = '796903a5a762';
const PREFIX = 'math-arena-';
const CACHE = PREFIX + 'app-' + VERSION;
const RUNTIME = PREFIX + 'runtime-v1';
const PRECACHE = ['index.html', 'bank-f83e64706c-1.js', 'bank-f83e64706c-2.js', 'bank-f83e64706c-3.js', 'bank-f83e64706c-4.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'kit/fonts.css', 'kit/kit.js', 'kit/pack.js', 'kit/places/deku_tree_inside.js', 'kit/places/dodongo_cavern.js', 'kit/places/fire_temple.js', 'kit/places/forest_temple.js', 'kit/places/ganon_castle.js', 'kit/places/goron_city.js', 'kit/places/jabu_jabu.js', 'kit/places/kakariko.js', 'kit/places/kokiri.js', 'kit/places/lake_hylia.js', 'kit/places/lon_lon_ranch.js', 'kit/places/lost_woods.js', 'kit/places/map.js', 'kit/places/shadow_temple.js', 'kit/places/spirit_temple.js', 'kit/places/temple_of_time.js', 'kit/places/water_temple.js', 'kit/places/zoras_domain.js'];
const SCOPE = new URL('./', self.location.href).href;
const abs = (p) => new URL(p, SCOPE).href;
const INDEX = abs('index.html');
const OWN = new Set(PRECACHE.map(abs));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(abs(p), { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

// index.html: the network first (so a new version shows up), the saved copy after 3 seconds or when offline
async function page(request) {
  const cache = await caches.open(CACHE);
  const net = fetch(INDEX, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(INDEX, res.clone()).catch(() => {});
    return res;
  });
  try {
    const res = await Promise.race([net, timeout(3000)]);
    if (res && res.ok) return res;
    throw new Error('bad response');
  } catch {
    const hit = await cache.match(INDEX);
    if (hit) return hit;
    return net;
  }
}

async function cacheFirst(request, cacheName, key) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key || request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(key || request, res.clone()).catch(() => {});
  return res;
}

// fonts: the saved copy at once, refreshed in the background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  const net = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(new URL(SCOPE).pathname.length);
  if (rel.startsWith('classic/') || rel.startsWith('calm/') || rel === 'classic' || rel === 'calm') return; // never touched
  if (rel === '' || rel === 'index.html') {
    event.respondWith(page(req));
    return;
  }
  const clean = url.origin + url.pathname;
  if (OWN.has(clean)) {
    event.respondWith(cacheFirst(req, CACHE, clean)); // the app's own files and the kit files it uses, saved at install
    return;
  }
  if (rel.startsWith('kit/')) event.respondWith(cacheFirst(req, RUNTIME));
});
