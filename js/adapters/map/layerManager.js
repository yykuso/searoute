/**
 * ベースマップ・オーバーレイレイヤー管理モジュール
 *
 * 責務:
 * - 背景地図（ベースマップ）の切り替え
 * - Tile/GeoJSON オーバーレイの追加・削除
 * - レイヤー表示順序の維持
 * - 現在のレイヤー状態のCookieへの永続化
 */
import { addGeoJsonLayer, addMarker, removeClickEvent } from './geoJsonLayerAdapter.js';
import { setCookie } from '../persistence/cookieControl.js';
import { map } from './mapRegistry.js';
import { mapStyle } from '../../config/mapStyles.js';

const THUNDERFOREST_API_KEY = 'e2a13af0ede642faa4f3e766cc345f72';

const RASTER_LAYER_CONFIGS = {
    [mapStyle.OTM_MAP]: {
        id: 'tile_otm',
        tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
        ],
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a> <a href='https://opentopomap.org/' target='_blank' rel='noopener noreferrer'>&copy; OpenTopoMap</a>",
        minzoom: 2,
        maxzoom: 18,
    },
    [mapStyle.TRANSPORT_MAP]: {
        id: 'tile_transportmap',
        tiles: [
            `https://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`,
            `https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`,
            `https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`,
        ],
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a> <a href='https://thunderforest.com' target='_blank' rel='noopener noreferrer'>&copy; Thunderforest</a>",
        minzoom: 2,
        maxzoom: 19,
    },
    [mapStyle.ESRI_PHOTO_MAP]: {
        id: 'tile_esriimagery',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        attribution: "&copy; <a href='https://www.esri.com/'>Esri</a>",
        minzoom: 2,
        maxzoom: 19,
        paint: { 'raster-opacity': 0.6 },
    },
    [mapStyle.OPEN_SEA_MAP]: {
        id: 'tile_openseamap',
        tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a> <a href='https://www.openseamap.org' target='_blank' rel='noopener noreferrer'>&copy; OpenSeaMap</a>",
        minzoom: 2,
        maxzoom: 18,
    },
    [mapStyle.RAILWAY_MAP]: {
        id: 'tile_railwaymap',
        tiles: [
            'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
        ],
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a> <a href='https://www.OpenRailwayMap.org' target='_blank' rel='noopener noreferrer'>&copy; OpenRailwayMap</a>",
        minzoom: 2,
        maxzoom: 19,
    },
    [mapStyle.GSI_PHOTO_MAP]: {
        id: 'tile_gsi_photo',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank' rel='noopener noreferrer'>国土地理院</a>",
        minzoom: 2,
        maxzoom: 18,
        paint: { 'raster-opacity': 0.6 },
    },
    [mapStyle.GSI_RELIEF_MAP]: {
        id: 'tile_gsi_relief',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank' rel='noopener noreferrer'>国土地理院</a>",
        minzoom: 5,
        maxzoom: 15,
        paint: { 'raster-opacity': 0.7 },
    },
};

function addRasterLayer(layer) {
    const config = RASTER_LAYER_CONFIGS[layer];
    if (!config) {
        console.log('[Error] Layer not found : addRasterLayer( ' + layer + ' )');
        return;
    }
    map.addSource(config.id, {
        type: 'raster',
        tiles: config.tiles,
        tileSize: 256,
        attribution: config.attribution,
    });
    const layerDef = {
        id: config.id,
        type: 'raster',
        source: config.id,
        minzoom: config.minzoom,
        maxzoom: config.maxzoom,
    };
    if (config.paint) layerDef.paint = config.paint;
    map.addLayer(layerDef);
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

// Tile レイヤーID と mapStyle の対応
const TILE_LAYER_MAP = {
    'tile_gsi_photo': mapStyle["GSI_PHOTO_MAP"],
    'tile_gsi_relief': mapStyle["GSI_RELIEF_MAP"],
    'tile_esriimagery': mapStyle["ESRI_PHOTO_MAP"],
    'tile_openseamap': mapStyle["OPEN_SEA_MAP"],
    'tile_railwaymap': mapStyle["RAILWAY_MAP"],
};

// 現在の状態
let currentMap = null;
let currentLayer = [];

/**
 * defaultLayerにIDの値が存在するかをチェックする関数
 * @param {string} layer - チェックするレイヤー配列
 * @param {string} id - チェックするレイヤーID
 * @returns {boolean} - 存在する場合はtrue、そうでなければfalse
 */
export function isIdInLayer(layer, id) {
    return layer && layer.includes(id);
}

// 現在有効なオーバーレイに含まれているかを判定する
export function isLayerActive(layerId) {
    return currentLayer.includes(layerId);
}

/**
 * マップのスタイルファイルを取得する関数
 * @param {number} style - Style ID
 * @returns {string} - Styleファイル
 */
export function getMapStyle(style) {
    const config = MAP_STYLE_CONFIG[style] || MAP_STYLE_CONFIG[mapStyle["EMPTY_MAP"]];
    return config.url;
}

// マップ初期化時点の現在ベースマップスタイルURLを取得する
export function getCurrentMapStyleUrl() {
    return getMapStyle(currentMap);
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
