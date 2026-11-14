/**
 * 地図の描画サイズ再同期と表示位置の永続化
 */
import type { SettingsStore } from '../../application/ports';
import { persistMapView } from '../../application/useCases/mapUseCases';
import { setCookie } from '../persistence/cookieControl';
import { map } from './mapRegistry';

let mapResizeBurstTimerIds: Array<ReturnType<typeof setTimeout>> = [];
let mapContainerResizeObserver: ResizeObserver | null = null;

const cookieSettings: Pick<SettingsStore, 'set'> = {
    set: (name, value, days) => setCookie(name, value, days),
};

function requestMapResize(): void {
    if (!map) {
        return;
    }

    requestAnimationFrame(() => {
        if (!map) {
            return;
        }

        try {
            // canvas の inline size が壊れた状態を含め、描画サイズを再同期する
            map.resize();
        } catch (error) {
            console.warn('Map resize failed:', error);
        }
    });
}

export function scheduleMapResizeBurst(): void {
    mapResizeBurstTimerIds.forEach((timerId) => clearTimeout(timerId));
    mapResizeBurstTimerIds = [];

    [0, 120, 360].forEach((delay) => {
        const timerId = setTimeout(() => requestMapResize(), delay);
        mapResizeBurstTimerIds.push(timerId);
    });
}

export function watchMapContainerResize(): void {
    if (mapContainerResizeObserver) {
        return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer || typeof ResizeObserver === 'undefined') {
        return;
    }

    mapContainerResizeObserver = new ResizeObserver(() => {
        requestMapResize();
    });
    mapContainerResizeObserver.observe(mapContainer);
}

/**
 * ウィンドウ/ビューポートの変化に応じて地図の描画サイズを再同期するリスナーを登録する
 */
export function bindMapResizeGuards(): void {
    window.addEventListener('load', scheduleMapResizeBurst);
    window.addEventListener('pageshow', scheduleMapResizeBurst);
    window.addEventListener('orientationchange', scheduleMapResizeBurst);
    window.addEventListener('resize', requestMapResize, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleMapResizeBurst();
        }
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', requestMapResize, { passive: true });
    }
}

/**
 * マップの移動が終了したときに、中心座標とズームレベルを保存する
 */
export function bindMapMoveEndPersistence(settings: Pick<SettingsStore, 'set'> = cookieSettings): void {
    map.on("moveend", () => {
        persistMapView(settings, map.getCenter(), map.getZoom());
    });
}
