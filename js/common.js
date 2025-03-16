import layersControl from './layersControl.js';
import { addRasterLayer } from './rasterLayers.js';
import { addGeoJsonLayer, addMarker, addResetClickEvent } from './geoJsonLayers.js';
import { initCenterZoom, setCookie, getCookie } from './cookieControler.js';

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


// スマホにおける長押しを検出するための変数
let touchTimeout;
let isDragging = false;

// マップの初期化
function initMap() {
    // デフォルト設定
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

    // 画面移動時に発火
    map.on("moveend", () => {
        const center = map.getCenter();
        const zoom = map.getZoom();

        // Cookieに保存
        setCookie("mapCenter", JSON.stringify([center.lng, center.lat]), 30);
        setCookie("mapZoom", zoom, 30);
    });

    // コンテキストメニューイベントの追加（右クリック）
    map.on('contextmenu', (event) => {
        event.preventDefault();
        showContextMenu(event, 'right');
    });

    // コンテキストメニューイベントの追加（長押し）
    map.on('touchstart', (event) => {
        isDragging = false;
        touchTimeout = setTimeout(() => {
            if (!isDragging) {
                showContextMenu(event, 'left');
            }
        }, 1000); // 1秒以上の長押しでコンテキストメニューを表示
    });

    map.on('touchmove', () => {
        isDragging = true;
        clearTimeout(touchTimeout);
    });

    map.on('touchend', () => {
        clearTimeout(touchTimeout);
    });

    // イベントを追加
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
function updateLayerOrder() {
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

// // GeoJsonLayerの表示切り替え
// export async function toggleOverLayer(layerId, sourceId = layerId) {
//     if (currentLayer.includes(layerId)) {
//         removeLayerSource(layerId, sourceId);
//         // removeClickEvent(layerId);
//     } else {
//         await addOverLayer(layerId);
//     }
// }

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

// コンテキストメニューを表示する関数
function showContextMenu(event, position = 'right') {
    // 既存のコンテキストメニューを削除
    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // コンテキストメニューの作成
    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';

    // 座標を表示し、コピーするボタンの追加
    const copyCoordsItem = document.createElement('div');
    const lngLat = event.lngLat;
    const coordsText = `${lngLat.lat},${lngLat.lng}`;
    copyCoordsItem.innerText = `${lngLat.lat.toFixed(5)},${lngLat.lng.toFixed(5)}`;
    copyCoordsItem.onclick = () => {
        navigator.clipboard.writeText(coordsText).then(() => {
            alert('座標がコピーされました');
        }).catch(err => {
            console.error('座標のコピーに失敗しました', err);
        });
        contextMenu.remove();
    };
    contextMenu.appendChild(copyCoordsItem);

    // Googleマップで開くボタンの追加
    const googleMapsItem = document.createElement('div');
    googleMapsItem.innerText = 'Googleマップで開く';
    googleMapsItem.onclick = () => {
        const lngLat = event.lngLat;
        const googleMapsUrl = `https://www.google.com/maps?q=${lngLat.lat},${lngLat.lng}`;
        window.open(googleMapsUrl, '_blank');
        contextMenu.remove();
    };
    contextMenu.appendChild(googleMapsItem);

    // コンテキストメニューを#mapに追加
    document.getElementById('map').appendChild(contextMenu);

    // 初期位置を設定
    let left = event.point.x;
    let top = event.point.y;

    // コンテキストメニューのサイズを取得
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    // ウィンドウのサイズを取得
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 画面外に出ないように位置を調整
    if (position === 'left') {
        left -= menuWidth;
        if (left < 0) {
            left = 0;
        }
    } else {
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth;
        }
    }
    if (top + menuHeight > windowHeight) {
        top = windowHeight - menuHeight;
    }

    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;


    // コンテキストメニューを閉じるイベントリスナー
    document.addEventListener('click', () => {
        contextMenu.remove();
    }, { once: true });
    
    // マップを動かしたらコンテキストメニューを削除
    map.on('move', () => {
        contextMenu.remove();
    });

}
