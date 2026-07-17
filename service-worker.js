const CACHE_NAME = 'searoute-v1.3';
const urlsToCache = [
  './',
  './img/favicon.ico',
  './img/apple-touch-icon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './style/empty.json'
];

function clearAllCaches() {
  return caches.keys().then((cacheNames) => {
    return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'PURGE_ALL_CACHES') {
    event.waitUntil(clearAllCaches());
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});