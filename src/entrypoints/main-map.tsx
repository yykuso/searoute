/**
 * 地図ページ（index.html）のエントリーポイント
 * 依存を組み立てて React のルートへ注入する
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import '../styles/tailwind.css';
import { scheduleGoogleAnalyticsLoad, createCookieConsent } from '../adapters/analytics/googleAnalyticsLoader';
import { MapPage } from '../presentation/map/MapPage';
import { MapServicesProvider } from '../presentation/map/mapPageServices';
import { createMapServices } from './mapServices';
import { mountApp } from './mountApp';
import { registerServiceWorker } from './serviceWorkerRegistration';

registerServiceWorker();

// 同意済みならアクセス解析を遅延読み込みする（未同意時は Cookie バナーを閉じた時点で読み込む）
if (createCookieConsent().hasConsent()) {
    scheduleGoogleAnalyticsLoad();
}

const services = createMapServices({ buildNumber: import.meta.env.VITE_BUILD_NUMBER || 'local' });

mountApp(
    document.getElementById('app') as HTMLElement,
    <MapServicesProvider services={services}>
        <MapPage />
    </MapServicesProvider>,
);
