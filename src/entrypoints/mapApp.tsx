/**
 * 地図ページの React アプリ（main-map.tsx から初回描画後に動的 import する）
 * 依存を組み立てて React のルートへ注入する
 */
import { MapPage } from '../presentation/map/MapPage';
import { MapServicesProvider } from '../presentation/map/mapPageServices';
import { createMapServices } from './mapServices';
import { mountApp } from './mountApp';

export function startMapApp(container: HTMLElement): void {
    const services = createMapServices({ buildNumber: import.meta.env.VITE_BUILD_NUMBER || 'local' });
    mountApp(
        container,
        <MapServicesProvider services={services}>
            <MapPage />
        </MapServicesProvider>,
    );
}
