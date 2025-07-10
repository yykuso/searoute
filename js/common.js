import layersControl from './layersControl.js';
import hamburgerControl from './hamburgerControl.js';
import { addRasterLayer } from './rasterLayers.js';
import { addGeoJsonLayer, addMarker, addResetClickEvent } from './geoJsonLayers.js';
import { initCenterZoom, setCookie, getCookie } from './cookieControl.js';

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
    // BaseLayer
    const mapBaseLayer = {
        'OSM Custom': mapStyle["OSM_CUSTOM_MAP"],
        'OSM Bright': mapStyle["OSM_BRIGHT_MAP"],
        'OSM Planet': mapStyle["OSM_PLANET_MAP"],
        '地理院 標準': mapStyle["GSI_STD_MAP"],
        '地理院 淡色': mapStyle["GSI_PALE_MAP"],
        '地理院 白地図': mapStyle["GSI_BLANK_MAP"],
        'OpenTopoMap': mapStyle["OTM_MAP"],
        'TransportMap': mapStyle["TRANSPORT_MAP"],
    };
    // default BaseLayer
    // const defaultBaseLayer = mapStyle["OSM_BRIGHT_MAP"];
    // OverLayer
    const mapOverLayer = {
        tile_gsi_photo: {
            name: '地理院 写真',
            visible: isIdInLayer(defaultLayer, 'tile_gsi_photo'),
        },
        tile_gsi_relief: {
            name: '地理院 標高図',
            visible: isIdInLayer(defaultLayer, 'tile_gsi_relief'),
        },
        tile_esriimagery: {
            name: 'EsriWorldImagery',
            visible: isIdInLayer(defaultLayer, 'tile_esriimagery'),
        },
        tile_railwaymap: {
            name: 'OpenRailwayMap',
            visible: isIdInLayer(defaultLayer, 'tile_railwaymap'),
        },
        tile_openseamap: {
            name: 'OpenSeaMap',
            visible: isIdInLayer(defaultLayer, 'tile_openseamap'),
        },
    };
    // geojsonLayer
    const geojsonLayer = {
        geojson_port: {
            name: '港湾情報',
            visible: isIdInLayer(defaultLayer, 'geojson_port'),
        },
        geojson_sea_route: {
            name: '国内航路',
            visible: isIdInLayer(defaultLayer, 'geojson_sea_route'),
        },
        geojson_international_sea_route: {
            name: '国際航路',
            visible: isIdInLayer(defaultLayer, 'geojson_international_sea_route'),
        },
        geojson_limited_sea_route: {
            name: '期間限定航路',
            visible: isIdInLayer(defaultLayer, 'geojson_limited_sea_route'),
        },
    };
    // Layers Control
    let layers = new layersControl({
        baseLayers: mapBaseLayer,
        defaultBaseLayer: defaultMap,
        overLayers: mapOverLayer,
        geojsonLayers: geojsonLayer,
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

    // PC: 右クリックでカスタムメニュー
    mapDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
    });

    // モバイル: 長押しでカスタムメニュー
    mapDiv.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        isDragging = false;
        touchTimeout = setTimeout(() => {
            if (!isDragging) {
                const touch = e.touches[0];
                showContextMenu(touch.clientX, touch.clientY);
            }
        }, 700); // 700ms長押しで表示
    });
    mapDiv.addEventListener('touchmove', () => {
        isDragging = true;
        clearTimeout(touchTimeout);
    });
    mapDiv.addEventListener('touchend', () => {
        clearTimeout(touchTimeout);
    });
}

/**
 * コンテキストメニューを表示する関数
 * @param {number} x - 表示位置X座標
 * @param {number} y - 表示位置Y座標
 */
function showContextMenu(x, y) {
    // 既存のメニューを削除
    document.getElementById('custom-context-menu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.zIndex = 9999;
    menu.className = 'bg-white border border-slate-300 rounded shadow-lg py-2 text-sm';

    // 座標取得
    let lat = null, lng = null;
    if (window.map && typeof map.unproject === 'function') {
        const point = map.unproject([x, y]);
        lat = point.lat;
        lng = point.lng;
    }

    // 座標コピー
    const copyBtn = document.createElement('button');
    copyBtn.className = 'block w-full text-left px-2 py-1 hover:bg-slate-100';
    copyBtn.textContent = lat && lng ? `${lat.toFixed(5)},${lng.toFixed(5)}` : '座標をコピー';
    copyBtn.addEventListener('click', () => {
        if (lat && lng) {
            navigator.clipboard.writeText(`${lat.toFixed(5)},${lng.toFixed(5)}`)
                .then(() => alert('座標がコピーされました'))
                .catch((err) => console.error('座標のコピーに失敗しました', err));
        }
        hideContextMenu();
    });
    menu.appendChild(copyBtn);

    // Googleマップで開く
    const gmapBtn = document.createElement('button');
    gmapBtn.className = 'block w-full text-left px-2 py-1 hover:bg-slate-100';
    gmapBtn.textContent = 'Googleマップで開く';
    gmapBtn.type = 'button'; // 明示的にbutton属性
    gmapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (lat != null && lng != null) {
            const url = `https://www.google.com/maps?q=${lat},${lng}`;
            window.open(url, '_blank', 'noopener');
        }
        hideContextMenu();
    });
    menu.appendChild(gmapBtn);

    document.body.appendChild(menu);
    // 画面外に出ないように調整
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    // 外側クリック・タップで閉じる
    setTimeout(() => {
        document.addEventListener('mousedown', hideContextMenu, { once: true });
        document.addEventListener('touchstart', hideContextMenu, { once: true });
    }, 0);
}
function hideContextMenu() {
    document.getElementById('custom-context-menu')?.remove();
}
