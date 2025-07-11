const CACHE_NAME = 'searoute-v1.2';
const urlsToCache = [
  './',
  './index.html',
  './css/common.css',
  './js/common.js',
  './js/geoJsonLayers.js',
  './js/dataLoader.js',
  './img/favicon.ico',
  './img/apple-touch-icon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './data/seaRoute.geojson',
  './data/seaRouteDetails.json',
  './data/internationalSeaRoute.geojson',
  './data/internationalSeaRouteDetails.json',
  './data/limitedSeaRoute.geojson',
  './data/limitedSeaRouteDetails.json',
  './data/portData.geojson',
  './style/osm-bright-style.json',
  './style/empty.json',
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