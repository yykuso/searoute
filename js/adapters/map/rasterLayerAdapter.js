/**
 * ラスタータイル（衛星画像・地図タイル）管理モジュール
 *
 * 責務:
 * - 衛星画像、OpenSeaMap、GSI写真などのラスタータイル読み込み
 * - Esri、Railway Map などの外部タイルソースの管理
 * - ラスタータイルレイヤーの追加・除去
 */

import { map } from './mapRegistry.js';
import { RASTER_LAYER_CONFIGS } from '../../config/rasterLayerConfig.js';

export function addRasterLayer(layer) {
    const config = RASTER_LAYER_CONFIGS[layer];
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