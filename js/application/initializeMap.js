import hamburgerControl from '../presentation/map/hamburgerControl.js';
import { addResetClickEvent, initShareFromUrl } from '../adapters/map/geoJsonLayerAdapter.js';
import { initDetailDrawer } from '../presentation/map/detailDrawerView.js';
import { initCenterZoom } from '../adapters/persistence/cookieControl.js';
import { initContextMenu } from '../presentation/map/contextMenuView.js';
import { map, setMap } from '../adapters/map/mapRegistry.js';
import { getCurrentMapStyleUrl } from '../adapters/map/layerManager.js';
import { initPmtilesLayers, setupPmtilesProtocol } from '../adapters/map/pmtilesLayerAdapter.js';
import { addContextEvent, addGeocoderControl } from '../presentation/map/mapPointerInteractions.js';
import {
    bindMapMoveEndPersistence,
    bindMapResizeGuards,
    scheduleMapResizeBurst,
    watchMapContainerResize,
} from '../presentation/map/mapViewportGuard.js';
import { ensureSharedLayerEnabled } from '../presentation/map/sharedLayerRestorer.js';

export async function restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl }) {
    try {
        await ensureSharedLayerEnabled();
    } catch (error) {
        console.warn('Failed to enable shared layer:', error);
    }
    await initShareFromUrl();
}

export function bindGeolocateTrackingZoom({ mapRef, geolocateControl, initialMaxZoom = 15 }) {
    let isTracking = false;
    let isUserZooming = false;

    geolocateControl.on('trackuserlocationstart', () => {
        isTracking = true;
        geolocateControl.options.fitBoundsOptions.maxZoom = initialMaxZoom;
    });

    geolocateControl.on('trackuserlocationend', () => {
        isTracking = false;
        isUserZooming = false;
    });

    mapRef.on('zoomstart', (event) => {
        if (!isTracking || event?.geolocateSource) return;
        isUserZooming = Boolean(event?.originalEvent);
    });

    mapRef.on('zoom', (event) => {
        if (!isTracking || !isUserZooming || event?.geolocateSource) return;
        geolocateControl.options.fitBoundsOptions.maxZoom = mapRef.getZoom();
    });

    mapRef.on('zoomend', (event) => {
        if (!isTracking || event?.geolocateSource) return;
        geolocateControl.options.fitBoundsOptions.maxZoom = mapRef.getZoom();
        isUserZooming = false;
    });
}

export function initMap() {
    setupPmtilesProtocol();
    initPmtilesLayers();
    initContextMenu();
    initDetailDrawer();

    const [mapCenter, mapZoom] = initCenterZoom();

    setMap(new maplibregl.Map({
        container: 'map',
        style: getCurrentMapStyleUrl(),
        center: mapCenter,
        zoom: mapZoom,
        pitch: 0,
    }));

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    const geolocateControl = new maplibregl.GeolocateControl({
        trackUserLocation: true,
        positionOptions: { enableHighAccuracy: true },
        showUserHeading: true,
        fitBoundsOptions: { maxZoom: 15 },
    });
    map.addControl(geolocateControl, 'bottom-right');
    bindGeolocateTrackingZoom({ mapRef: map, geolocateControl });
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    map.addControl(new hamburgerControl(), 'top-right');

    bindMapMoveEndPersistence();
    addResetClickEvent();
    bindMapResizeGuards();

    // map.on('load') より前に登録しないと iOS Safari で初回タップが拾えない
    addContextEvent();

    map.on('load', async () => {
        watchMapContainerResize();
        scheduleMapResizeBurst();

        const detailDrawer = document.getElementById('detail-drawer');
        if (detailDrawer) detailDrawer.style.display = '';

        // 初期表示後に遅延登録してジオコーダーの起動コストをずらす
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => map.addControl(addGeocoderControl(), 'top-left'));
        } else {
            setTimeout(() => map.addControl(addGeocoderControl(), 'top-left'), 100);
        }

        await restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl });
    });
}
