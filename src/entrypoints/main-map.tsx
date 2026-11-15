/**
 * 地図ページ（index.html）のエントリーポイント
 * CSS・Service Worker・アクセス解析だけを先に処理し、React アプリ（mapApp.tsx）は
 * プリレンダリング済み HTML の初回描画後に読み込んでハイドレーションする（MapLibre はさらに地図生成時に読み込む）
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import '../styles/tailwind.css';
import { scheduleGoogleAnalyticsLoad, createCookieConsent } from '../adapters/analytics/googleAnalyticsLoader';
import { afterFirstPaint } from './afterFirstPaint';
import { registerServiceWorker } from './serviceWorkerRegistration';

registerServiceWorker();

// 同意済みならアクセス解析を遅延読み込みする（未同意時は Cookie バナーを閉じた時点で読み込む）
if (createCookieConsent().hasConsent()) {
    scheduleGoogleAnalyticsLoad();
}

afterFirstPaint(() => {
    void import('./mapApp').then(({ startMapApp }) => startMapApp(document.getElementById('app') as HTMLElement));
});
