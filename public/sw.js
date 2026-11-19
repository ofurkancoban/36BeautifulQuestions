// Service worker: makes the app installable and lets it open offline.
// Pages are network-first (so new deploys arrive immediately); hashed assets are cache-first.
const CACHE = 'b36q-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page loaded its assets before this worker took control, so it sends their URLs to be cached.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cache-urls' || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === 'string' && new URL(u).origin === self.location.origin);
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.match(u, { ignoreVary: true }).then((hit) => hit || c.add(u).catch(() => undefined))))),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch the PeerJS broker or other hosts

  if (req.mode === 'navigate') {
    // Bypass the HTTP cache (GitHub Pages sends max-age=600) so a new deploy shows up on the next open.
    event.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    );
    return;
  }

  event.respondWith(
    // ignoreVary: module scripts carry an Origin header that the cached copies were stored without.
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
