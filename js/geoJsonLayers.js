/**
 * GeoJSONレイヤー管理モジュール
 *
 * 責務:
 * - 港湾データのGeoJSONレイヤーの追加・描画
 * - マーカー画像の読み込みと管理
 * - GeoJSONレイヤーのクリックイベント処理
 * - URLシェアからの航路/港湾復元
 */

import { loadData } from './dataLoader.js';
import { loadShipImageIntoDrawer } from './utils/wikipediaImage.js';
import { setDrawerContext, restoreDrawerFromUrl } from './utils/shareDrawer.js';
import { map } from './common.js';
import {
    splitBusinessName,
    buildSeaRouteSidebarContent,
    buildPortSidebarContent,
} from './utils/drawerHelpers.js';
import {
    ROUTE_LAYER_CONFIGS,
    addSeaRouteLayer,
    removeSeaRouteClickEvent,
    getSeaRouteHandleIds,
    removeRouteHighlight,
    loadRouteDetails,
    queryRouteFeatures,
    calculateBounds,
    calculateFitBoundsPadding,
} from './pmtilesLayers.js';

export { setRouteFilters, toggleSuspendedRoutes } from './pmtilesLayers.js';

// EventHandle情報の保存（ポートレイヤー用）
const eventHandle = {};

// GeoJSONデータのキャッシュ（ポートレイヤー用）
const geoJsonDataCache = {};

const ROUTE_SHARE_OVERVIEW = {
    geojson_sea_route: {
        center: [137.5, 36.5],
        zoom: 4,
    },
    geojson_international_sea_route: {
        center: [127, 33],
        zoom: 3,
    },
    geojson_KR_sea_route: {
        center: [129, 35.5],
        zoom: 5,
    },
    geojson_limited_sea_route: {
        center: [137.5, 36.5],
        zoom: 5,
    },
};

async function waitForMapSettled() {
    await new Promise((resolve) => map.once('moveend', resolve));
    await new Promise((resolve) => map.once('idle', resolve));
}

function getRouteShareOverview(sourceId) {
    return ROUTE_SHARE_OVERVIEW[sourceId] || {
        center: [137.5, 36.5],
        zoom: 4,
    };
}

async function queryRouteFeaturesWithOverviewFallback(sourceId, normalizedRouteId) {
    let data = queryRouteFeatures(sourceId);
    let matchingFeatures = data?.features?.filter(
        (f) => f?.properties?.routeId == normalizedRouteId
    ) || [];

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

    data = queryRouteFeatures(sourceId);
    matchingFeatures = data?.features?.filter(
        (f) => f?.properties?.routeId == normalizedRouteId
    ) || [];

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
 * GeoJsonLayerを追加する関数
 * @param {string} id - GeoJsonのID
 */
export async function addGeoJsonLayer(id) {
    if (id === 'geojson_port') {
        await addGeoJsonPortLayer();
        addPortClickEvent('geojson_port');
        return true;
    } else if (id in ROUTE_LAYER_CONFIGS) {
        return addSeaRouteLayer(id);
    } else {
        console.log('[Error] Layer not found : addGeoJsonLayer( ' + id + ' )');
        return false;
    }
}

/**
 * GeoJsonLayer用のMarkerを追加する関数
 * @param {string} id - ImageID
 * @param {string} url - 画像URL
 */
export async function addMarker(id, url) {
    if (!map.hasImage(id)) {
        const anchorImage = await map.loadImage(url);
        map.addImage(id, anchorImage.data);
    }
}

async function addGeoJsonPortLayer() {
    addMarker('anchor_marker', './img/anchor.png');

    const portGeojson = await loadData('./data/portData.geojson');
    geoJsonDataCache['geojson_port'] = portGeojson;

    map.addSource('geojson_port', {
        type: 'geojson',
        data: portGeojson,
        attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C02-v3_2.html' target='_blank'>「国土数値情報（港湾データ）」</a>を加工して作成",
    });
    map.addLayer({
        id: 'geojson_port',
        type: 'symbol',
        source: 'geojson_port',
        layout: {
            'icon-image': 'anchor_marker',
            'icon-size': 0.3,
            'text-field': ['get', 'Name'],
            'text-font': ['NotoSansCJKjp-Regular'],
            'text-size': 12,
            'text-offset': [0, 0.8],
            'text-anchor': 'top',
        },
    });
}

/**
 * Portに関するイベントを追加
 * @param {string} id - 紐づけ元GeoJsonのID
 * @param {string} handleId - EventをHandleするID
 */
function addPortClickEvent(id, handleId = id) {
    removeClickEvent(id);

    const onClick = (event) => {
        const properties = event.features[0].properties;
        const portName = properties.Name || properties.portName || 'N/A';
        const coords = event.features[0].geometry.coordinates;

        // portNameに「港」や「桟橋」が含まれていない場合は「港」を追加
        const searchPortName = (portName.includes('港') || portName.includes('桟橋')) ? portName : `${portName}港`;
        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchPortName)}`;
        const sidebarContent = buildPortSidebarContent(properties, googleMapsUrl);

        setDrawerContext({ type: 'port', lat: coords[1], lng: coords[0], name: portName });
        window.showDetailDrawerWithPinClear(sidebarContent, portName, '港湾情報');
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
 * @param {string} id - 紐づけ元GeoJsonのID
 */
export function removeClickEvent(id) {
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
 * なにもないところをクリックしたときに既存のポップアップを削除
 */
export function addResetClickEvent() {
    map.on('click', (event) => {
        const portHandleIds  = Object.values(eventHandle).map(b => b.handleId).filter(Boolean);
        const routeHandleIds = getSeaRouteHandleIds();
        const validIds = [...portHandleIds, ...routeHandleIds];

        const features = map.queryRenderedFeatures(event.point);
        if (!features.find(feature => validIds.includes(feature.layer.id))) {
            if (window.hideSidebar) window.hideSidebar();
            removeRouteHighlight();
        }
    });
}

/**
 * URLクエリから航路/港湾のドロワーを復元する
 */
export async function initShareFromUrl() {
    await restoreDrawerFromUrl({
        route: async (routeId, sourceId, lat, lng, zoom) => {
            const normalizedRouteId = isNaN(routeId) ? routeId : Number(routeId);

            if (!isNaN(lat) && !isNaN(lng)) {
                map.flyTo({
                    center: [lng, lat],
                    zoom: !isNaN(zoom) ? zoom : Math.max(map.getZoom(), 8),
                    duration: 1000,
                });

                await waitForMapSettled();
            }

            const matchingFeatures = !isNaN(lat) && !isNaN(lng)
                ? (queryRouteFeatures(sourceId)?.features?.filter(
                    (f) => f?.properties?.routeId == normalizedRouteId
                ) || [])
                : await queryRouteFeaturesWithOverviewFallback(sourceId, normalizedRouteId);

            const feature = matchingFeatures[0];
            if (!feature) return false;

            if (isNaN(lat) || isNaN(lng)) {
                const bounds = calculateBounds(matchingFeatures);
                if (bounds) {
                    map.fitBounds(
                        [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
                        { padding: calculateFitBoundsPadding(), duration: 1000 }
                    );
                }
            }

            const details = await loadRouteDetails(normalizedRouteId, sourceId);
            const businessNameParts = splitBusinessName(feature.properties.businessName);
            const sidebarContent = buildSeaRouteSidebarContent(feature.properties, details, sourceId);
            setDrawerContext({
                type: 'route',
                routeId,
                sourceId,
                lat: !isNaN(lat) ? lat : undefined,
                lng: !isNaN(lng) ? lng : undefined,
                zoom: !isNaN(zoom) ? zoom : undefined,
            });
            window.showDetailDrawerWithPinClear(
                sidebarContent,
                businessNameParts.primary,
                businessNameParts.secondary
            );
            loadShipImageIntoDrawer(details.shipName || feature.properties.shipName || null, feature.properties.businessName || '');
            return true;
        },
        port: async (lat, lng, name) => {
            map.flyTo({ center: [lng, lat], zoom: 12, duration: 1000 });
            if (!geoJsonDataCache['geojson_port']) {
                geoJsonDataCache['geojson_port'] = await loadData('./data/portData.geojson');
            }
            const portData = geoJsonDataCache['geojson_port'];
            const feature = portData?.features.find(f =>
                (f.properties.Name || f.properties.portName) === name
            );
            const properties = feature?.properties ?? { Name: name };
            const searchPortName = (name.includes('港') || name.includes('桟橋')) ? name : `${name}港`;
            const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchPortName)}`;
            const sidebarContent = buildPortSidebarContent(properties, googleMapsUrl);
            setDrawerContext({ type: 'port', lat, lng, name });
            window.showDetailDrawerWithPinClear(sidebarContent, name, '港湾情報');
            return true;
        },
        coord: async (lat, lng) => {
            map.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
            if (window.openCoordinateDrawer) window.openCoordinateDrawer(lat, lng);
            return true;
        },
    });
}
