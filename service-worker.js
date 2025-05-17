const CACHE_NAME = 'searoute-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/common.css',
  './css/maplibre-gl-geocoder.css',
  './js/common.js',
  './js/geoJsonLayers.js',
  './js/dataLoader.js',
  './img/favicon.ico',
  './img/android-chrome-192x192.png',
  './img/android-chrome-512x512.png',
  './img/apple-touch-icon.png'
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