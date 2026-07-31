import { map } from '../../adapters/map/mapRegistry.js';
import { setCookie } from '../../adapters/persistence/cookieControl.js';

let mapResizeBurstTimerIds = [];
let mapContainerResizeObserver = null;

function requestMapResize() {
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

export function scheduleMapResizeBurst() {
    mapResizeBurstTimerIds.forEach((timerId) => clearTimeout(timerId));
    mapResizeBurstTimerIds = [];

    [0, 120, 360].forEach((delay) => {
        const timerId = setTimeout(() => requestMapResize(), delay);
        mapResizeBurstTimerIds.push(timerId);
    });
}

export function watchMapContainerResize() {
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
export function bindMapResizeGuards() {
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
 * マップの移動が終了したときに、中心座標とズームレベルをCookieに保存する
 */
export function bindMapMoveEndPersistence() {
    map.on("moveend", () => {
        const center = map.getCenter();
        const zoom = map.getZoom();

        setCookie("mapCenter", JSON.stringify([center.lng, center.lat]), 30);
        setCookie("mapZoom", zoom, 30);
    });
}
