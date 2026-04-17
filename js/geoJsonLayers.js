import { loadData, loadAndMergeData } from './dataLoader.js';
import { map } from './common.js';

// EventHandle情報の保存
var eventHandle = {};

// 設定値の管理
let showSuspendedRoutes = true;

// GeoJSONデータのキャッシュ
const geoJsonDataCache = {};

/**
 * GeoJsonLayerを追加する関数
 * @param {string} id - GeoJsonのID
 */
export async function addGeoJsonLayer(id) {
    if (id === 'geojson_port') {
        addGeoJsonPortLayer();
        addPortClickEvent('geojson_port');
    } else if (id in ROUTE_LAYER_CONFIGS) {
        addGenericSeaRouteLayer(id);
        addSeaRouteClickEvent(id, `${id}_outline`);
    } else {
        console.log('[Error] Layer not found : addGeoJsonLayer( ' + id + ' )');
    }
}

/**
 * GeoJsonLayer用のMarkerを追加する関数
 * @param {string} id - ImageID
 * @param {string} url - 画像URL
 */
export async function addMarker(id, url){
    if (!map.hasImage(id)) {
        const anchorImage = await map.loadImage(url);
        map.addImage(id, anchorImage.data);
    }
}

// 航路レイヤーごとの設定
const ROUTE_LAYER_CONFIGS = {
    'geojson_sea_route': {
        geojsonPath:  './data/seaRoute.geojson',
        detailsPath:  './data/seaRouteDetails.json',
        outlineColor: '#FFFFFF',
        freqDefault:  3,
        freqMultZ3:   0.5,
    },
    'geojson_international_sea_route': {
        geojsonPath:  './data/internationalSeaRoute.geojson',
        detailsPath:  './data/internationalSeaRouteDetails.json',
        outlineColor: '#FFFFFF',
        freqDefault:  1,
        freqMultZ3:   0.75,
    },
    'geojson_KR_sea_route': {
        geojsonPath:  './data/seaRouteKR.geojson',
        detailsPath:  './data/seaRouteKRDetails.json',
        outlineColor: '#FFFFFF',
        freqDefault:  1,
        freqMultZ3:   0.75,
    },
    'geojson_limited_sea_route': {
        geojsonPath:  './data/limitedSeaRoute.geojson',
        detailsPath:  './data/limitedSeaRouteDetails.json',
        outlineColor: '#000000',
        freqDefault:  1,
        freqMultZ3:   0.75,
    },
};

/**
 * 汎用航路レイヤーを追加する関数
 * @param {string} id - ROUTE_LAYER_CONFIGSのキー
 */
async function addGenericSeaRouteLayer(id) {
    const cfg = ROUTE_LAYER_CONFIGS[id];
    const seaRouteGeojson = await loadAndMergeData(cfg.geojsonPath, cfg.detailsPath, 'routeId');

    geoJsonDataCache[id] = seaRouteGeojson;

    map.addSource(id, { type: 'geojson', data: seaRouteGeojson });

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
}

async function addGeoJsonPortLayer() {
    // マーカー読み込み
    addMarker('anchor_marker', './img/anchor.png');
    var portGeojson = await loadData('./data/portData.geojson');

    // キャッシュに保存
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
            'text-font': ["NotoSansCJKjp-Regular"],
            'text-size': 12,
            'text-offset': [0, 0.8],
            'text-anchor': 'top'
        },
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function splitBusinessName(value) {
    const businessName = value || 'N/A';
    if (!businessName.includes('（')) {
        return {
            primary: businessName,
            secondary: '',
        };
    }

    const parts = businessName.split('（');
    return {
        primary: parts[0],
        secondary: (parts[1] || '').replace('）', ''),
    };
}

function toBlockLines(value, prefix = '') {
    if (!value) {
        return '';
    }

    return value.split(', ')
        .map((item) => `<span class="block">${prefix}${escapeHtml(item.trim())}</span>`)
        .join('');
}

function createDrawerAccentBar(color) {
    return `
        <div class="mb-3">
            <div style="height:4px; width:100%; background:${color}; border-radius:6px;"></div>
        </div>
    `;
}

function createDrawerSection(options) {
    const {
        iconClass,
        title,
        titleColorClass,
        iconColorClass,
        body,
    } = options;

    if (!body) {
        return '';
    }

    return `
        <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
            <h3 class="flex items-center justify-between text-xs font-semibold ${titleColorClass} w-24 min-w-[96px] text-center mr-2">
                <i class="${iconClass} fa-fw mr-1 ${iconColorClass}"></i><span class="mx-auto">${title}</span>
            </h3>
            ${body}
        </div>
    `;
}

function getLinkHostname(url) {
    try {
        return new URL(url).hostname;
    } catch (error) {
        return url;
    }
}

function buildSeaRouteSidebarContent(properties, sourceId) {
    const routeId = escapeHtml(properties.routeId || '');
    const lineId = escapeHtml(properties.lineId || '');
    const routeName = escapeHtml(properties.routeName || 'N/A');
    const sectionName = `${escapeHtml(properties.portName1 || 'N/A')}～${escapeHtml(properties.portName2 || 'N/A')}`;
    const url = properties.url || '';
    const linkDomain = escapeHtml(getLinkHostname(url));

    return `
        ${createDrawerAccentBar(properties.color || '#e5e7eb')}
        ${createDrawerSection({
            iconClass: 'fas fa-route',
            title: '航路',
            titleColorClass: 'text-blue-600',
            iconColorClass: 'text-blue-500',
            body: `<div class="text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors" onclick="window.zoomToRoute({routeId: '${routeId}', sourceId: '${sourceId}'})">${routeName}</div>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-map-pin',
            title: '選択部分',
            titleColorClass: 'text-green-600',
            iconColorClass: 'text-green-500',
            body: `<div class="text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors" onclick="window.zoomToRouteSection('${routeId}', '${lineId}', '${sourceId}')">${sectionName}</div>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-rotate',
            title: '運行頻度',
            titleColorClass: 'text-red-600',
            iconColorClass: 'text-red-500',
            body: `<div class="text-gray-800 text-xs">${toBlockLines(properties.freqInfo)}</div>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-info-circle',
            title: '情報',
            titleColorClass: 'text-yellow-600',
            iconColorClass: 'text-yellow-500',
            body: `<div class="text-gray-800 text-xs">${toBlockLines(properties.info)}</div>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-ship',
            title: '船舶',
            titleColorClass: 'text-purple-600',
            iconColorClass: 'text-purple-500',
            body: `<ul class="text-gray-800 text-xs">${toBlockLines(properties.shipName, '・')}</ul>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-link',
            title: 'リンク',
            titleColorClass: 'text-indigo-600',
            iconColorClass: 'text-indigo-500',
            body: url
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded">運行スケジュール - ${linkDomain}</a>`
                : '',
        })}
    `;
}

function buildPortSidebarContent(properties, googleMapsUrl) {
    return `
        ${createDrawerAccentBar('#505050')}
        ${createDrawerSection({
            iconClass: 'fas fa-map-marked-alt',
            title: '地図',
            titleColorClass: 'text-green-600',
            iconColorClass: 'text-green-500',
            body: `<a href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded">Googleマップで開く</a>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-info-circle',
            title: '情報',
            titleColorClass: 'text-yellow-600',
            iconColorClass: 'text-yellow-500',
            body: `<div class="text-gray-800 text-xs">${toBlockLines(properties.info)}</div>`,
        })}
    `;
}

/**
 * 航路ラインに関するイベントを追加
 * @param {string} id - 紐づけ元GeoJsonのID
 * @param {string} handleId - EventをHandleするID
 */
function addSeaRouteClickEvent(id, handleId = id) {
    map.on('click', handleId, (event) => {
        const properties = event.features[0].properties;
        const businessNameParts = splitBusinessName(properties.businessName);
        const sidebarContent = buildSeaRouteSidebarContent(properties, id);

        window.showDetailDrawerWithPinClear(
            sidebarContent,
            businessNameParts.primary,
            businessNameParts.secondary
        );
        gtag('event', 'marker_click', {
            'event_category': 'map',
            'event_label': properties.businessName,
            'value': 1
        });
    });
    map.on('mousemove', handleId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', handleId, () => {
        map.getCanvas().style.cursor = '';
    });
    eventHandle[id] = handleId;
}

/**
 * Portに関するイベントを追加
 * @param {string} id - 紐づけ元GeoJsonのID
 * @param {string} handleId - EventをHandleするID
 */
function addPortClickEvent(id, handleId = id) {
    map.on('click', handleId, (event) => {
        const properties = event.features[0].properties;
        const portName = properties.Name || properties.portName || 'N/A';

        // portNameに「港」や「桟橋」が含まれていない場合は「港」を追加
        const searchPortName = (portName.includes('港') || portName.includes('桟橋')) ? portName : `${portName}港`;
        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchPortName)}`;
        const sidebarContent = buildPortSidebarContent(properties, googleMapsUrl);

        window.showDetailDrawerWithPinClear(
            sidebarContent,
            portName,
            "港湾情報"
        );
    });
    map.on('mousemove', handleId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', handleId, () => {
        map.getCanvas().style.cursor = '';
    });
    eventHandle[id] = handleId;
}

/**
 * クリックしたときのイベントを削除
 * @param {string} id - 紐づけ元GeoJsonのID
 */
export function removeClickEvent(id) {
    var handleId = eventHandle[id];
    if (handleId) {
        map.off('click', handleId);
    }
}

/**
 * なにもないところをクリックしたときに既存のポップアップを削除
 */
export function addResetClickEvent() {
    map.on('click', (event) => {
        const validIds = Object.values(eventHandle);
        const features = map.queryRenderedFeatures(event.point);
        if (!features.find(feature => validIds.includes(feature.layer.id))) {
            if (window.hideSidebar) window.hideSidebar();
            // ハイライトも削除
            removeRouteHighlight();
        }
    });
}

/**
 * GeoJSON データを取得する
 * @param {string} sourceId - ソース ID
 * @returns {Object|null} GeoJSON オブジェクト または null
 */
function getGeoJsonData(sourceId) {
    let data = geoJsonDataCache[sourceId];

    if (!data) {
        const source = map.getSource(sourceId);
        if (!source) {
            console.error('Source not found:', sourceId);
            return null;
        }

        data = source._data;

        if (!data || !data.features) {
            const features = map.querySourceFeatures(sourceId);
            if (!features || features.length === 0) {
                console.error('No features found for source:', sourceId);
                return null;
            }

            data = {
                type: 'FeatureCollection',
                features: features
            };
        }
    }

    if (!data.features) {
        console.error('No features found in data:', sourceId);
        return null;
    }

    return data;
}

/**
 * パラメータから一致する feature を検索する
 * @param {Array} features - 検索対象の feature 配列
 * @param {string} routeName - 航路名
 * @param {string} routeId - 航路 ID
 * @param {string} lineId - 区間 ID
 * @returns {Object} { features, searchType } 一致 feature 群と検索タイプ
 */
function findMatchingFeatures(features, routeName, routeId, lineId) {
    let matchingFeatures = [];
    let searchType = '';

    if (routeName) {
        matchingFeatures = features.filter(feature =>
            feature.properties && feature.properties.routeName === routeName
        );
        searchType = 'routeName';
    } else if (routeId && lineId) {
        matchingFeatures = features.filter(feature =>
            feature.properties &&
            String(feature.properties.routeId) === String(routeId) &&
            String(feature.properties.lineId) === String(lineId)
        );
        searchType = 'routeSection';

        if (matchingFeatures.length === 0) {
            matchingFeatures = features.filter(feature =>
                feature.properties &&
                String(feature.properties.routeId) === String(routeId)
            );
            searchType = 'routeOnly';
        }
    } else if (routeId) {
        matchingFeatures = features.filter(feature =>
            feature.properties &&
            String(feature.properties.routeId) === String(routeId)
        );
        searchType = 'routeOnly';
    }

    return { features: matchingFeatures, searchType };
}

/**
 * feature 群から境界ボックスを計算する
 * @param {Array} features - feature 群
 * @returns {Object|null} { minLng, maxLng, minLat, maxLat } または null
 */
function calculateBounds(features) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    features.forEach(feature => {
        if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach(coord => {
                const [lng, lat] = coord;
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
            });
        } else if (feature.geometry.type === 'MultiLineString') {
            feature.geometry.coordinates.forEach(lineString => {
                lineString.forEach(coord => {
                    const [lng, lat] = coord;
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                });
            });
        }
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
 * @returns {Object} パディングオブジェクト
 */
function calculateFitBoundsPadding() {
    const padding = {
        top: 50,
        left: 50,
        right: 50,
        bottom: 50
    };

    const detailDrawer = document.getElementById('detail-drawer');
    if (detailDrawer && !detailDrawer.classList.contains('hidden')) {
        if (window.innerWidth >= 768) {
            const drawerWidth = detailDrawer.offsetWidth;
            padding.left = drawerWidth + 30;
        } else {
            const drawerHeight = detailDrawer.offsetHeight;
            padding.bottom = drawerHeight + 30;
        }
    }

    return padding;
}

/**
 * 航路や航路区間に移動する統一関数をグローバルに公開
 */
window.zoomToRoute = function(params) {
    try {
        const { routeName, routeId, lineId, sourceId } = params;

        const data = getGeoJsonData(sourceId);
        if (!data) return;

        const { features: matchingFeatures, searchType } = findMatchingFeatures(
            data.features,
            routeName,
            routeId,
            lineId
        );

        if (matchingFeatures.length === 0) {
            console.error('No matching features found for:', params);
            return;
        }

        const bounds = calculateBounds(matchingFeatures);
        if (!bounds) return;

        const padding = calculateFitBoundsPadding();

        map.fitBounds([
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat]
        ], {
            padding: padding,
            duration: 1000
        });

        addRouteHighlight(matchingFeatures, sourceId);

        if (typeof gtag !== 'undefined') {
            const eventLabel = routeName || `${routeId}-${lineId}`;
            const eventType = searchType === 'routeName' ? 'route_zoom' : 'route_section_zoom';
            gtag('event', eventType, {
                'event_category': 'map',
                'event_label': eventLabel,
                'value': 1
            });
        }

    } catch (error) {
        console.error('Error in zoomToRoute:', error);
    }
};

/**
 * 航路のハイライト表示を追加
 */
function addRouteHighlight(features, sourceId) {
    // 既存のハイライトを削除
    removeRouteHighlight();

    // ハイライト用のGeoJSONデータを作成
    const highlightData = {
        type: 'FeatureCollection',
        features: features
    };

    // ハイライト用ソースを追加
    map.addSource('route-highlight', {
        type: 'geojson',
        data: highlightData
    });

    // ハイライト用レイヤーを追加（航路の色で太い線）
    map.addLayer({
        id: 'route-highlight-line',
        type: 'line',
        source: 'route-highlight',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#FF6B35'],
            'line-width': 8,
            'line-opacity': 0.6
        }
    });

    // 別の航路をクリックするまでハイライトを維持
}

/**
 * 航路のハイライト表示を削除
 */
function removeRouteHighlight() {
    if (map.getLayer('route-highlight-line')) {
        map.removeLayer('route-highlight-line');
    }
    if (map.getSource('route-highlight')) {
        map.removeSource('route-highlight');
    }
}

// ハイライト削除機能をグローバルに公開
window.removeRouteHighlight = removeRouteHighlight;

// 既存の関数呼び出しとの互換性を保持するためのラッパー関数
window.zoomToRouteSection = function(routeId, lineId, sourceId) {
    window.zoomToRoute({ routeId, lineId, sourceId });
};

/**
 * 休止中航路の表示・非表示を切り替える
 * @param {boolean} showSuspended - 休止中航路を表示するかどうか
 */
// レイヤー suffix ごとの filter 定義
// suffix に応じて、showSuspended の真偽で使い分ける filter を定義
const LAYER_FILTER_MAP = {
    '_outline': {
        show: null,
        hide: ['!=', ['get', 'note'], 'suspend']
    },
    '_solidline': {
        show: ['==', ['get', 'note'], null],
        hide: ['==', ['get', 'note'], null]
    },
    '_dashline': {
        show: ['==', ['get', 'note'], 'season'],
        hide: ['==', ['get', 'note'], 'season']
    },
    '_thinline': {
        show: ['==', ['get', 'note'], 'suspend'],
        hide: ['==', ['get', 'note'], 'never_match']
    },
    '_name': {
        show: null,
        hide: ['!=', ['get', 'note'], 'suspend']
    }
};

/**
 * suffix と表示フラグから filter を取得する
 * @param {string} suffix - レイヤー suffix
 * @param {boolean} showSuspended - 休止中航路を表示するか
 * @returns {Array|null} MapLibre GL filter または null
 */
function getLayerFilter(suffix, showSuspended) {
    const filterDef = LAYER_FILTER_MAP[suffix];
    if (!filterDef) return null;
    return showSuspended ? filterDef.show : filterDef.hide;
}

/**
 * 休止中航路の表示・非表示を切り替える
 * @param {boolean} showSuspended - 休止中航路を表示するかどうか
 */
export function toggleSuspendedRoutes(showSuspended) {
    showSuspendedRoutes = showSuspended;

    const routeTypes = ['geojson_sea_route', 'geojson_international_sea_route', 'geojson_KR_sea_route', 'geojson_limited_sea_route'];
    const layerSuffixes = ['_outline', '_solidline', '_dashline', '_thinline', '_name'];

    routeTypes.forEach(routeType => {
        layerSuffixes.forEach(suffix => {
            const layerId = routeType + suffix;
            if (map.getLayer(layerId)) {
                const filter = getLayerFilter(suffix, showSuspended);
                map.setFilter(layerId, filter);
            }
        });
    });
}
