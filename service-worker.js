// Exists mainly to satisfy the browser's PWA installability check (a
// registered service worker with a fetch handler is required before
// `beforeinstallprompt` will ever fire) rather than to make this app work
// offline. Network is always tried first and the cache is only a fallback
// for when it isn't, so this never fights the ?v= cache-busting scheme
// already used for GitHub Pages deploys elsewhere in this app — no
// separate cache-version bump is needed here on every release.
const CACHE_NAME = 'fsai-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Cross-origin requests (e.g. the Warranty Lookup calls to
  // lookup.xcet.uk) are left alone entirely — this cache exists to make
  // this app's own assets available offline, not to intercept or cache
  // responses from another site's API.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
