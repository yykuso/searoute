/**
 * 地図初期化まわりのユースケース（MapLibre 非依存。イベント源は構造的型で受け取る）
 */
import type { SettingsStore } from '../ports';

type Handler = (event?: { geolocateSource?: boolean; originalEvent?: unknown }) => void;

export interface EventSource {
    on(eventName: string, handler: Handler): unknown;
}

export interface GeolocateControlLike extends EventSource {
    options: { fitBoundsOptions: { maxZoom?: number } };
}

export interface ZoomableMapLike extends EventSource {
    getZoom(): number;
}

export type MapCenter = [number, number];

const DEFAULT_CENTER: MapCenter = [136.2923, 35.3622];
const DEFAULT_ZOOM = 5;

/** 高DPR端末では描画倍率を2に制限する */
export function getMapRenderScale(displayScale: number | undefined = globalThis.devicePixelRatio): number {
    return Math.min(displayScale || 1, 2);
}

/** Cookie から初期表示位置とズームを復元する */
export function getInitialMapView(settingsRepository: Pick<SettingsStore, 'get'>): [MapCenter, number] {
    const savedCenter = settingsRepository.get('mapCenter');
    const savedZoom = settingsRepository.get('mapZoom');
    const center: MapCenter = savedCenter ? JSON.parse(savedCenter) : [...DEFAULT_CENTER];
    const zoom = savedZoom ? parseFloat(savedZoom) : DEFAULT_ZOOM;
    return [center, zoom];
}

/** 地図移動終了時の中心・ズームを保存する */
export function persistMapView(settings: Pick<SettingsStore, 'set'>, center: { lng: number; lat: number }, zoom: number): void {
    settings.set('mapCenter', JSON.stringify([center.lng, center.lat]), 30);
    settings.set('mapZoom', zoom, 30);
}

export async function restoreSharedRoute({
    ensureSharedLayerEnabled,
    initShareFromUrl,
}: {
    ensureSharedLayerEnabled: () => Promise<unknown>;
    initShareFromUrl: () => Promise<unknown>;
}): Promise<void> {
    try {
        await ensureSharedLayerEnabled();
    } catch (error) {
        console.warn('Failed to enable shared layer:', error);
    }
    await initShareFromUrl();
}

export function bindGeolocateTrackingZoom({
    mapRef,
    geolocateControl,
    initialMaxZoom = 15,
}: {
    mapRef: ZoomableMapLike;
    geolocateControl: GeolocateControlLike;
    initialMaxZoom?: number;
}): void {
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
