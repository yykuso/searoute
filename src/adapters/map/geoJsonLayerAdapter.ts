/**
 * GeoJSONレイヤー管理モジュール
 *
 * 責務:
 * - 港湾データのGeoJSONレイヤーの追加・描画
 * - マーカー画像の読み込みと管理
 * - GeoJSONレイヤーのクリックイベント通知（ドロワー表示は application 側）
 * - 共有URLの航路へのカメラ移動・強調（RouteMapPort.focusSharedRoute）
 */
import type { FeatureCollection, Point } from 'geojson';
import type { MapGeoJSONFeature, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import type {
    PortClickEvent,
    PortRepository,
    SharedRouteTarget,
} from '../../application/ports';
import { getRouteLayerConfig, getRouteShareOverview } from '../../config/routeLayers';
import type { GeoJsonFeature, GeoJsonFeatureCollection, PortProperties, RouteProperties } from '../../domain/seaRoute';
import { loadData } from '../data/dataLoader';
import { map } from './mapRegistry';
import {
    addSeaRouteLayer,
    animateToRouteBounds,
    calculateBounds,
    calculateFitBoundsPadding,
    getSeaRouteHandleIds,
    highlightRouteFeatures,
    queryRouteFeatures,
    removeSeaRouteClickEvent,
} from './pmtilesLayerAdapter';

export { setRouteFilters, toggleSuspendedRoutes } from './pmtilesLayerAdapter';

const PORT_DATA_URL = './data/portData.geojson';

type PortCollection = GeoJsonFeatureCollection<PortProperties>;
type RouteFeature = GeoJsonFeature<RouteProperties>;

interface EventBinding {
    handleId: string;
    click: (event: MapLayerMouseEvent) => void;
    mousemove: () => void;
    mouseleave: () => void;
}

// EventHandle情報の保存（ポートレイヤー用）
const eventHandle: Record<string, EventBinding> = {};

// GeoJSONデータのキャッシュ（ポートレイヤー用）
const geoJsonDataCache: { geojson_port?: PortCollection } = {};

// 港湾クリック時の通知先（entrypoints で application のユースケースを登録する）
let portClickHandler: (event: PortClickEvent) => void = () => {};

export function setPortClickHandler(handler: ((event: PortClickEvent) => void) | null): void {
    portClickHandler = handler ?? (() => {});
}

/** 港湾データ（レイヤー追加時に読み込んだものを再利用） */
export const portRepository: PortRepository = {
    async getPorts() {
        if (!geoJsonDataCache.geojson_port) {
            geoJsonDataCache.geojson_port = await loadData<PortCollection>(PORT_DATA_URL);
        }
        return geoJsonDataCache.geojson_port;
    },
};

async function waitForMapSettled(): Promise<void> {
    await new Promise((resolve) => map.once('moveend', resolve));
    await new Promise((resolve) => map.once('idle', resolve));
}

function filterByRouteId(sourceId: string, normalizedRouteId: string | number): RouteFeature[] {
    return queryRouteFeatures(sourceId)?.features?.filter(
        (f) => f?.properties?.routeId == normalizedRouteId
    ) || [];
}

async function queryRouteFeaturesWithOverviewFallback(sourceId: string, normalizedRouteId: string | number): Promise<RouteFeature[]> {
    let matchingFeatures = filterByRouteId(sourceId, normalizedRouteId);

    if (matchingFeatures.length > 0) {
        return matchingFeatures;
    }

    const previousCenter = map.getCenter();
    const previousZoom = map.getZoom();
    const overview = getRouteShareOverview(sourceId);

    map.jumpTo({
        center: overview.center,
        zoom: overview.zoom,
    });
    await waitForMapSettled();

    matchingFeatures = filterByRouteId(sourceId, normalizedRouteId);

    if (matchingFeatures.length === 0) {
        map.jumpTo({
            center: [previousCenter.lng, previousCenter.lat],
            zoom: previousZoom,
        });
        await waitForMapSettled();
    }

    return matchingFeatures;
}

/**
 * 共有URLの航路へ移動・強調し、該当フィーチャーを返す
 * 座標付きならその位置へ、座標なしなら概観位置から探索して航路全体へ移動する
 */
export async function focusSharedRoute({ routeId, sourceId, lat, lng, zoom }: SharedRouteTarget): Promise<RouteFeature[]> {
    const hasPosition = !isNaN(lat as number) && !isNaN(lng as number);

    if (hasPosition) {
        map.flyTo({
            center: [lng as number, lat as number],
            zoom: !isNaN(zoom as number) ? zoom : Math.max(map.getZoom(), 8),
            duration: 1000,
        });

        await waitForMapSettled();
    }

    const matchingFeatures = hasPosition
        ? filterByRouteId(sourceId, routeId)
        : await queryRouteFeaturesWithOverviewFallback(sourceId, routeId);

    if (!matchingFeatures[0]) return [];

    if (!hasPosition) {
        const bounds = calculateBounds(matchingFeatures as Parameters<typeof calculateBounds>[0]);
        if (bounds) {
            animateToRouteBounds(
                map as unknown as Parameters<typeof animateToRouteBounds>[0],
                bounds,
                calculateFitBoundsPadding({ reserveDrawerSpace: true }),
            );
        }
    }

    highlightRouteFeatures(matchingFeatures);
    return matchingFeatures;
}

/**
 * GeoJsonLayerを追加する関数
 */
export async function addGeoJsonLayer(id: string): Promise<boolean> {
    if (id === 'geojson_port') {
        await addGeoJsonPortLayer();
        addPortClickEvent('geojson_port');
        return true;
    } else if (getRouteLayerConfig(id)) {
        return addSeaRouteLayer(id);
    } else {
        console.log('[Error] Layer not found : addGeoJsonLayer( ' + id + ' )');
        return false;
    }
}

/**
 * GeoJsonLayer用のMarkerを追加する関数
 */
export async function addMarker(id: string, url: string): Promise<void> {
    if (!map.hasImage(id)) {
        const anchorImage = await map.loadImage(url);
        map.addImage(id, anchorImage.data);
    }
}

function addCircleMarker(id: string, {
    size = 24,
    fillColor = '#ffffff',
    strokeColor = '#111111',
    strokeWidth = 3,
} = {}): void {
    if (map.hasImage(id)) return;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) return;

    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = fillColor;
    context.fill();
    context.lineWidth = strokeWidth;
    context.strokeStyle = strokeColor;
    context.stroke();

    const imageData = context.getImageData(0, 0, size, size);
    map.addImage(id, imageData);
}

async function addGeoJsonPortLayer(): Promise<void> {
    await addMarker('anchor_marker', './img/anchor.png');
    addCircleMarker('port_dot_marker');

    const portGeojson = await loadData<PortCollection>(PORT_DATA_URL);
    geoJsonDataCache.geojson_port = portGeojson;

    map.addSource('geojson_port', {
        type: 'geojson',
        data: portGeojson as unknown as FeatureCollection,
        attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C02-v3_2.html' target='_blank'>「国土数値情報（港湾データ）」</a>を加工して作成",
    });
    map.addLayer({
        id: 'geojson_port',
        type: 'symbol',
        source: 'geojson_port',
        layout: {
            'icon-image': [
                'step', ['zoom'],
                'port_dot_marker',
                9, 'anchor_marker',
            ],
            'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.3,
                8, 0.5,
                9, 0.3,
                12, 0.38,
                16, 0.5,
            ],
            'text-field': [
                'step', ['zoom'],
                '',
                8, ['coalesce', ['get', 'Name'], ['get', 'portName'], ''],
            ],
            'text-font': ['Noto Sans Regular'],
            'text-size': [
                'interpolate', ['linear'], ['zoom'],
                8, 10,
                14, 13,
            ],
            'text-offset': [0, 0],
            'text-radial-offset': [
                'interpolate', ['linear'], ['zoom'],
                8, 1.1,
                12, 1.3,
                16, 1.6,
            ],
            'text-anchor': 'top',
        },
        paint: {
            'text-color': '#111111',
            'text-halo-color': 'rgba(255,255,255,0.8)',
            'text-halo-width': 2,
            'text-halo-blur': 0,
        },
    });
}

/**
 * Portに関するイベントを追加
 */
function addPortClickEvent(id: string, handleId: string = id): void {
    removeClickEvent(id);

    const onClick = (event: MapLayerMouseEvent) => {
        const feature = (event.features as MapGeoJSONFeature[])[0];
        const coordinates = (feature.geometry as Point).coordinates;
        portClickHandler({
            properties: feature.properties as PortProperties,
            coordinates: [coordinates[0], coordinates[1]],
        });
    };
    const onMouseMove = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onMouseLeave = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', handleId, onClick);
    map.on('mousemove', handleId, onMouseMove);
    map.on('mouseleave', handleId, onMouseLeave);

    eventHandle[id] = { handleId, click: onClick, mousemove: onMouseMove, mouseleave: onMouseLeave };
}

/**
 * クリックしたときのイベントを削除
 */
export function removeClickEvent(id: string): void {
    const binding = eventHandle[id];
    if (binding) {
        const handleId = binding.handleId;
        if (binding.click)     map.off('click',     handleId, binding.click);
        if (binding.mousemove) map.off('mousemove',  handleId, binding.mousemove);
        if (binding.mouseleave) map.off('mouseleave', handleId, binding.mouseleave);
        delete eventHandle[id];
        return;
    }

    // ポートに該当しない場合は航路イベントとして委譲
    removeSeaRouteClickEvent(id);
}

/**
 * なにもないところをクリックしたときに通知する（ドロワーを閉じる等は呼び出し側）
 */
export function addResetClickEvent(onBackgroundClick: () => void): void {
    map.on('click', (event: MapMouseEvent) => {
        const portHandleIds  = Object.values(eventHandle).map(b => b.handleId).filter(Boolean);
        const routeHandleIds = getSeaRouteHandleIds();
        const validIds = [...portHandleIds, ...routeHandleIds];

        const features = map.queryRenderedFeatures(event.point);
        if (!features.find(feature => validIds.includes(feature.layer.id))) {
            onBackgroundClick();
        }
    });
}
