/**
 * 航路詳細ページ（/route/<routeId>/）の埋め込み地図
 * プリレンダリング済みの #route-detail-map の data 属性を読み、MapLibre・PMTiles を動的に読み込んで
 * その航路の線と発着港のラベルだけを表示する（初回描画を遅らせないよう main-routeDetail から遅延読み込みする）
 */
import { ROUTE_DATA_BASE_URL } from '../../config/routeData';
import type { RoutePort } from '../../domain/routePage';

export type RouteDetailBounds = [number, number, number, number];

export interface RouteDetailMapOptions {
    routeId: string;
    sourceLayer: string;
    bbox?: RouteDetailBounds;
    ports: RoutePort[];
}

const MAP_STYLE_URL = '/style/maptiler-basic-ja-custom.json';
const ROUTE_LINE_COLOR = '#1f4e79';
/** 港が 1 つだけ（境界の幅が 0）のときのズーム */
const SINGLE_PORT_ZOOM = 10;

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function isBounds(value: unknown): value is RouteDetailBounds {
    return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber);
}

function isPort(value: unknown): value is RoutePort {
    if (typeof value !== 'object' || value === null) return false;
    const port = value as Record<string, unknown>;
    return typeof port.name === 'string' && isFiniteNumber(port.lon) && isFiniteNumber(port.lat);
}

/** #route-detail-map の data 属性を読む。壊れていれば（JSON 不正・routeId なし等）null */
export function readRouteDetailMapOptions(element: HTMLElement): RouteDetailMapOptions | null {
    const { routeId, sourceLayer, bbox: bboxText, ports: portsText } = element.dataset;
    if (!routeId || !sourceLayer) return null;

    const ports = parseJson(portsText ?? '[]');
    if (!Array.isArray(ports) || !ports.every(isPort)) return null;

    const options: RouteDetailMapOptions = {
        routeId,
        sourceLayer,
        ports: ports.map(({ name, lon, lat }) => ({ name, lon, lat })),
    };
    if (bboxText !== undefined) {
        const bbox = parseJson(bboxText);
        if (!isBounds(bbox)) return null;
        options.bbox = bbox;
    }
    return options;
}

/** 地図の表示範囲。bbox がなければ港から作る。どちらもなければ null（地図を出さない） */
export function routeDetailMapBounds({ bbox, ports }: Pick<RouteDetailMapOptions, 'bbox' | 'ports'>): RouteDetailBounds | null {
    if (bbox) return bbox;
    if (ports.length === 0) return null;
    const lons = ports.map((port) => port.lon);
    const lats = ports.map((port) => port.lat);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

/** 埋め込み地図を表示する。要素がない・data 属性が壊れている・範囲が決まらないときは何もしない */
export async function mountRouteDetailMap(element: HTMLElement | null): Promise<void> {
    if (!element) return;
    const options = readRouteDetailMapOptions(element);
    if (!options) return;
    const bounds = routeDetailMapBounds(options);
    if (!bounds) return;

    const [maplibregl, { Protocol }, { default: workerUrl }] = await Promise.all([
        import('maplibre-gl'),
        import('pmtiles'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
        import('maplibre-gl/dist/maplibre-gl.css'),
    ]);
    maplibregl.setWorkerUrl(workerUrl);
    maplibregl.addProtocol('pmtiles', new Protocol().tile);

    const [west, south, east, north] = bounds;
    const isPoint = west === east && south === north;
    const map = new maplibregl.Map({
        container: element,
        style: MAP_STYLE_URL,
        ...(isPoint
            ? { center: [west, south] as [number, number], zoom: SINGLE_PORT_ZOOM }
            : { bounds, fitBoundsOptions: { padding: 40 } }),
        cooperativeGestures: true,
        attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
        map.addSource('route', { type: 'vector', url: `pmtiles://${ROUTE_DATA_BASE_URL}/searoute.pmtiles` });
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            'source-layer': options.sourceLayer,
            filter: ['==', ['to-string', ['get', 'routeId']], options.routeId],
            paint: { 'line-color': ['coalesce', ['get', 'color'], ROUTE_LINE_COLOR], 'line-width': 4 },
        });
        for (const port of options.ports) {
            const label = document.createElement('div');
            label.className = 'route-detail-port-label';
            label.textContent = port.name;
            new maplibregl.Marker({ element: label }).setLngLat([port.lon, port.lat]).addTo(map);
        }
    });
}
