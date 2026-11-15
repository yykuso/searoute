/**
 * ベースマップ・オーバーレイレイヤー管理モジュール
 *
 * 責務:
 * - 背景地図（ベースマップ）の切り替え
 * - Tile/GeoJSON オーバーレイの追加・削除
 * - レイヤー表示順序の維持
 * - 現在のレイヤー状態のCookieへの永続化
 */
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import type { LayerPort } from '../../application/ports';
import { mapStyle } from '../../config/mapStyles';
import { setCookie } from '../persistence/cookieControl';
import { addGeoJsonLayer, addMarker, removeClickEvent } from './geoJsonLayerAdapter';
import { map } from './mapRegistry';

interface RasterLayerConfig {
    id: string;
    tiles: string[];
    attribution: string;
    minzoom: number;
    maxzoom: number;
    paint?: Record<string, unknown>;
}

const THUNDERFOREST_API_KEY = 'e2a13af0ede642faa4f3e766cc345f72';

const RASTER_LAYER_CONFIGS: Record<number, RasterLayerConfig> = {
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

function addRasterLayer(layer: number): void {
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
    const layerDef: Record<string, unknown> = {
        id: config.id,
        type: 'raster',
        source: config.id,
        minzoom: config.minzoom,
        maxzoom: config.maxzoom,
    };
    if (config.paint) layerDef.paint = config.paint;
    map.addLayer(layerDef as unknown as LayerSpecification);
}

// レイヤーの表示優先順位
export const layerPriorities: string[] = [
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
const MAP_STYLE_CONFIG: Record<number, { url: string; rasterLayerId: string | null }> = {
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
const TILE_LAYER_MAP: Record<string, number> = {
    'tile_gsi_photo': mapStyle["GSI_PHOTO_MAP"],
    'tile_gsi_relief': mapStyle["GSI_RELIEF_MAP"],
    'tile_esriimagery': mapStyle["ESRI_PHOTO_MAP"],
    'tile_openseamap': mapStyle["OPEN_SEA_MAP"],
    'tile_railwaymap': mapStyle["RAILWAY_MAP"],
};

// 現在の状態
let currentMap: number | null = null;
let currentLayer: string[] = [];
const pendingLayerAdds = new Map<string, Promise<void>>();

/**
 * defaultLayerにIDの値が存在するかをチェックする関数
 */
export function isIdInLayer(layer: string[] | null | undefined, id: string): boolean {
    return Boolean(layer && layer.includes(id));
}

// 現在有効なオーバーレイに含まれているかを判定する
export function isLayerActive(layerId: string): boolean {
    return currentLayer.includes(layerId);
}

/**
 * マップのスタイルファイルを取得する関数
 */
export function getMapStyle(style: number | null): string {
    const config = MAP_STYLE_CONFIG[style as number] || MAP_STYLE_CONFIG[mapStyle["EMPTY_MAP"]];
    return config.url;
}

// マップ初期化時点の現在ベースマップスタイルURLを取得する
export function getCurrentMapStyleUrl(): string {
    return getMapStyle(currentMap);
}

// 背景マップの更新
export function updateBaseMap(afterMap: number): void {

    // 同じマップの場合は何もしない
    if (currentMap == afterMap) {
        return;
    }

    // 現在がrasterの場合はレイヤーを削除
    const currentConfig: { rasterLayerId?: string | null } = MAP_STYLE_CONFIG[currentMap as number] || {};
    if (currentConfig.rasterLayerId) {
        removeLayerSource(currentConfig.rasterLayerId, currentConfig.rasterLayerId);
    }

    // マップスタイルを変更
    changeStyle(getMapStyle(afterMap));
    currentMap = afterMap;

    // rasterの場合はレイヤーを追加
    const afterConfig: { rasterLayerId?: string | null } = MAP_STYLE_CONFIG[afterMap] || {};
    if (afterConfig.rasterLayerId) {
        map.once('styledata', () => {
            addRasterLayer(afterMap);
            updateLayerOrder();
        });
    }

    // Cookieに保存
    setCookie("currentMap", currentMap as number, 30);

}

// スタイルの変更
async function changeStyle(newStyleJson: string): Promise<void> {

    // OverLayer(Source,Layer)を保持する
    map.setStyle(newStyleJson, {
        transformStyle: (previousStyle: StyleSpecification | undefined, nextStyle: StyleSpecification): StyleSpecification => {
            const custom_layers = (previousStyle as StyleSpecification).layers.filter(layer => {
                return layer.id.startsWith('geojson') || layer.id.startsWith('tile');
            });
            const layers = nextStyle.layers.concat(custom_layers);

            const sources = nextStyle.sources;
            for (const [key, value] of Object.entries((previousStyle as StyleSpecification).sources)) {
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
function reAddMaker(): void {
    if (currentLayer.includes('geojson_port')) {
        addMarker('anchor_marker', './img/anchor.png');
    }
}

// レイヤーの表示順を更新
function updateLayerOrder(retryCount = 0, maxRetries = 30, waitUntil = 1000): void {
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

function removeLayerSource(layerId: string, sourceId: string = layerId): void {
	removeLayer(layerId);
	removeSource(sourceId);
}

function removeLayer(layerId: string): void {
    const layers = map.getStyle().layers;
    layers.forEach((layer) => {
        if (layer.id.startsWith(layerId)) {
            map.removeLayer(layer.id);
        }
    });
    // currentLayerから削除
    currentLayer = currentLayer.filter((layer) => layer !== layerId);
}

function removeSource(sourceId: string): void {
	if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
    }
}

/**
 * OverLayer(Tile/GeoJson)を追加する関数
 */
async function performAddOverLayer(layerId: string): Promise<void> {
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
    await new Promise<void>((resolve) => {
        map.once('idle', () => {
            currentLayer.push(layerId);
            updateLayerOrder();

            // Cookieに保存
            setCookie("currentLayer", currentLayer, 30);
            resolve();
        });
    });
}

export async function addOverLayer(layerId: string): Promise<void> {
    if (pendingLayerAdds.has(layerId)) {
        return pendingLayerAdds.get(layerId);
    }

    const pendingAdd = performAddOverLayer(layerId);
    pendingLayerAdds.set(layerId, pendingAdd);
    try {
        return await pendingAdd;
    } finally {
        pendingLayerAdds.delete(layerId);
    }
}

/**
 * OverLayer(Tile/GeoJson)を削除する関数
 */
export async function removeOverLayer(layerId: string, sourceId: string = layerId): Promise<void> {
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

export const layerManager: LayerPort = {
    updateBaseMap,
    addOverLayer,
    removeOverLayer: (layerId) => removeOverLayer(layerId),
    isLayerActive,
};
