/**
 * MapLibre 地図インスタンスの生成と標準コントロールの組み込み
 * （旧 application/initializeMap.js の MapLibre 依存部分）
 */
import * as maplibregl from 'maplibre-gl';
import type { IControl, Map as MapLibreMap } from 'maplibre-gl';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import { PMTiles, Protocol } from 'pmtiles';
// バンドル後は import.meta.url 基準のワーカー解決が効かないため、ワーカーを別途バンドルして URL を指定する
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { GeocodingService, LngLat, MapCameraPort, MarkerPort, SettingsStore } from '../../application/ports';
import { bindGeolocateTrackingZoom, getInitialMapView, getMapRenderScale } from '../../application/useCases/mapUseCases';
import type { GeolocateControlLike, ZoomableMapLike } from '../../application/useCases/mapUseCases';
import { addResetClickEvent } from './geoJsonLayerAdapter';
import { getCurrentMapStyleUrl } from './layerManager';
import { map, setMap } from './mapRegistry';
import {
    bindMapMoveEndPersistence,
    bindMapResizeGuards,
    scheduleMapResizeBurst,
    watchMapContainerResize,
} from './mapViewportGuard';
import { initPmtilesLayers, setupPmtilesProtocol } from './pmtilesLayerAdapter';
import type { PmtilesEnvironment } from './pmtilesLayerAdapter';

export interface CreateSearouteMapOptions {
    container: string | HTMLElement;
    settings: SettingsStore;
    /** 航路・港湾以外をクリックしたとき */
    onBackgroundClick: () => void;
}

/**
 * 地図を生成し、ナビゲーション・現在地・縮尺コントロールと各種ガードを登録する
 * ハンバーガー等の UI コントロールは呼び出し側（presentation）が直後に addControl する
 */
export function createSearouteMap({ container, settings, onBackgroundClick }: CreateSearouteMapOptions): MapLibreMap {
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
    setupPmtilesProtocol({
        windowRef: { pmtiles: { Protocol, PMTiles }, maplibregl } as unknown as PmtilesEnvironment,
    });
    initPmtilesLayers();

    const [mapCenter, mapZoom] = getInitialMapView(settings);

    setMap(new maplibregl.Map({
        container,
        style: getCurrentMapStyleUrl(),
        center: mapCenter,
        zoom: mapZoom,
        pitch: 0,
        pixelRatio: getMapRenderScale(),
    }));

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    // showUserHeading は 6.1 の型定義に無いが、従来どおりの値を渡す
    const geolocateOptions = {
        trackUserLocation: true,
        positionOptions: { enableHighAccuracy: true },
        showUserHeading: true,
        fitBoundsOptions: { maxZoom: 15 },
    };
    const geolocateControl = new maplibregl.GeolocateControl(geolocateOptions);
    map.addControl(geolocateControl, 'bottom-right');
    bindGeolocateTrackingZoom({
        mapRef: map as unknown as ZoomableMapLike,
        geolocateControl: geolocateControl as unknown as GeolocateControlLike,
    });
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    bindMapMoveEndPersistence(settings);
    addResetClickEvent(onBackgroundClick);
    bindMapResizeGuards();

    map.on('load', () => {
        watchMapContainerResize();
        scheduleMapResizeBurst();
    });

    return map;
}

/**
 * 検索バー（MapLibreGeocoder）を生成する
 */
export function createGeocoderControl(geocoding: Pick<GeocodingService, 'forwardGeocode'>): IControl {
    const geocoderApi = {
        forwardGeocode: async (config: { query?: string | number[] }) => geocoding.forwardGeocode(config.query as string),
    };

    const geocoder = new MaplibreGeocoder(geocoderApi as never, {
        maplibregl: maplibregl as never,
        marker: {
            color: 'red'
        } as never,
        placeholder: 'Search',
        collapsed: true,
        limit: 10,
        showResultsWhileTyping: true,
        OptionalminLength: 3,
        zoom: 12
    } as never);

    // geocoderにクラスを追加
    geocoder.onAdd = function(this: MaplibreGeocoder, mapRef: MapLibreMap) {
        const container = MaplibreGeocoder.prototype.onAdd.call(this, mapRef);
        container.classList.add('maplibregl-ctrl-group');
        return container;
    };

    return geocoder as unknown as IControl;
}

/**
 * 初期表示後に遅延登録してジオコーダーの起動コストをずらす
 */
export function addGeocoderControlWhenIdle(geocoding: Pick<GeocodingService, 'forwardGeocode'>): void {
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => map.addControl(createGeocoderControl(geocoding), 'top-left'));
    } else {
        setTimeout(() => map.addControl(createGeocoderControl(geocoding), 'top-left'), 100);
    }
}

/** 長押し・右クリック地点のピン（赤いマーカー） */
export function createMarkerAdapter(): MarkerPort {
    let longPressMarker: maplibregl.Marker | null = null;
    return {
        showPin(lngLat: LngLat) {
            longPressMarker?.remove();
            longPressMarker = new maplibregl.Marker({ color: 'red' })
                .setLngLat(lngLat)
                .addTo(map);
        },
        clearPin() {
            longPressMarker?.remove();
            longPressMarker = null;
        },
    };
}

export const mapCamera: MapCameraPort = {
    flyTo: (options) => { map.flyTo(options); },
};

/** 画面座標を地図座標へ変換する（長押し位置の取得用） */
export function unprojectPoint(x: number, y: number): { lat: number; lng: number } {
    return map.unproject([x, y]);
}
