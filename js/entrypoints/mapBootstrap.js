import * as maplibregl from '../../lib/maplibre-gl-js/6.1.0/maplibre-gl.mjs';
import MaplibreGeocoder from '../../lib/maplibre-gl-geocoder/1.9.4/maplibre-gl-geocoder.mjs';

// 既存コードのグローバル依存を保ったまま、ローカル配置のESMを供給する。
window.maplibregl = maplibregl;
window.MaplibreGeocoder = MaplibreGeocoder;

await import('./mapPage.js');
