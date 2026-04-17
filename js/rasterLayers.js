import {
    map,
    mapStyle,
} from './common.js';

// Thunderforest API キー
const THUNDERFOREST_API_KEY = 'e2a13af0ede642faa4f3e766cc345f72';

// ラスターレイヤー設定（遅延初期化）
let RASTER_LAYER_CONFIG = null;

/**
 * ラスターレイヤー設定を取得（初回時に初期化）
 */
function getRasterLayerConfig() {
    if (!RASTER_LAYER_CONFIG) {
        RASTER_LAYER_CONFIG = {
            [mapStyle["OTM_MAP"]]: {
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
            [mapStyle["TRANSPORT_MAP"]]: {
                id: 'tile_transportmap',
                tiles: [
                    'https://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + THUNDERFOREST_API_KEY,
                    'https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + THUNDERFOREST_API_KEY,
                    'https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + THUNDERFOREST_API_KEY,
                ],
                attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a> <a href='https://thunderforest.com' target='_blank' rel='noopener noreferrer'>&copy; Thunderforest</a>",
                minzoom: 2,
                maxzoom: 19,
            },
            [mapStyle["ESRI_PHOTO_MAP"]]: {
                id: 'tile_esriimagery',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                attribution: "&copy; <a href='https://www.esri.com/'>Esri</a>",
                minzoom: 2,
                maxzoom: 19,
                paint: { 'raster-opacity': 0.6 },
            },
            [mapStyle["OPEN_SEA_MAP"]]: {
                id: 'tile_openseamap',
                tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
                attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a> <a href='https://www.openseamap.org' target='_blank' rel='noopener noreferrer'>&copy; OpenSeaMap</a>",
                minzoom: 2,
                maxzoom: 18,
            },
            [mapStyle["RAILWAY_MAP"]]: {
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
            [mapStyle["GSI_PHOTO_MAP"]]: {
                id: 'tile_gsi_photo',
                tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
                attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank' rel='noopener noreferrer'>国土地理院</a>",
                minzoom: 2,
                maxzoom: 18,
                paint: { 'raster-opacity': 0.6 },
            },
            [mapStyle["GSI_RELIEF_MAP"]]: {
                id: 'tile_gsi_relief',
                tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
                attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank' rel='noopener noreferrer'>国土地理院</a>",
                minzoom: 5,
                maxzoom: 15,
                paint: { 'raster-opacity': 0.7 },
            },
        };
    }
    return RASTER_LAYER_CONFIG;
}

/**
 * RasterLayerを追加する関数
 * @param {number} layer - RasterLayerのID
 */
export function addRasterLayer(layer) {
    const config = getRasterLayerConfig()[layer];
    if (!config) {
        console.log('[Error] Layer not found : addRasterLayer( ' + layer + ' )');
        return;
    }
    addGenericRasterLayer(config);
}

/**
 * 汎用ラスターレイヤー追加関数
 * @param {Object} config - レイヤー設定オブジェクト
 */
function addGenericRasterLayer(config) {
    // ソース追加
    map.addSource(config.id, {
        type: 'raster',
        tiles: config.tiles,
        tileSize: 256,
        attribution: config.attribution,
    });

    // レイヤー追加
    const layerDef = {
        id: config.id,
        type: 'raster',
        source: config.id,
        minzoom: config.minzoom,
        maxzoom: config.maxzoom,
    };

    // paint プロパティがあれば追加
    if (config.paint) {
        layerDef.paint = config.paint;
    }

    map.addLayer(layerDef);
}