const CACHE_NAME = 'searoute-v1.2';
const urlsToCache = [
  './',
  './index.html',
  './css/common.css',
  './img/favicon.ico',
  './img/apple-touch-icon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './js/common.js',
  './js/geoJsonLayers.js',
  './js/hamburgerControl.js',
  './js/dataLoader.js',
  './js/detailDrawer.js',
  './js/rasterLayers.js',
  './js/layersControl.js',
  './js/cookieControl.js',
  './js/contextMenu.js',
  './style/empty.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});