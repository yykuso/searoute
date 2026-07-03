/**
 * メインアプリケーションモジュール
 *
 * 責務:
 * - MapLibre GL の初期化とマップの基本制御
 * - 背景地図（ベースマップ）の切り替え
 * - レイヤーの追加・削除・順序管理
 * - グローバルマップインスタンスの管理
 * - UI制御システムの初期化
 */

import layersControl from './layersControl.js';
import routeFilterControl from './routeFilterControl.js';
import hamburgerControl from './hamburgerControl.js';
import { addRasterLayer } from './rasterLayers.js';
import { addGeoJsonLayer, addMarker, addResetClickEvent, removeClickEvent, setRouteFilters, initShareFromUrl } from './geoJsonLayers.js';
import { copyShareUrl, getShareQueryContext, getShareTargetLayerId, setDrawerContext } from './utils/shareDrawer.js';
import { showDetailDrawer } from './detailDrawer.js';
import { initCenterZoom, setCookie, getCookie } from './cookieControl.js';
import { showContextMenu, hideContextMenu } from './contextMenu.js';
import { createLayersConfig } from './layerConfig.js';
import { setupOutsideClickListener } from './utils/outsideClickHandler.js';

/* マップの命名規則
    VectorTile = 背景マップ   = style
    RasterTile = オーバーレイ = layer = id: 'tile_*'
    GeoJSON    = オーバーレイ = layer = id: 'geojson_*'
*/

// Map本体
export var map = null;

// マップスタイル
export const mapStyle = {
    "EMPTY_MAP": 0,
    "OSM_BRIGHT_MAP": 10,
    "OSM_PLANET_MAP": 11,
    "OTM_MAP": 12,
    "OPEN_SEA_MAP": 13,
    "RAILWAY_MAP": 14,
    "GSI_STD_MAP": 20,
    "GSI_PALE_MAP": 21,
    "GSI_BLANK_MAP": 22,
    "GSI_PHOTO_MAP": 23,
    "GSI_RELIEF_MAP": 24,
    "TRANSPORT_MAP": 30,
    "ESRI_PHOTO_MAP": 40,
    "OSM_CUSTOM_MAP": 90,
}

// レイヤーの表示優先順位
export const layerPriorities = [
    'tile_gsi_photo',
    'tile_gsi_relief',
    'tile_esriimagery',
    'tile_railwaymap',
    'tile_openseamap',
    'geojson_sea_route',
    'geojson_international_sea_route',
    'geojson_limited_sea_route',
    'geojson_port',
];

// 背景地図スタイル定義
const MAP_STYLE_CONFIG = {
    [mapStyle["OSM_PLANET_MAP"]]: {
        url: "https://tile.openstreetmap.jp/styles/openmaptiles/style.json",
        rasterLayerId: null
    },
    [mapStyle["OSM_BRIGHT_MAP"]]: {
        url: "https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json",
        rasterLayerId: null
    },
    [mapStyle["GSI_STD_MAP"]]: {
        url: "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/std.json",
        rasterLayerId: null
    },
    [mapStyle["GSI_PALE_MAP"]]: {
        url: "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/pale.json",
        rasterLayerId: null
    },
    [mapStyle["GSI_BLANK_MAP"]]: {
        url: "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/blank.json",
        rasterLayerId: null
    },
    [mapStyle["OSM_CUSTOM_MAP"]]: {
        url: "./style/maptiler-basic-ja-custom.json",
        rasterLayerId: null
    },
    [mapStyle["OTM_MAP"]]: {
        url: "./style/empty.json",
        rasterLayerId: "tile_otm"
    },
    [mapStyle["TRANSPORT_MAP"]]: {
        url: "./style/empty.json",
        rasterLayerId: "tile_transportmap"
    },
    [mapStyle["ESRI_PHOTO_MAP"]]: {
        url: "./style/empty.json",
        rasterLayerId: "tile_esriimagery"
    },
    [mapStyle["EMPTY_MAP"]]: {
        url: "./style/empty.json",
        rasterLayerId: null
    }
};

// 現在の状態
var currentMap = null;
var currentLayer = [];
var defaultMap = mapStyle["EMPTY_MAP"];
var defaultLayer = ["geojson_sea_route"];
let routeFilterWindowUnsubscriber = null;
let currentRouteFilters = null;

const DEFAULT_ROUTE_FILTERS = {
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

function setupPmtilesProtocol() {
    window.__searoutePmtilesReady = false;

    if (!window.pmtiles || !window.maplibregl) {
        return;
    }

    try {
        const protocol = new window.pmtiles.Protocol();
        window.maplibregl.addProtocol('pmtiles', protocol.tile);
        window.__searoutePmtilesReady = true;
    } catch (error) {
        console.warn('PMTiles protocol setup failed:', error);
    }
}

// Cookieから情報を取得
if (getCookie("currentMap")) {
    defaultMap = parseInt(getCookie("currentMap"));
}
if (getCookie("currentLayer")) {
    defaultLayer = getCookie("currentLayer").split(',');
}

// スマホにおける長押しを検出するための変数
let touchTimeout;
let isDragging = false;
let mapResizeBurstTimerIds = [];
let mapContainerResizeObserver = null;

function requestMapResize() {
    if (!map) {
        return;
    }

    requestAnimationFrame(() => {
        if (!map) {
            return;
        }

        try {
            // canvas の inline size が壊れた状態を含め、描画サイズを再同期する
            map.resize();
        } catch (error) {
            console.warn('Map resize failed:', error);
        }
    });
}

function scheduleMapResizeBurst() {
    mapResizeBurstTimerIds.forEach((timerId) => clearTimeout(timerId));
    mapResizeBurstTimerIds = [];

    [0, 120, 360].forEach((delay) => {
        const timerId = setTimeout(() => requestMapResize(), delay);
        mapResizeBurstTimerIds.push(timerId);
    });
}

function watchMapContainerResize() {
    if (mapContainerResizeObserver) {
        return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer || typeof ResizeObserver === 'undefined') {
        return;
    }

    mapContainerResizeObserver = new ResizeObserver(() => {
        requestMapResize();
    });
    mapContainerResizeObserver.observe(mapContainer);
}

function bindMapResizeGuards() {
    window.addEventListener('load', scheduleMapResizeBurst);
    window.addEventListener('pageshow', scheduleMapResizeBurst);
    window.addEventListener('orientationchange', scheduleMapResizeBurst);
    window.addEventListener('resize', requestMapResize, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleMapResizeBurst();
        }
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', requestMapResize, { passive: true });
    }
}

// 初期化
initMap();
bindMapResizeGuards();

// styleファイルの読み込み後に発火
map.once('styledata', () => {
    // レイヤー設定を作成
    const layersConfig = createLayersConfig(mapStyle, defaultLayer, isIdInLayer);

    // Layers Control
    let layers = new layersControl({
        layers: layersConfig,
        defaultBaseLayer: defaultMap,
    });
    map.addControl(layers, 'top-right');
    map.addControl(new routeFilterControl(), 'top-right');

});

// マップの初期化
function initMap() {
    setupPmtilesProtocol();

    // マップの中心・拡大をCookieから取得して初期化
    const [mapCenter, mapZoom] = initCenterZoom();

    // mapLibreGLの初期化
    map =  new maplibregl.Map({
        container: 'map',
        style: getMapStyle(currentMap), // 地図のスタイル
        center: mapCenter, // 中心座標
        zoom: mapZoom, // ズームレベル
        pitch: 0 // 傾き
    });

    // コントロールを追加
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    map.addControl(new hamburgerControl(), 'top-right');

    // 画面移動後の処理
    addMoveEndEvent();

    // 既存のポップアップを削除するイベント
    addResetClickEvent();

    // 長押し・右クリックのイベントをマップ初期化直後に登録する。
    // map.on('load') や requestIdleCallback で遅延させると iOS Safari では
    // タッチリスナー登録前にタップされた際に発火しないため、ここで即時登録する。
    addContextEvent();

    // マップの初期化完了時にUI要素を表示 & URLクエリからドロワーを復元
    map.on('load', async () => {
        watchMapContainerResize();
        scheduleMapResizeBurst();

        const detailDrawer = document.getElementById('detail-drawer');
        if (detailDrawer) detailDrawer.style.display = '';

        // ジオコーダーは初期表示に不要なため requestIdleCallback で遅延登録する
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => map.addControl(addGeocoderControl(), 'top-left'));
        } else {
            setTimeout(() => map.addControl(addGeocoderControl(), 'top-left'), 100);
        }

        // 共有復元はレイヤー有効化の待機でブロックさせず、先に実行する
        try {
            await ensureSharedLayerEnabled();
        } catch (error) {
            console.warn('Failed to enable shared layer:', error);
        }
        await initShareFromUrl();
    });

    // シェアボタンをグローバルに公開
    window.copyDrawerShareUrl = copyShareUrl;
}

/**
 * 共有 URL の対象レイヤーを事前に有効化する
 */
async function ensureSharedLayerEnabled() {
    const shareContext = getShareQueryContext();
    if (!shareContext) {
        return;
    }

    const targetLayerId = getShareTargetLayerId(shareContext);

    if (!targetLayerId || currentLayer.includes(targetLayerId)) {
        syncLayerControlState(targetLayerId, true);
        return;
    }

    await addOverLayer(targetLayerId);
    syncLayerControlState(targetLayerId, true);
}

/**
 * レイヤーコントロールのチェック状態を同期する
 * @param {string} layerId
 * @param {boolean} checked
 */
function syncLayerControlState(layerId, checked) {
    if (!layerId) {
        return;
    }

    const input = document.getElementById(layerId);
    if (!input) {
        return;
    }

    input.checked = checked;
    const layerItem = input.closest('.layer-item');
    if (layerItem) {
        layerItem.classList.toggle('checked', checked);
    }
}

/**
 * マップのスタイルファイルを取得する関数
 * @param {number} style - Style ID
 * @returns {string} - Styleファイル
 */
function getMapStyle(style) {
    const config = MAP_STYLE_CONFIG[style] || MAP_STYLE_CONFIG[mapStyle["EMPTY_MAP"]];
    return config.url;
}

// 背景マップの更新
export function updateBaseMap(afterMap) {

    // 同じマップの場合は何もしない
    if (currentMap == afterMap) {
        return;
    }

    // 現在がrasterの場合はレイヤーを削除
    const currentConfig = MAP_STYLE_CONFIG[currentMap] || {};
    if (currentConfig.rasterLayerId) {
        removeLayerSource(currentConfig.rasterLayerId, currentConfig.rasterLayerId);
    }

    // マップスタイルを変更
    changeStyle(getMapStyle(afterMap));
    currentMap = afterMap;

    // rasterの場合はレイヤーを追加
    const afterConfig = MAP_STYLE_CONFIG[afterMap] || {};
    if (afterConfig.rasterLayerId) {
        map.once('styledata', () => {
            addRasterLayer(afterMap);
            updateLayerOrder();
        });
    }

    // Cookieに保存
    setCookie("currentMap", currentMap, 30);

}

// スタイルの変更
async function changeStyle(newStyleJson) {

    // OverLayer(Source,Layer)を保持する
    map.setStyle(newStyleJson, {
        transformStyle: (previousStyle, nextStyle) => {
            var custom_layers = previousStyle.layers.filter(layer => {
                return layer.id.startsWith('geojson') || layer.id.startsWith('tile');
            });
            var layers = nextStyle.layers.concat(custom_layers);

            var sources = nextStyle.sources;
            for (const [key, value] of Object.entries(previousStyle.sources)) {
                if (key.startsWith('geojson') || key.startsWith('tile')) {
                    sources[key] = value;
                }
            }

            return {
                ...nextStyle,
                sources: sources,
                layers: layers,
            };
        },
        diff: !currentMap,
    });

    reAddMaker();
}

// 画像データを再読み込み
function reAddMaker() {
    if (currentLayer.includes('geojson_port')) {
        addMarker('anchor_marker', './img/anchor.png');
    }
}

// レイヤーの表示順を更新
function updateLayerOrder(retryCount = 0, maxRetries = 30, waitUntil = 1000) {
    // 最大リトライ回数を超えた場合は終了
    if (retryCount >= maxRetries) {
        return;
    }

    // 各レイヤーの読み込み状態を確認
    for (const layerId of layerPriorities) {
        if (currentLayer.includes(layerId)) {
            // ソースが存在し、読み込まれているか確認
            const sourceId = layerId;
            if (!map.getSource(sourceId) || !map.isSourceLoaded(sourceId)) {
                // 再試行
                setTimeout(() => {
                    updateLayerOrder(retryCount + 1, maxRetries);
                }, waitUntil);
                return;
            }
        }
    }

    // すべてのレイヤーが読み込まれていれば順序を更新
    layerPriorities.forEach((layerId) => {
        if (currentLayer.includes(layerId)) {
            map.getStyle().layers.forEach((layer) => {
                if (layer.id.startsWith(layerId)) {
                    map.moveLayer(layer.id);
                }
            });
        }
    });
}

// Tile レイヤーID と mapStyle の対応
const TILE_LAYER_MAP = {
    'tile_gsi_photo': mapStyle["GSI_PHOTO_MAP"],
    'tile_gsi_relief': mapStyle["GSI_RELIEF_MAP"],
    'tile_esriimagery': mapStyle["ESRI_PHOTO_MAP"],
    'tile_openseamap': mapStyle["OPEN_SEA_MAP"],
    'tile_railwaymap': mapStyle["RAILWAY_MAP"],
};

function removeLayerSource(layerId, sourceId = layerId) {
	removeLayer(layerId);
	removeSource(sourceId);
}

function removeLayer(layerId) {
    const layers = map.getStyle().layers;
    layers.forEach((layer) => {
        if (layer.id.startsWith(layerId)) {
            map.removeLayer(layer.id);
        }
    });
    // currentLayerから削除
    currentLayer = currentLayer.filter((layer) => layer !== layerId);
}

function removeSource(sourceId) {
	if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
    }
}

/**
 * OverLayer(Tile/GeoJson)を追加する関数
 * @param {string} layerId - OverLayerID
 */
export async function addOverLayer(layerId) {
    if (currentLayer.includes(layerId)) {
        console.log('[Warning] Layer already exists : addOverLayer( ' + layerId + ' )');
        return;
    }

    let layerAdded = true;

    if (layerId.startsWith('tile')) {
        const mapStyleId = TILE_LAYER_MAP[layerId];
        if (mapStyleId === undefined) {
            console.log('[Error] Layer not found : addOverLayer( ' + layerId + ' )');
            return;
        }
        addRasterLayer(mapStyleId);
    } else if (layerId.startsWith('geojson')) {
        layerAdded = await addGeoJsonLayer(layerId);
    } else {
        console.log('[Error] Layer not found : addOverLayer( ' + layerId + ' )');
        return;
    }

    if (!layerAdded) {
        return;
    }

    // 追加後の後処理
    await new Promise((resolve) => {
        map.once('idle', () => {
            currentLayer.push(layerId);
            updateLayerOrder();

            // Cookieに保存
            setCookie("currentLayer", currentLayer, 30);
            resolve();
        });
    });
}

/**
 * OverLayer(Tile/GeoJson)を削除する関数
 * @param {*} layerId - OverLayerID
 * @param {*} sourceId - OverLayerSourceID
 */
export async function removeOverLayer(layerId, sourceId = layerId) {
    if (!currentLayer.includes(layerId)) {
        // Error
        console.log('[Warning] Layer already not exists : removeOverLayer( ' + layerId + ' )');
        return;
    } else {
        if (layerId.startsWith('geojson')) {
            removeClickEvent(layerId);
        }
        removeLayerSource(layerId, sourceId);
    }

    // Cookieに保存
    setCookie("currentLayer", currentLayer, 30);
}

/**
 * defaultLayerにIDの値が存在するかをチェックする関数
 * @param {string} layer - チェックするレイヤー配列
 * @param {string} id - チェックするレイヤーID
 * @returns {boolean} - 存在する場合はtrue、そうでなければfalse
 */
function isIdInLayer(Layer, id) {
    return Layer && Layer.includes(id);
}

/**
 * 検索バーを追加する関数
 * MapLibreGeocoderを使用して、地名検索を行う
 */
function addGeocoderControl() {
    const geocoderApi = {
        forwardGeocode: async (config) => {
            const features = [];
            try {
                const request = `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1`;
                const response = await fetch(request);
                const geojson = await response.json();
                for (const feature of geojson.features) {
                    const center = [
                        feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
                        feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
                    ];
                    const point = {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: center
                        },
                        place_name: feature.properties.display_name,
                        properties: feature.properties,
                        text: feature.properties.display_name,
                        place_type: ['place'],
                        center
                    };
                    features.push(point);
                }
            } catch (e) {
                console.log(`[Error] Failed to forwardGeocode with error: ${e}`);
            }

            return {
                features
            };
        }
    };

    const geocoder = new MaplibreGeocoder(geocoderApi, {
        maplibregl: maplibregl,
        marker: {
            color: 'red'
        },
        placeholder: 'Search',
        collapsed: true,
        limit: 10,
        showResultsWhileTyping: true,
        OptionalminLength: 3,
        zoom: 12
    });

    // geocoderにクラスを追加
    geocoder.onAdd = function(map) {
        const container = MaplibreGeocoder.prototype.onAdd.call(this, map);
        container.classList.add('maplibregl-ctrl-group');
        return container;
    };

    return geocoder;
}

/**
 * MoveEndイベントを追加する関数
 * マップの移動が終了したときに、マップの中心座標とズームレベルをCookieに保存する
 */
function addMoveEndEvent(){
    map.on("moveend", () => {
        const center = map.getCenter();
        const zoom = map.getZoom();

        // Cookieに保存
        setCookie("mapCenter", JSON.stringify([center.lng, center.lat]), 30);
        setCookie("mapZoom", zoom, 30);
    });
}

/**
 * 長押し・右クリックのインタラクションを登録する
 *
 * iOS Safari の制約:
 * - TouchEvent はイベントプールで再利用されるため、コールバック内で
 *   e.touches[0] を参照できない → touchstart 時点で座標を退避する
 * - 長押しすると iOS が touchcancel を発火してコールアウトを表示しようとする
 *   → CSS で `-webkit-touch-callout: none` を #map に付与して抑制する
 * - map.on('load') 以降に登録すると読み込み直後のタップに間に合わない
 *   → initMap() から直接呼び出して即時登録する
 */
function addContextEvent() {
    const mapDiv = document.getElementById('map');

    // --- 長押しピンの管理 ---
    let longPressMarker = null;

    function removeLongPressMarker() {
        longPressMarker?.remove();
        longPressMarker = null;
    }

    function showDetailDrawerWithPinClear(content, title, subtitle) {
        removeLongPressMarker();
        showDetailDrawer(content, title, subtitle);
    }

    function openCoordinateDrawer(latValue, lngValue) {
        const lat = Number(latValue).toFixed(5);
        const lng = Number(lngValue).toFixed(5);

        removeLongPressMarker();
        longPressMarker = new maplibregl.Marker({ color: 'red' })
            .setLngLat([parseFloat(lng), parseFloat(lat)])
            .addTo(map);

        setDrawerContext({ type: 'coord', lat: parseFloat(lat), lng: parseFloat(lng) });

        const sidebarContent = `
            <div class="mb-3">
                <div style="height:4px; width:100%; background:#60a5fa; border-radius:6px;"></div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-blue-600 w-24 min-w-24 text-center mr-2">
                    <i class="fas fa-location-dot fa-fw mr-1 text-blue-500"></i><span class="mx-auto">住所</span>
                </h3>
                <span id="reverse-geocode-address" class="block text-xs text-gray-800 mt-1">取得中...</span></div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-green-600 w-24 min-w-24 text-center mr-2">
                    <i class="fas fa-map-location-dot fa-fw mr-1 text-green-500"></i><span class="mx-auto">リンク</span>
                </h3>
                <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-gray-900 transition-all">ここをGoogleマップで開く</a>
            </div>
        `;

        showDetailDrawer(sidebarContent, `${lat}, ${lng}`, '座標情報');

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`)
            .then(res => res.json())
            .then(data => {
                let addr = data.display_name || '住所情報なし';
                if (addr && addr !== '住所情報なし') {
                    addr = addr.split(',').map(s => s.trim()).reverse().join(' ');
                }
                const addrElem = document.getElementById('reverse-geocode-address');
                if (addrElem) addrElem.textContent = addr;
            })
            .catch(() => {
                const addrElem = document.getElementById('reverse-geocode-address');
                if (addrElem) addrElem.textContent = '住所取得失敗';
            });
    }

    // geoJsonLayers.js 内のクリックハンドラーから参照されるためグローバルに公開する
    window.showDetailDrawerWithPinClear = showDetailDrawerWithPinClear;
    window.removeLongPressMarker = removeLongPressMarker;
    window.openCoordinateDrawer = openCoordinateDrawer;

    // PC: 右クリックでコンテキストメニュー
    mapDiv.addEventListener('contextmenu', (e) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, map);
    });

    // モバイル: 長押し（700ms）で座標ドロワーを表示
    const LONG_PRESS_MS = 700;
    const DRAG_THRESHOLD_PX = 10;
    let touchTimeout = null;
    let isDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;

    mapDiv.addEventListener('touchstart', (e) => {
        if (!window.matchMedia('(pointer: coarse)').matches) return;
        if (e.touches.length !== 1) return;
        isDragging = false;
        // iOS の TouchEvent はプールで再利用されるため、コールバック内では
        // e.touches[0] が空になっている。座標をここで変数に退避する。
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchTimeout = setTimeout(() => {
            if (!isDragging) {
                const point = map.unproject([touchStartX, touchStartY]);
                openCoordinateDrawer(point.lat, point.lng);
            }
        }, LONG_PRESS_MS);
    }, { passive: true });

    mapDiv.addEventListener('touchmove', (e) => {
        if (isDragging) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
            isDragging = true;
            clearTimeout(touchTimeout);
        }
    }, { passive: true });

    mapDiv.addEventListener('touchend',   () => clearTimeout(touchTimeout), { passive: true });
    mapDiv.addEventListener('touchcancel', () => clearTimeout(touchTimeout), { passive: true });

    // ドロワーを閉じたらピンも削除する
    document.getElementById('detail-drawer-close-btn').addEventListener('click', removeLongPressMarker);
}

// 設定機能の初期化
function initSettings() {
    const filterInputs = document.querySelectorAll('[data-route-filter-group][data-route-filter-key]');

    if (filterInputs.length === 0) {
        console.warn('route filter inputs not found');
        return;
    }

    currentRouteFilters = getInitialRouteFilters();
    syncRouteFilterInputs(currentRouteFilters);
    setRouteFilters(currentRouteFilters);
    updateRouteFilterToggleState(currentRouteFilters);

    filterInputs.forEach((input) => {
        if (input.dataset.routeFilterBound === 'true') {
            return;
        }

        input.dataset.routeFilterBound = 'true';
        input.addEventListener('change', (event) => {
            const { routeFilterGroup, routeFilterKey } = event.target.dataset;
            if (!routeFilterGroup || !routeFilterKey) {
                return;
            }

            currentRouteFilters = {
                ...currentRouteFilters,
                [routeFilterGroup]: {
                    ...currentRouteFilters[routeFilterGroup],
                    [routeFilterKey]: event.target.checked,
                },
            };

            applyRouteFilterState(currentRouteFilters);
        });
    });
}

function cloneDefaultRouteFilters() {
    return JSON.parse(JSON.stringify(DEFAULT_ROUTE_FILTERS));
}

function normalizeRouteFilters(filters) {
    const normalized = cloneDefaultRouteFilters();

    Object.keys(normalized).forEach((group) => {
        Object.keys(normalized[group]).forEach((key) => {
            normalized[group][key] = Boolean(filters?.[group]?.[key]);
        });
    });

    return normalized;
}

function isDefaultRouteFilters(filters) {
    const normalized = normalizeRouteFilters(filters);

    return Object.keys(DEFAULT_ROUTE_FILTERS).every((group) => {
        return Object.keys(DEFAULT_ROUTE_FILTERS[group]).every((key) => {
            return normalized[group][key] === DEFAULT_ROUTE_FILTERS[group][key];
        });
    });
}

function updateRouteFilterToggleState(filters) {
    const filterToggle = document.querySelector('.maplibregl-ctrl-filter-toggle');
    if (!filterToggle) {
        return;
    }

    filterToggle.classList.toggle('route-filter-active', !isDefaultRouteFilters(filters));
}

function getLegacyRouteFilters() {
    const savedMode = getCookie('routeFilterMode');
    const legacyShowSuspended = getCookie('showSuspendedRoutes') === 'true';
    const filters = cloneDefaultRouteFilters();

    if (legacyShowSuspended) {
        filters.status.suspend = true;
    }

    if (savedMode === 'all') {
        filters.status.suspend = true;
    } else if (savedMode === 'suspend') {
        filters.status.active = false;
        filters.status.season = false;
        filters.status.suspend = true;
    } else if (savedMode === 'car') {
        filters.carriage.car = true;
    } else if (savedMode === 'bike') {
        filters.carriage.bike = true;
    } else if (savedMode === 'bicycle') {
        filters.carriage.bicycle = true;
    }

    return filters;
}

function getInitialRouteFilters() {
    const savedFilters = getCookie('routeFilters');

    if (savedFilters) {
        try {
            return normalizeRouteFilters(JSON.parse(savedFilters));
        } catch (error) {
            console.warn('failed to parse routeFilters cookie:', error);
        }
    }

    return normalizeRouteFilters(getLegacyRouteFilters());
}

function syncRouteFilterInputs(filters) {
    document.querySelectorAll('[data-route-filter-group][data-route-filter-key]').forEach((input) => {
        const { routeFilterGroup, routeFilterKey } = input.dataset;
        input.checked = Boolean(filters?.[routeFilterGroup]?.[routeFilterKey]);
    });
}

function applyRouteFilterState(filters) {
    const normalizedFilters = normalizeRouteFilters(filters);
    currentRouteFilters = normalizedFilters;
    syncRouteFilterInputs(normalizedFilters);
    setRouteFilters(normalizedFilters);
    updateRouteFilterToggleState(normalizedFilters);
    setCookie('routeFilters', encodeURIComponent(JSON.stringify(normalizedFilters)), 365);
    setCookie('showSuspendedRoutes', normalizedFilters.status.suspend.toString(), 365);
}

function openRouteFilterWindow() {
    const filterWindow = document.getElementById('settings-window');
    if (!filterWindow) {
        return;
    }

    filterWindow.style.display = 'block';

    if (routeFilterWindowUnsubscriber) {
        routeFilterWindowUnsubscriber();
    }

    routeFilterWindowUnsubscriber = setupOutsideClickListener(
        filterWindow,
        () => {
            closeRouteFilterWindow();
        },
        { delay: 100 }
    );
}

function closeRouteFilterWindow() {
    const filterWindow = document.getElementById('settings-window');
    if (!filterWindow) {
        return;
    }

    filterWindow.style.display = 'none';

    if (routeFilterWindowUnsubscriber) {
        routeFilterWindowUnsubscriber();
        routeFilterWindowUnsubscriber = null;
    }
}

function toggleRouteFilterWindow() {
    const filterWindow = document.getElementById('settings-window');
    if (!filterWindow) {
        return;
    }

    if (filterWindow.style.display === 'block') {
        closeRouteFilterWindow();
        return;
    }

    openRouteFilterWindow();
}

window.openRouteFilterWindow = openRouteFilterWindow;
window.closeRouteFilterWindow = closeRouteFilterWindow;
window.toggleRouteFilterWindow = toggleRouteFilterWindow;

// ページ読み込み時に設定を初期化
document.addEventListener('DOMContentLoaded', () => {
    // マップが読み込まれてから設定を適用
    if (map && map.loaded()) {
        initSettings();
    } else {
        const checkMapLoaded = () => {
            if (map && map.loaded()) {
                initSettings();
            } else {
                setTimeout(checkMapLoaded, 100);
            }
        };
        checkMapLoaded();
    }
});
