import layersControl from './layersControl.js';
import hamburgerControl from './hamburgerControl.js';
import { addRasterLayer } from './rasterLayers.js';
import { addGeoJsonLayer, addMarker, addResetClickEvent, toggleSuspendedRoutes } from './geoJsonLayers.js';
import { showDetailDrawer } from './detailDrawer.js';
import { initCenterZoom, setCookie, getCookie } from './cookieControl.js';
import { showContextMenu, hideContextMenu } from './contextMenu.js';
import { createLayersConfig } from './layerConfig.js';

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

// 現在の状態
var currentMap = null;
var currentLayer = [];
var defaultMap = mapStyle["EMPTY_MAP"];
var defaultLayer = ["geojson_sea_route"];

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

// 初期化
initMap();

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

});

// マップの初期化
function initMap() {
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
    map.addControl(addGeocoderControl(), 'top-left');

    // 画面移動後の処理
    addMoveEndEvent();

    // コンテキストメニューイベントの追加
    addContextEvent();

    // 既存のポップアップを削除するイベント
    addResetClickEvent();

    // マップの初期化完了時にUI要素を表示
    map.on('load', () => {
        const detailDrawer = document.getElementById('detail-drawer');
        if (detailDrawer) detailDrawer.style.display = '';
    });
}

/**
 * マップのスタイルファイルを取得する関数
 * RasterLayerの場合はEMPTYを返す
 * @param {number} style - Style ID
 * @returns {string} - Styleファイル
 */
function getMapStyle(style) {
	switch (style) {
		case mapStyle["OSM_PLANET_MAP"]:
			return "https://tile.openstreetmap.jp/styles/openmaptiles/style.json";
		case mapStyle["OSM_BRIGHT_MAP"]:
			return "https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json";
        case mapStyle["GSI_STD_MAP"]:
            return "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/std.json";
        case mapStyle["GSI_PALE_MAP"]:
            return "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/pale.json";
        case mapStyle["GSI_BLANK_MAP"]:
            return "https://gsi-cyberjapan.github.io/gsivectortile-mapbox-gl-js/blank.json";
        case mapStyle["OSM_CUSTOM_MAP"]:
            return "./style/osm-bright-style.json";
		case mapStyle["EMPTY_MAP"]:
			return "./style/empty.json";
        default:
			return "./style/empty.json";
	}
}

// 背景マップの更新
export function updateBaseMap(afterMap) {

    // 同じマップの場合は何もしない
    if (currentMap == afterMap) {
        return;
    }

    // 現在がrasterの場合はレイヤーを削除
    switch (currentMap) {
        case mapStyle["OTM_MAP"]:
            removeLayerSource("tile_otm", "tile_otm");
            break;
        case mapStyle["TRANSPORT_MAP"]:
            removeLayerSource("tile_transportmap", "tile_transportmap");
            break;
        case mapStyle["ESRI_PHOTO_MAP"]:
            removeLayerSource("tile_esriimagery", "tile_esriimagery");
            break;
    }

    // マップスタイルを変更（rasterタイルの場合はEMPLY_MAP）
    changeStyle(getMapStyle(afterMap));
    currentMap = afterMap;

    // rasterの場合はレイヤーを追加
    map.once('styledata', () => {
        switch (afterMap) {
            case mapStyle["OTM_MAP"]:
                addRasterLayer(mapStyle["OTM_MAP"]);
                updateLayerOrder();
                break;
            case mapStyle["TRANSPORT_MAP"]:
                addRasterLayer(mapStyle["TRANSPORT_MAP"]);
                updateLayerOrder();
                break;
            case mapStyle["ESRI_PHOTO_MAP"]:
                addRasterLayer(mapStyle["ESRI_PHOTO_MAP"]);
                updateLayerOrder();
                break;
        }
    });

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
        // Error
        console.log('[Warning] Layer already exists : addOverLayer( ' + layerId + ' )');
        return;
    }

    if (layerId.startsWith('tile')) {
        // Tileレイヤ
        switch (layerId) {
            case 'tile_gsi_photo':
                addRasterLayer(mapStyle["GSI_PHOTO_MAP"]);
                break;
            case 'tile_gsi_relief':
                addRasterLayer(mapStyle["GSI_RELIEF_MAP"]);
                break;
            case 'tile_esriimagery':
                addRasterLayer(mapStyle["ESRI_PHOTO_MAP"]);
                break;
            case 'tile_openseamap':
                addRasterLayer(mapStyle["OPEN_SEA_MAP"]);
                break;
            case 'tile_railwaymap':
                addRasterLayer(mapStyle["RAILWAY_MAP"]);
                break;
            default:
                console.log('[Error] Layer not found : addOverLayer( ' + layerId + ' )');
                return;
        }
    } else if (layerId.startsWith('geojson')) {
        // GeoJsonレイヤ
        addGeoJsonLayer(layerId);
    } else {
        // Error
        console.log('[Error] Layer not found : addOverLayer( ' + layerId + ' )');
        return;
    }

    // 追加後の後処理
    map.once('idle', () => {
        currentLayer.push(layerId);
        updateLayerOrder();

        // Cookieに保存
        setCookie("currentLayer", currentLayer, 30);
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
 * コンテキストメニューイベントを追加する関数
 * 右クリックまたは長押しでコンテキストメニューを表示する
 */
function addContextEvent() {
    const mapDiv = document.getElementById('map');
    let touchTimeout = null;
    let isDragging = false;
    // --- モバイル長押しピン用グローバル変数と関数 ---
    let longPressMarker = null;
    function removeLongPressMarker() {
        if (longPressMarker) {
            longPressMarker.remove();
            longPressMarker = null;
        }
    }
    function showDetailDrawerWithPinClear(content, title, subtitle) {
        removeLongPressMarker();
        showDetailDrawer(content, title, subtitle);
    }
    window.showDetailDrawerWithPinClear = showDetailDrawerWithPinClear;
    window.removeLongPressMarker = removeLongPressMarker;

    // PC: 右クリックでカスタムメニュー
    mapDiv.addEventListener('contextmenu', (e) => {
        if (window.matchMedia('(pointer: coarse)').matches) return; // モバイルは無視
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, map);
    });

    // モバイル: 長押しでDrawer
    mapDiv.addEventListener('touchstart', (e) => {
        if (!window.matchMedia('(pointer: coarse)').matches) return; // モバイルのみ
        if (e.touches.length !== 1) return;
        isDragging = false;
        touchTimeout = setTimeout(() => {
            if (!isDragging) {
                const touch = e.touches[0];
                if (window.map && typeof map.unproject === 'function') {
                    const point = map.unproject([touch.clientX, touch.clientY]);
                    const lat = point.lat.toFixed(5);
                    const lng = point.lng.toFixed(5);
                    removeLongPressMarker(); // 直前のピンを消す
                    longPressMarker = new maplibregl.Marker({ color: 'red' })
                        .setLngLat([parseFloat(lng), parseFloat(lat)])
                        .addTo(map);
                    const sidebarContent = `
                        <div class="mb-3">
                            <div style="height:4px; width:100%; background:#60a5fa; border-radius:6px;"></div>
                        </div>
                        <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                            <h3 class="flex items-center justify-between text-xs font-semibold text-blue-600 w-24 min-w-[96px] text-center mr-2">
                                <i class="fas fa-location-dot fa-fw mr-1 text-blue-500"></i><span class="mx-auto">住所</span>
                            </h3>
                            <span id="reverse-geocode-address" class="block text-xs text-gray-800 mt-1">取得中...</span></div>
                        </div>
                        <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                            <h3 class="flex items-center justify-between text-xs font-semibold text-green-600 w-24 min-w-[96px] text-center mr-2">
                                <i class="fas fa-map-location-dot fa-fw mr-1 text-green-500"></i><span class="mx-auto">リンク</span>
                            </h3>
                            <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-gray-900 transition-all">ここをGoogleマップで開く</a>
                        </div>
                    `;
                    showDetailDrawer(
                        sidebarContent,
                        `${lat}, ${lng}`,
                        '座標情報'
                    );
                // 逆ジオコーディングで住所取得
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`)
                    .then(res => res.json())
                    .then(data => {
                        let addr = data.display_name || '住所情報なし';
                        // カンマ区切りを逆順にして日本式に
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
            }
        }, 700);
    });
    mapDiv.addEventListener('touchmove', () => {
        isDragging = true;
        clearTimeout(touchTimeout);
    });
    mapDiv.addEventListener('touchend', () => {
        clearTimeout(touchTimeout);
    });
    // Drawerを閉じたらピンを消す
    document.getElementById('detail-drawer-close-btn').addEventListener('click', removeLongPressMarker);
}

// 設定機能の初期化
function initSettings() {
    const suspendToggle = document.getElementById('suspend-route-toggle');

    if (!suspendToggle) {
        console.warn('suspend-route-toggle element not found');
        return;
    }

    // 初期状態をCookieから取得
    const showSuspended = getCookie('showSuspendedRoutes') !== 'false';
    suspendToggle.checked = showSuspended;

    // 初期状態を適用
    toggleSuspendedRoutes(showSuspended);

    // トグルボタンのイベントリスナー
    suspendToggle.addEventListener('change', (e) => {
        const showSuspended = e.target.checked;
        toggleSuspendedRoutes(showSuspended);
        setCookie('showSuspendedRoutes', showSuspended.toString(), 365);
    });
}

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
