/**
 * PMTilesレイヤー管理モジュール
 *
 * 責務:
 * - PMTiles形式の航路データのレイヤー追加・描画
 * - 航路レイヤーのクリックイベント処理
 * - ズーム・ハイライト機能の実装
 * - 運休中の航路表示切り替え
 */

import { loadShipImageIntoDrawer } from './utils/wikipediaImage.js';
import { setDrawerContext } from './utils/shareDrawer.js';
import { map } from './common.js';
import {
    splitBusinessName,
    buildSeaRouteSidebarContent,
} from './utils/drawerHelpers.js';

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

const routeDetailsCache = new Map();
const routeDetailsInFlight = new Map();

const UNIFIED_PMTILES_PATH = 'https://pmtiles.searoute.info/searoute.pmtiles';
// const UNIFIED_PMTILES_PATH = './data/searoute.pmtiles';

// detail-drawer のサイズキャッシュ（ResizeObserver で更新）
const drawerSizeCache = { width: 0, height: 0 };
{
    const drawerEl = document.getElementById('detail-drawer');
    if (drawerEl) {
        const ro = new ResizeObserver(entries => {
            const entry = entries[0];
            drawerSizeCache.width = entry.contentRect.width;
            drawerSizeCache.height = entry.contentRect.height;
        });
        ro.observe(drawerEl);
    }
}

// 航路レイヤーごとの設定
export const ROUTE_LAYER_CONFIGS = {
    'geojson_sea_route': {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute',
        datasetName: 'seaRoute',
        outlineColor: '#FFFFFF',
        freqDefault:  3,
        freqMultZ3:   0.5,
    },
    'geojson_international_sea_route': {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute_international',
        datasetName: 'internationalSeaRoute',
        outlineColor: '#FFFFFF',
        freqDefault:  1,
        freqMultZ3:   0.75,
    },
    'geojson_KR_sea_route': {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute_KR',
        datasetName: 'seaRouteKR',
        outlineColor: '#FFFFFF',
        freqDefault:  1,
        freqMultZ3:   0.75,
    },
    'geojson_limited_sea_route': {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute_limited',
        datasetName: 'limitedSeaRoute',
        outlineColor: '#000000',
        freqDefault:  1,
        freqMultZ3:   0.75,
    },
};

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
    if (!sourceId || routeId === null || routeId === undefined || routeId === '') {
        return {};
    }

    const cfg = ROUTE_LAYER_CONFIGS[sourceId];
    if (!cfg) {
        console.warn(`Unknown sourceId: ${sourceId}`);
        return {};
    }

    const normalizedRouteId = String(routeId);
    const cacheKey = `${cfg.sourceLayer}:${normalizedRouteId}`;

    if (routeDetailsCache.has(cacheKey)) {
        return routeDetailsCache.get(cacheKey);
    }

    if (routeDetailsInFlight.has(cacheKey)) {
        return routeDetailsInFlight.get(cacheKey);
    }

    const loadPromise = (async () => {
        const candidates = [cfg.sourceLayer, cfg.datasetName].filter(Boolean);

        try {
            for (const folderName of candidates) {
                const path = `https://pmtiles.searoute.info/details/${folderName}/${encodeURIComponent(normalizedRouteId)}.json`;
                const response = await fetch(path);
                if (!response.ok) {
                    continue;
                }

                const details = await response.json();
                routeDetailsCache.set(cacheKey, details || {});
                return details || {};
            }

            routeDetailsCache.set(cacheKey, {});
            return {};
        } catch (error) {
            console.warn(`Error loading details for ${cfg.sourceLayer}:${normalizedRouteId}`, error);
            routeDetailsCache.set(cacheKey, {});
            return {};
        } finally {
            routeDetailsInFlight.delete(cacheKey);
        }
    })();

    routeDetailsInFlight.set(cacheKey, loadPromise);
    return loadPromise;
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

        setDrawerContext({ type: 'route', routeId: properties.routeId, sourceId: id });
        window.showDetailDrawerWithPinClear(
            sidebarContent,
            businessNameParts.primary,
            businessNameParts.secondary
        );
        loadShipImageIntoDrawer(details.shipName || properties.shipName || null, properties.businessName || '');
        gtag('event', 'marker_click', {
            'event_category': 'map',
            'event_label': properties.businessName,
            'value': 1
        });
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
    return { type: 'FeatureCollection', features };
}

/**
 * feature 群から境界ボックスを計算する
 */
export function calculateBounds(features) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    features.forEach(feature => {
        const lines = feature.geometry.type === 'LineString'
            ? [feature.geometry.coordinates]
            : feature.geometry.type === 'MultiLineString'
                ? feature.geometry.coordinates
                : [];
        lines.forEach(line => line.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        }));
    });

    const isValid = minLng !== Infinity && minLat !== Infinity && maxLng !== -Infinity && maxLat !== -Infinity;
    if (!isValid) {
        console.error('Invalid bounds calculated');
        return null;
    }
    return { minLng, maxLng, minLat, maxLat };
}

/**
 * ドロワー表示状態に応じてパディングを計算する
 */
export function calculateFitBoundsPadding() {
    const padding = { top: 50, left: 50, right: 50, bottom: 50 };
    const detailDrawer = document.getElementById('detail-drawer');
    if (detailDrawer && !detailDrawer.classList.contains('hidden')) {
        if (window.innerWidth >= 768) {
            padding.left = drawerSizeCache.width + 30;
        } else {
            padding.bottom = drawerSizeCache.height + 30;
        }
    }
    return padding;
}

window.zoomToRoute = function(params) {
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

        const bounds = calculateBounds(matchingFeatures);
        if (!bounds) return;

        map.fitBounds(
            [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
            { padding: calculateFitBoundsPadding(), duration: 1000 }
        );

        addRouteHighlight(matchingFeatures);

        if (typeof gtag !== 'undefined') {
            const eventLabel = routeName || `${routeId}-${lineId}`;
            const eventType = searchType === 'routeName' ? 'route_zoom' : 'route_section_zoom';
            gtag('event', eventType, { 'event_category': 'map', 'event_label': eventLabel, 'value': 1 });
        }
    } catch (error) {
        console.error('Error in zoomToRoute:', error);
    }
};

window.zoomToRouteSection = function(routeId, lineId, sourceId) {
    window.zoomToRoute({ routeId, lineId, sourceId });
};

function addRouteHighlight(features) {
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

window.removeRouteHighlight = removeRouteHighlight;

// --- フィルタ ---

const ROUTE_TYPES = ['geojson_sea_route', 'geojson_international_sea_route', 'geojson_KR_sea_route', 'geojson_limited_sea_route'];
const ROUTE_LAYER_SUFFIXES = ['_outline', '_solidline', '_dashline', '_thinline', '_name'];
const NEVER_MATCH_FILTER = ['==', ['get', 'routeId'], '__never_match__'];

const STATUS_FILTERS = {
    active: ['any', ['==', ['get', 'note'], null], ['==', ['get', 'note'], '']],
    season: ['==', ['get', 'note'], 'season'],
    suspend: ['==', ['get', 'note'], 'suspend'],
};

function buildAvailabilityFilter(propertyName) {
    return ['any',
        ['==', ['get', propertyName], 1],
        ['==', ['get', propertyName], '1'],
    ];
}

function buildAnyFilter(filters, fallback = null) {
    const validFilters = filters.filter(Boolean);
    if (validFilters.length === 0) return fallback;
    if (validFilters.length === 1) return validFilters[0];
    return ['any', ...validFilters];
}

function combineFilters(...filters) {
    const validFilters = filters.filter(Boolean);
    if (validFilters.length === 0) return null;
    if (validFilters.length === 1) return validFilters[0];
    return ['all', ...validFilters];
}

function getStatusFilterForSuffix(suffix) {
    const s = routeFilters.status || {};
    if (suffix === '_solidline') return s.active  ? STATUS_FILTERS.active  : NEVER_MATCH_FILTER;
    if (suffix === '_dashline')  return s.season   ? STATUS_FILTERS.season  : NEVER_MATCH_FILTER;
    if (suffix === '_thinline')  return s.suspend  ? STATUS_FILTERS.suspend : NEVER_MATCH_FILTER;
    return buildAnyFilter([
        s.active  ? STATUS_FILTERS.active  : null,
        s.season  ? STATUS_FILTERS.season  : null,
        s.suspend ? STATUS_FILTERS.suspend : null,
    ], NEVER_MATCH_FILTER);
}

function getCarriageFilter() {
    const c = routeFilters.carriage || {};
    return buildAnyFilter([
        c.car     ? buildAvailabilityFilter('car')     : null,
        c.bike    ? buildAvailabilityFilter('bike')    : null,
        c.bicycle ? buildAvailabilityFilter('bicycle') : null,
    ]);
}

function applyRouteFilters() {
    ROUTE_TYPES.forEach(routeType => {
        ROUTE_LAYER_SUFFIXES.forEach(suffix => {
            const layerId = routeType + suffix;
            if (map.getLayer(layerId)) {
                map.setFilter(layerId, combineFilters(getStatusFilterForSuffix(suffix), getCarriageFilter()));
            }
        });
    });
}

export function setRouteFilters(filters) {
    routeFilters = {
        status: {
            active:  Boolean(filters?.status?.active),
            season:  Boolean(filters?.status?.season),
            suspend: Boolean(filters?.status?.suspend),
        },
        carriage: {
            car:     Boolean(filters?.carriage?.car),
            bike:    Boolean(filters?.carriage?.bike),
            bicycle: Boolean(filters?.carriage?.bicycle),
        },
    };
    applyRouteFilters();
}

export function toggleSuspendedRoutes(showSuspended) {
    setRouteFilters({
        status:   { active: true, season: true, suspend: showSuspended },
        carriage: { car: false, bike: false, bicycle: false },
    });
}
