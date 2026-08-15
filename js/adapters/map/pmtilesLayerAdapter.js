/**
 * PMTilesレイヤー管理モジュール
 *
 * 責務:
 * - PMTiles形式の航路データのレイヤー追加・描画
 * - 航路レイヤーのクリックイベント処理
 * - ズーム・ハイライト機能の実装
 * - 運休中の航路表示切り替え
 */

import { loadShipImageIntoDrawer } from '../data/wikipediaImageAdapter.js';
import { setDrawerContext } from '../../presentation/shareDrawer.js';
import { map } from './mapRegistry.js';
import {
    splitBusinessName,
    buildSeaRouteSidebarContent,
} from '../../presentation/drawerHelpers.js';
import { normalizeRouteFilters } from '../../domain/routeFilter.js';
import { boundsFromBbox, calculateBounds } from '../../domain/geoBounds.js';
import { createRouteDetailsRepository } from '../data/routeDetailsRepository.js';
import { ROUTE_LAYER_CONFIGS } from '../../config/routeLayers.js';
import { showDrawer } from '../../presentation/drawerViewModel.js';

export const ROUTE_LAYER_SUFFIXES = ['_outline', '_solidline', '_dashline', '_thinline', '_name'];
export const ROUTE_FIT_DURATION_MS = 2000;
export const NEVER_MATCH_FILTER = ['==', ['get', 'routeId'], '__never_match__'];
export const STATUS_FILTERS = {
    active: ['any', ['==', ['get', 'note'], null], ['==', ['get', 'note'], '']],
    season: ['==', ['get', 'note'], 'season'],
    suspend: ['==', ['get', 'note'], 'suspend'],
};
export function buildAvailabilityFilter(propertyName) {
    return ['any', ['==', ['get', propertyName], 1], ['==', ['get', propertyName], '1']];
}
export function buildAnyFilter(filters, fallback = null) {
    const validFilters = filters.filter(Boolean);
    if (validFilters.length === 0) return fallback;
    if (validFilters.length === 1) return validFilters[0];
    return ['any', ...validFilters];
}
export function combineFilters(...filters) {
    const validFilters = filters.filter(Boolean);
    if (validFilters.length === 0) return null;
    if (validFilters.length === 1) return validFilters[0];
    return ['all', ...validFilters];
}
export function buildStatusFilterForSuffix(suffix, status = {}) {
    if (suffix === '_solidline') return status.active  ? STATUS_FILTERS.active  : NEVER_MATCH_FILTER;
    if (suffix === '_dashline')  return status.season  ? STATUS_FILTERS.season  : NEVER_MATCH_FILTER;
    if (suffix === '_thinline')  return status.suspend ? STATUS_FILTERS.suspend : NEVER_MATCH_FILTER;
    return buildAnyFilter([
        status.active  ? STATUS_FILTERS.active  : null,
        status.season  ? STATUS_FILTERS.season  : null,
        status.suspend ? STATUS_FILTERS.suspend : null,
    ], NEVER_MATCH_FILTER);
}
export function buildCarriageFilter(carriage = {}) {
    return buildAnyFilter([
        carriage.car     ? buildAvailabilityFilter('car')     : null,
        carriage.bike    ? buildAvailabilityFilter('bike')    : null,
        carriage.bicycle ? buildAvailabilityFilter('bicycle') : null,
    ]);
}
export function buildRouteFilter(suffix, routeFilters) {
    return combineFilters(
        buildStatusFilterForSuffix(suffix, routeFilters?.status),
        buildCarriageFilter(routeFilters?.carriage),
    );
}
import { trackEvent } from '../analytics/googleAnalyticsAdapter.js';

export function calculateFitBoundsPadding({
    documentRef = document,
    windowRef = globalThis,
    drawerWidth = 0,
    drawerHeight = 0,
    reserveDrawerSpace = false,
} = {}) {
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

export function animateToRouteBounds(mapRef, bounds, padding) {
    const boundsLike = [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]];
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

export function setupPmtilesProtocol({ windowRef = window } = {}) {
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

export function toPlainGeoJsonFeature(feature) {
    const geoJson = typeof feature?.toJSON === 'function' ? feature.toJSON() : feature;
    return JSON.parse(JSON.stringify({
        type: 'Feature',
        ...(geoJson.id !== undefined ? { id: geoJson.id } : {}),
        properties: geoJson.properties ?? {},
        geometry: geoJson.geometry ?? null,
    }));
}

// EventHandle情報の保存
const eventHandle = {};

// 設定値の管理
let routeFilters = {
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
let drawerResizeObserver = null;

export function initPmtilesLayers({
    documentRef = document,
    ResizeObserverImpl = ResizeObserver,
} = {}) {
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
            : entry.borderBoxSize;
        const drawerRect = drawerElement.getBoundingClientRect?.();
        drawerSizeCache.width = borderBox?.inlineSize ?? drawerRect?.width ?? entry.contentRect.width;
        drawerSizeCache.height = borderBox?.blockSize ?? drawerRect?.height ?? entry.contentRect.height;
    });
    drawerResizeObserver.observe(drawerElement);
    return true;
}

export function disposePmtilesLayers() {
    if (!drawerResizeObserver) {
        return false;
    }

    drawerResizeObserver.disconnect();
    drawerResizeObserver = null;
    return true;
}

const routeDetailsRepository = createRouteDetailsRepository({
    routeLayerConfigs: ROUTE_LAYER_CONFIGS,
});

function isPmtilesReady() {
    return Boolean(window.__searoutePmtilesReady && window.pmtiles);
}

async function resolvePmtilesSourceLayer(cfg) {
    if (cfg.sourceLayer) {
        return cfg.sourceLayer;
    }

    if (!window.pmtiles || !cfg.pmtilesPath) {
        return null;
    }

    try {
        const archive = new window.pmtiles.PMTiles(cfg.pmtilesPath);
        const metadata = await archive.getMetadata();
        const firstLayer = metadata?.vector_layers?.[0]?.id || null;
        cfg.sourceLayer = firstLayer;
        return firstLayer;
    } catch (error) {
        console.warn('Failed to resolve PMTiles source-layer:', error);
        return null;
    }
}

export async function loadRouteDetails(routeId, sourceId) {
    return routeDetailsRepository.loadRouteDetails(routeId, sourceId);
}

/**
 * PMTiles航路レイヤーを追加する
 * @param {string} id - ROUTE_LAYER_CONFIGSのキー
 */
export async function addSeaRouteLayer(id) {
    if (!isPmtilesReady()) {
        console.error(`PMTiles is not ready for layer: ${id}`);
        return false;
    }

    const cfg = ROUTE_LAYER_CONFIGS[id];
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

    const lineWidth = (freqDefault, multZ3) => [
        'interpolate', ['linear'], ['zoom'],
        3, ['*', ['coalesce', ['get', 'freq'], freqDefault], multZ3],
        6, ['*', ['coalesce', ['get', 'freq'], freqDefault], 1.0],
    ];
    const outlineWidth = (freqDefault, multZ3) => [
        'interpolate', ['linear'], ['zoom'],
        3, ['*', ['coalesce', ['get', 'freq'], freqDefault], multZ3],
        6, ['+', ['*', ['coalesce', ['get', 'freq'], freqDefault], 1.0], 4],
    ];

    map.addLayer({
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
    map.addLayer({
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
    map.addLayer({
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
    map.addLayer({
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
    map.addLayer({
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
            'text-font': ['NotoSansCJKjp-Regular'],
            'text-size': 9,
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
            'text-halo-blur': 2,
        },
    });

    applyRouteFilters();

    addSeaRouteClickEvent(id, `${id}_outline`);
    return true;
}

function addSeaRouteClickEvent(id, handleId = id) {
    removeSeaRouteClickEvent(id);

    const onClick = async (event) => {
        const properties = event.features[0].properties;
        const details = await loadRouteDetails(properties.routeId, id);
        const businessNameParts = splitBusinessName(properties.businessName);
        const sidebarContent = buildSeaRouteSidebarContent(properties, details, id);

        setDrawerContext({
            type: 'route',
            routeId: properties.routeId,
            sourceId: id,
            lat: event.lngLat?.lat,
            lng: event.lngLat?.lng,
            zoom: map.getZoom(),
        });
        showDrawer(
            sidebarContent,
            businessNameParts.primary,
            businessNameParts.secondary
        );
        loadShipImageIntoDrawer(details.shipName || properties.shipName || null, properties.businessName || '');
        trackEvent('marker_click', 'map', properties.businessName);
    };
    const onMouseMove = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onMouseLeave = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', handleId, onClick);
    map.on('mousemove', handleId, onMouseMove);
    map.on('mouseleave', handleId, onMouseLeave);

    eventHandle[id] = { handleId, click: onClick, mousemove: onMouseMove, mouseleave: onMouseLeave };
}

export function removeSeaRouteClickEvent(id) {
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
export function getSeaRouteHandleIds() {
    return Object.values(eventHandle).map(b => b.handleId).filter(Boolean);
}

// --- ズーム・ハイライト ---

/**
 * PMTilesソースから現在レンダリング済みのフィーチャーを取得する
 * @param {string} sourceId
 * @returns {{ type: 'FeatureCollection', features: Array }|null}
 */
export function queryRouteFeatures(sourceId) {
    const cfg = ROUTE_LAYER_CONFIGS[sourceId];
    if (!cfg) return null;
    const features = map.querySourceFeatures(sourceId, { sourceLayer: cfg.sourceLayer });
    if (!features || features.length === 0) return null;
    return { type: 'FeatureCollection', features: features.map(toPlainGeoJsonFeature) };
}

export async function zoomToRoute(params, { loadDetails = loadRouteDetails } = {}) {
    try {
        const { routeName, routeId, lineId, sourceId } = params;

        const data = queryRouteFeatures(sourceId);
        if (!data) return;

        let matchingFeatures = [];
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

        let detailsBounds = null;
        if (searchType === 'routeOnly' && routeId) {
            try {
                const details = await loadDetails(routeId, sourceId);
                detailsBounds = boundsFromBbox(details?.bbox);
            } catch (error) {
                console.warn(`Failed to load route bounds for ${routeId}`, error);
            }
        }

        const bounds = detailsBounds || calculateBounds(matchingFeatures);
        if (!bounds) return;

        animateToRouteBounds(
            map,
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

export function zoomToRouteSection(routeId, lineId, sourceId) {
    return zoomToRoute({ routeId, lineId, sourceId });
}

export function highlightRouteFeatures(features) {
    removeRouteHighlight();
    map.addSource('route-highlight', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
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

export function removeRouteHighlight() {
    if (map.getLayer('route-highlight-line')) map.removeLayer('route-highlight-line');
    if (map.getSource('route-highlight'))     map.removeSource('route-highlight');
}

// --- フィルタ ---

const ROUTE_TYPES = Object.keys(ROUTE_LAYER_CONFIGS);

function applyRouteFilters() {
    ROUTE_TYPES.forEach(routeType => {
        ROUTE_LAYER_SUFFIXES.forEach(suffix => {
            const layerId = routeType + suffix;
            if (map.getLayer(layerId)) {
                map.setFilter(layerId, buildRouteFilter(suffix, routeFilters));
            }
        });
    });
}

export function setRouteFilters(filters) {
    routeFilters = normalizeRouteFilters(filters);
    applyRouteFilters();
}

export function toggleSuspendedRoutes(showSuspended) {
    setRouteFilters({
        status:   { active: true, season: true, suspend: showSuspended },
        carriage: { car: false, bike: false, bicycle: false },
    });
}
