/**
 * PMTilesレイヤー管理モジュール
 *
 * 責務:
 * - PMTiles形式の航路データのレイヤー追加・描画
 * - 航路レイヤーのクリックイベント通知（ドロワー表示は application 側）
 * - ズーム・ハイライト機能の実装
 * - 航路フィルターの適用
 */
import type { FeatureCollection } from 'geojson';
import type { FilterSpecification, MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
import type { RouteClickEvent, ZoomToRouteParams } from '../../application/ports';
import { getRouteLayerConfig, ROUTE_LAYER_CONFIGS } from '../../config/routeLayers';
import type { RouteLayerConfig } from '../../config/routeLayers';
import { boundsFromBbox, calculateBounds } from '../../domain/geoBounds';
import type { GeoBounds } from '../../domain/geoBounds';
import { normalizeRouteFilters } from '../../domain/routeFilter';
import type { RouteCarriageFilters, RouteFilters, RouteFiltersInput, RouteStatusFilters } from '../../domain/routeFilter';
import type { GeoJsonFeature, GeoJsonFeatureCollection, RouteDetails, RouteProperties } from '../../domain/seaRoute';
import { trackEvent } from '../analytics/googleAnalyticsAdapter';
import { createRouteDetailsRepository } from '../data/routeDetailsRepository';
import { map } from './mapRegistry';

type Expression = unknown[];

export const ROUTE_LAYER_SUFFIXES = ['_outline', '_solidline', '_dashline', '_thinline', '_name'];
export const ROUTE_FIT_DURATION_MS = 2000;
export const NEVER_MATCH_FILTER: Expression = ['==', ['get', 'routeId'], '__never_match__'];
export const STATUS_FILTERS: Record<keyof RouteStatusFilters, Expression> = {
    active: ['any', ['==', ['get', 'note'], null], ['==', ['get', 'note'], '']],
    season: ['==', ['get', 'note'], 'season'],
    suspend: ['==', ['get', 'note'], 'suspend'],
};
export function buildAvailabilityFilter(propertyName: string): Expression {
    return ['any', ['==', ['get', propertyName], 1], ['==', ['get', propertyName], '1']];
}
export function buildAnyFilter(filters: Array<Expression | null>, fallback: Expression | null = null): Expression | null {
    const validFilters = filters.filter(Boolean) as Expression[];
    if (validFilters.length === 0) return fallback;
    if (validFilters.length === 1) return validFilters[0];
    return ['any', ...validFilters];
}
export function combineFilters(...filters: Array<Expression | null>): Expression | null {
    const validFilters = filters.filter(Boolean) as Expression[];
    if (validFilters.length === 0) return null;
    if (validFilters.length === 1) return validFilters[0];
    return ['all', ...validFilters];
}
export function buildStatusFilterForSuffix(suffix: string, status: Partial<RouteStatusFilters> = {}): Expression {
    if (suffix === '_solidline') return status.active  ? STATUS_FILTERS.active  : NEVER_MATCH_FILTER;
    if (suffix === '_dashline')  return status.season  ? STATUS_FILTERS.season  : NEVER_MATCH_FILTER;
    if (suffix === '_thinline')  return status.suspend ? STATUS_FILTERS.suspend : NEVER_MATCH_FILTER;
    return buildAnyFilter([
        status.active  ? STATUS_FILTERS.active  : null,
        status.season  ? STATUS_FILTERS.season  : null,
        status.suspend ? STATUS_FILTERS.suspend : null,
    ], NEVER_MATCH_FILTER) as Expression;
}
export function buildCarriageFilter(carriage: Partial<RouteCarriageFilters> = {}): Expression | null {
    return buildAnyFilter([
        carriage.car     ? buildAvailabilityFilter('car')     : null,
        carriage.bike    ? buildAvailabilityFilter('bike')    : null,
        carriage.bicycle ? buildAvailabilityFilter('bicycle') : null,
    ]);
}
export function buildRouteFilter(suffix: string, routeFilters?: Partial<RouteFilters> | null): Expression | null {
    return combineFilters(
        buildStatusFilterForSuffix(suffix, routeFilters?.status),
        buildCarriageFilter(routeFilters?.carriage),
    );
}

export interface FitBoundsPadding {
    top: number;
    left: number;
    right: number;
    bottom: number;
}

interface DrawerElementLike {
    classList: { contains(token: string): boolean };
    getBoundingClientRect?: () => { width: number; height: number };
    offsetWidth?: number;
    offsetHeight?: number;
}

export function calculateFitBoundsPadding({
    documentRef = document,
    windowRef = globalThis,
    drawerWidth = 0,
    drawerHeight = 0,
    reserveDrawerSpace = false,
}: {
    documentRef?: { getElementById(id: string): DrawerElementLike | null };
    windowRef?: { innerWidth: number };
    drawerWidth?: number;
    drawerHeight?: number;
    reserveDrawerSpace?: boolean;
} = {}): FitBoundsPadding {
    const padding = { top: 50, left: 50, right: 50, bottom: 50 };
    const drawer = documentRef.getElementById('detail-drawer');
    if (drawer && (reserveDrawerSpace || !drawer.classList.contains('hidden'))) {
        const drawerRect = drawer.getBoundingClientRect?.();
        const measuredWidth = drawerWidth || drawerRect?.width || drawer.offsetWidth || 0;
        const measuredHeight = drawerHeight || drawerRect?.height || drawer.offsetHeight || 0;
        if (windowRef.innerWidth >= 768) {
            padding.left = measuredWidth > 0 ? measuredWidth + 30 : padding.left;
        } else {
            padding.bottom = measuredHeight > 0 ? measuredHeight + 30 : padding.bottom;
        }
    }
    return padding;
}

interface CameraMapLike {
    cameraForBounds(bounds: [[number, number], [number, number]], options: { padding: FitBoundsPadding }): object | undefined;
    flyTo(options: object): unknown;
}

export function animateToRouteBounds(mapRef: CameraMapLike, bounds: GeoBounds, padding: FitBoundsPadding): boolean {
    const boundsLike: [[number, number], [number, number]] = [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]];
    const camera = mapRef.cameraForBounds(boundsLike, { padding });
    if (!camera) return false;

    mapRef.flyTo({
        ...camera,
        duration: ROUTE_FIT_DURATION_MS,
        curve: 1.42,
        essential: true,
    });
    return true;
}

/** pmtiles / maplibregl を保持する環境（既定は window。npm 版はエントリーポイントで注入する） */
export interface PmtilesEnvironment {
    __searoutePmtilesReady?: boolean;
    pmtiles?: {
        Protocol: new () => { tile: unknown };
        PMTiles: new (url: string) => { getMetadata(): Promise<unknown> };
    };
    maplibregl?: { addProtocol(name: string, handler: unknown): void };
}

let pmtilesEnvironment: PmtilesEnvironment = globalThis as unknown as PmtilesEnvironment;

export function setupPmtilesProtocol({ windowRef = globalThis as unknown as PmtilesEnvironment }: { windowRef?: PmtilesEnvironment } = {}): void {
    pmtilesEnvironment = windowRef;
    windowRef.__searoutePmtilesReady = false;
    if (!windowRef.pmtiles || !windowRef.maplibregl) return;
    try {
        const protocol = new windowRef.pmtiles.Protocol();
        windowRef.maplibregl.addProtocol('pmtiles', protocol.tile);
        windowRef.__searoutePmtilesReady = true;
    } catch (error) {
        console.warn('PMTiles protocol setup failed:', error);
    }
}

export { calculateBounds };
export { ROUTE_LAYER_CONFIGS };

type RouteFeature = GeoJsonFeature<RouteProperties>;

export function toPlainGeoJsonFeature(feature: unknown): RouteFeature {
    const source = feature as { toJSON?: () => unknown } | null | undefined;
    const geoJson = (typeof source?.toJSON === 'function' ? source.toJSON() : feature) as Partial<RouteFeature>;
    return JSON.parse(JSON.stringify({
        type: 'Feature',
        ...(geoJson.id !== undefined ? { id: geoJson.id } : {}),
        properties: geoJson.properties ?? {},
        geometry: geoJson.geometry ?? null,
    }));
}

interface EventBinding {
    handleId: string;
    click: (event: MapLayerMouseEvent) => void;
    mousemove: () => void;
    mouseleave: () => void;
}

// EventHandle情報の保存
const eventHandle: Record<string, EventBinding> = {};

// 航路クリック時の通知先（entrypoints で application のユースケースを登録する）
let routeClickHandler: (event: RouteClickEvent) => void | Promise<void> = () => {};

export function setRouteClickHandler(handler: ((event: RouteClickEvent) => void | Promise<void>) | null): void {
    routeClickHandler = handler ?? (() => {});
}

// 設定値の管理
let routeFilters: RouteFilters = {
    status: {
        active: true,
        season: true,
        suspend: false,
    },
    carriage: {
        car: false,
        bike: false,
        bicycle: false,
    },
};

// detail-drawer のサイズキャッシュ（ResizeObserver で更新）
const drawerSizeCache = { width: 0, height: 0 };
let drawerResizeObserver: ResizeObserver | null = null;

interface ResizeEntryLike {
    borderBoxSize?: ReadonlyArray<{ inlineSize: number; blockSize: number }> | { inlineSize: number; blockSize: number };
    contentRect: { width: number; height: number };
}

export function initPmtilesLayers({
    documentRef = document,
    ResizeObserverImpl = ResizeObserver,
}: {
    documentRef?: { getElementById(id: string): Element | null };
    ResizeObserverImpl?: new (callback: (entries: ResizeEntryLike[]) => void) => ResizeObserver;
} = {}): boolean {
    if (drawerResizeObserver) {
        return false;
    }

    const drawerElement = documentRef.getElementById('detail-drawer');
    if (!drawerElement || typeof ResizeObserverImpl !== 'function') {
        return false;
    }

    drawerResizeObserver = new ResizeObserverImpl(entries => {
        const entry = entries[0];
        const borderBox = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize as { inlineSize: number; blockSize: number } | undefined;
        const drawerRect = drawerElement.getBoundingClientRect?.();
        drawerSizeCache.width = borderBox?.inlineSize ?? drawerRect?.width ?? entry.contentRect.width;
        drawerSizeCache.height = borderBox?.blockSize ?? drawerRect?.height ?? entry.contentRect.height;
    });
    drawerResizeObserver.observe(drawerElement);
    return true;
}

export function disposePmtilesLayers(): boolean {
    if (!drawerResizeObserver) {
        return false;
    }

    drawerResizeObserver.disconnect();
    drawerResizeObserver = null;
    return true;
}

export const routeDetailsRepository = createRouteDetailsRepository({
    routeLayerConfigs: ROUTE_LAYER_CONFIGS,
});

function isPmtilesReady(): boolean {
    return Boolean(pmtilesEnvironment.__searoutePmtilesReady && pmtilesEnvironment.pmtiles);
}

async function resolvePmtilesSourceLayer(cfg: RouteLayerConfig): Promise<string | null> {
    if (cfg.sourceLayer) {
        return cfg.sourceLayer;
    }

    if (!pmtilesEnvironment.pmtiles || !cfg.pmtilesPath) {
        return null;
    }

    try {
        const archive = new pmtilesEnvironment.pmtiles.PMTiles(cfg.pmtilesPath);
        const metadata = await archive.getMetadata() as { vector_layers?: Array<{ id?: string }> } | null;
        const firstLayer = metadata?.vector_layers?.[0]?.id || null;
        cfg.sourceLayer = firstLayer;
        return firstLayer;
    } catch (error) {
        console.warn('Failed to resolve PMTiles source-layer:', error);
        return null;
    }
}

export async function loadRouteDetails(routeId: unknown, sourceId: string): Promise<RouteDetails> {
    return routeDetailsRepository.loadRouteDetails(routeId, sourceId);
}

/**
 * PMTiles航路レイヤーを追加する
 * @param id - ROUTE_LAYER_CONFIGSのキー
 */
export async function addSeaRouteLayer(id: string): Promise<boolean> {
    if (!isPmtilesReady()) {
        console.error(`PMTiles is not ready for layer: ${id}`);
        return false;
    }

    const cfg = getRouteLayerConfig(id) as RouteLayerConfig;
    const sourceLayer = await resolvePmtilesSourceLayer(cfg);
    if (!sourceLayer) {
        console.error(`Failed to resolve PMTiles source-layer for: ${id}`);
        return false;
    }

    map.addSource(id, {
        type: 'vector',
        url: `pmtiles://${cfg.pmtilesPath}`,
    });

    const sl = { 'source-layer': sourceLayer };

    const lineWidth = (freqDefault: number, multZ3: number) => [
        'interpolate', ['linear'], ['zoom'],
        3, ['*', ['coalesce', ['get', 'freq'], freqDefault], multZ3],
        6, ['*', ['coalesce', ['get', 'freq'], freqDefault], 1.0],
    ];
    const outlineWidth = (freqDefault: number, multZ3: number) => [
        'interpolate', ['linear'], ['zoom'],
        3, ['*', ['coalesce', ['get', 'freq'], freqDefault], multZ3],
        6, ['+', ['*', ['coalesce', ['get', 'freq'], freqDefault], 1.0], 4],
    ];

    // MapLibre の式は構造が複雑なため、レイヤー定義は従来どおりの値で組み立てて渡す
    const addLayer = (layer: Record<string, unknown>) => map.addLayer(layer as unknown as Parameters<typeof map.addLayer>[0]);

    addLayer({
        id: `${id}_outline`,
        type: 'line',
        source: id,
        ...sl,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
            'line-color': cfg.outlineColor,
            'line-width': outlineWidth(cfg.freqDefault, cfg.freqMultZ3),
            'line-opacity': 0.5,
        },
    });
    addLayer({
        id: `${id}_solidline`,
        type: 'line',
        source: id,
        ...sl,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        filter: ['==', ['get', 'note'], null],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': lineWidth(cfg.freqDefault, cfg.freqMultZ3),
            'line-dasharray': [1, 0],
        },
    });
    addLayer({
        id: `${id}_dashline`,
        type: 'line',
        source: id,
        ...sl,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        filter: ['==', ['get', 'note'], 'season'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': lineWidth(cfg.freqDefault, cfg.freqMultZ3),
            'line-dasharray': [1, 2],
        },
    });
    addLayer({
        id: `${id}_thinline`,
        type: 'line',
        source: id,
        ...sl,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        filter: ['==', ['get', 'note'], 'suspend'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': lineWidth(cfg.freqDefault, cfg.freqMultZ3),
            'line-dasharray': [1, 4],
        },
    });
    addLayer({
        id: `${id}_name`,
        type: 'symbol',
        source: id,
        ...sl,
        layout: {
            'symbol-placement': 'line',
            'text-offset': [0, 1],
            'text-field': [
                'step', ['zoom'],
                '',
                4, ['get', 'businessName'],
                6, ['format', ['get', 'businessName'], {}, ' (', {}, ['get', 'routeName'], {}, ') ', {}],
            ],
            'text-font': ['Noto Sans Regular'],
            'text-size': 9,
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': 'rgba(255,255,255,0.75)',
            'text-halo-width': 2,
            'text-halo-blur': 0,
        },
    });

    applyRouteFilters();

    addSeaRouteClickEvent(id, `${id}_outline`);
    return true;
}

function addSeaRouteClickEvent(id: string, handleId: string = id): void {
    removeSeaRouteClickEvent(id);

    const onClick = (event: MapLayerMouseEvent) => {
        const properties = (event.features as MapGeoJSONFeature[])[0].properties as RouteProperties;
        void routeClickHandler({
            properties,
            sourceId: id,
            lngLat: event.lngLat ? { lat: event.lngLat.lat, lng: event.lngLat.lng } : undefined,
            zoom: map.getZoom(),
        });
    };
    const onMouseMove = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onMouseLeave = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', handleId, onClick);
    map.on('mousemove', handleId, onMouseMove);
    map.on('mouseleave', handleId, onMouseLeave);

    eventHandle[id] = { handleId, click: onClick, mousemove: onMouseMove, mouseleave: onMouseLeave };
}

export function removeSeaRouteClickEvent(id: string): void {
    const binding = eventHandle[id];
    if (!binding) return;

    if (binding.click)     map.off('click',     binding.handleId, binding.click);
    if (binding.mousemove) map.off('mousemove',  binding.handleId, binding.mousemove);
    if (binding.mouseleave) map.off('mouseleave', binding.handleId, binding.mouseleave);

    delete eventHandle[id];
}

/**
 * 航路レイヤーのhandleId一覧を返す（addResetClickEvent用）
 */
export function getSeaRouteHandleIds(): string[] {
    return Object.values(eventHandle).map(b => b.handleId).filter(Boolean);
}

// --- ズーム・ハイライト ---

/**
 * PMTilesソースから現在レンダリング済みのフィーチャーを取得する
 */
export function queryRouteFeatures(sourceId: string): GeoJsonFeatureCollection<RouteProperties> | null {
    const cfg = getRouteLayerConfig(sourceId);
    if (!cfg) return null;
    const features = map.querySourceFeatures(sourceId, { sourceLayer: cfg.sourceLayer as string });
    if (!features || features.length === 0) return null;
    return { type: 'FeatureCollection', features: features.map(toPlainGeoJsonFeature) };
}

export async function zoomToRoute(
    params: ZoomToRouteParams,
    { loadDetails = loadRouteDetails }: { loadDetails?: (routeId: unknown, sourceId: string) => Promise<RouteDetails> } = {},
): Promise<void> {
    try {
        const { routeName, routeId, lineId, sourceId } = params;

        const data = queryRouteFeatures(sourceId);
        if (!data) return;

        let matchingFeatures: RouteFeature[] = [];
        let searchType = '';

        if (routeName) {
            matchingFeatures = data.features.filter(f => f.properties?.routeName === routeName);
            searchType = 'routeName';
        } else if (routeId && lineId) {
            matchingFeatures = data.features.filter(f =>
                f.properties &&
                String(f.properties.routeId) === String(routeId) &&
                String(f.properties.lineId) === String(lineId)
            );
            searchType = 'routeSection';
            if (matchingFeatures.length === 0) {
                matchingFeatures = data.features.filter(f =>
                    f.properties && String(f.properties.routeId) === String(routeId)
                );
                searchType = 'routeOnly';
            }
        } else if (routeId) {
            matchingFeatures = data.features.filter(f =>
                f.properties && String(f.properties.routeId) === String(routeId)
            );
            searchType = 'routeOnly';
        }

        if (matchingFeatures.length === 0) {
            console.error('No matching features found for:', params);
            return;
        }

        let detailsBounds: GeoBounds | null = null;
        if (searchType === 'routeOnly' && routeId) {
            try {
                const details = await loadDetails(routeId, sourceId);
                detailsBounds = boundsFromBbox(details?.bbox);
            } catch (error) {
                console.warn(`Failed to load route bounds for ${routeId}`, error);
            }
        }

        const bounds = detailsBounds || calculateBounds(matchingFeatures as Parameters<typeof calculateBounds>[0]);
        if (!bounds) return;

        animateToRouteBounds(
            map as unknown as CameraMapLike,
            bounds,
            calculateFitBoundsPadding({ drawerWidth: drawerSizeCache.width, drawerHeight: drawerSizeCache.height }),
        );

        highlightRouteFeatures(matchingFeatures);

        if (detailsBounds && typeof map.once === 'function') {
            map.once('idle', () => {
                const refreshedFeatures = queryRouteFeatures(sourceId)?.features?.filter(feature =>
                    feature.properties && String(feature.properties.routeId) === String(routeId)
                ) || [];
                if (refreshedFeatures.length > 0) {
                    highlightRouteFeatures(refreshedFeatures);
                }
            });
        }

        if (typeof gtag !== 'undefined') {
            const eventLabel = routeName || `${routeId}-${lineId}`;
            const eventType = searchType === 'routeName' ? 'route_zoom' : 'route_section_zoom';
            trackEvent(eventType, 'map', eventLabel);
        }
    } catch (error) {
        console.error('Error in zoomToRoute:', error);
    }
}

export function zoomToRouteSection(routeId: string | number, lineId: string | number, sourceId: string): Promise<void> {
    return zoomToRoute({ routeId, lineId, sourceId });
}

export function highlightRouteFeatures(features: RouteFeature[]): void {
    removeRouteHighlight();
    map.addSource('route-highlight', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features } as FeatureCollection,
    });
    map.addLayer({
        id: 'route-highlight-line',
        type: 'line',
        source: 'route-highlight',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#FF6B35'],
            'line-width': 8,
            'line-opacity': 0.6,
        },
    });
}

export function removeRouteHighlight(): void {
    if (map.getLayer('route-highlight-line')) map.removeLayer('route-highlight-line');
    if (map.getSource('route-highlight'))     map.removeSource('route-highlight');
}

// --- フィルタ ---

const ROUTE_TYPES = Object.keys(ROUTE_LAYER_CONFIGS);

function applyRouteFilters(): void {
    ROUTE_TYPES.forEach(routeType => {
        ROUTE_LAYER_SUFFIXES.forEach(suffix => {
            const layerId = routeType + suffix;
            if (map.getLayer(layerId)) {
                map.setFilter(layerId, buildRouteFilter(suffix, routeFilters) as FilterSpecification | null);
            }
        });
    });
}

export function setRouteFilters(filters: RouteFiltersInput | RouteFilters): void {
    routeFilters = normalizeRouteFilters(filters);
    applyRouteFilters();
}

export function toggleSuspendedRoutes(showSuspended: boolean): void {
    setRouteFilters({
        status:   { active: true, season: true, suspend: showSuspended },
        carriage: { car: false, bike: false, bicycle: false },
    });
}
