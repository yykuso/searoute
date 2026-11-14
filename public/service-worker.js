const CACHE_NAME = 'searoute-v2.0';
const urlsToCache = [
  './img/favicon.ico',
  './img/apple-touch-icon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './style/empty.json'
];

// Vite のハッシュ付きアセット（/assets/<name>-<hash8>.<ext>）。同名の古いハッシュを掃除するために使う
const HASHED_ASSET_PATTERN = /\/assets\/(.+)-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/;

function getAssetGroup(url) {
  const match = new URL(url).pathname.match(HASHED_ASSET_PATTERN);
  return match ? match[1] + match[2] : null;
}

/**
 * 同じアセット名の古いハッシュ版を削除する（キャッシュは挿入順のため、各名前で最後に保存したものを残す）
 * keepUrl を指定した場合は、その URL と同名の他バージョンだけを削除する
 */
function pruneStaleAssets(keepUrl) {
  const keepGroup = keepUrl ? getAssetGroup(keepUrl) : null;
  return caches.open(CACHE_NAME).then((cache) => cache.keys().then((requests) => {
    const latestByGroup = new Map();
    requests.forEach((request) => {
      const group = getAssetGroup(request.url);
      if (group) latestByGroup.set(group, request.url);
    });
    if (keepGroup) latestByGroup.set(keepGroup, keepUrl);
    return Promise.all(requests
      .filter((request) => {
        const group = getAssetGroup(request.url);
        if (!group || (keepGroup && group !== keepGroup)) return false;
        return latestByGroup.get(group) !== request.url;
      })
      .map((request) => cache.delete(request)));
  }));
}

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
      .then(() => pruneStaleAssets())
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
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone))
            .then(() => (getAssetGroup(event.request.url) ? pruneStaleAssets(event.request.url) : undefined));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});