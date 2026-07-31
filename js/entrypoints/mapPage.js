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

import layersControl from '../presentation/map/layerControlView.js';
import routeFilterControl from '../presentation/map/routeFilterControl.js';
import { createLayersConfig } from '../config/layerConfig.js';
import { map } from '../adapters/map/mapRegistry.js';
import { mapStyle } from '../config/mapStyles.js';
import { initMap } from '../application/initializeMap.js';
import { registerDrawerAction, registerDrawerCloseHandler } from '../presentation/drawerViewModel.js';
import { removeRouteHighlight, zoomToRoute, zoomToRouteSection } from '../adapters/map/pmtilesLayerAdapter.js';
import { initRouteFilterSettings } from '../presentation/map/routeFilterSettingsView.js';
import { createMapViewModel } from '../presentation/map/mapViewModel.js';
import {
    addOverLayer,
    isIdInLayer,
    removeOverLayer,
    updateBaseMap,
} from '../adapters/map/layerManager.js';

registerDrawerAction('zoom-route', ({ routeId, sourceId }) => {
    zoomToRoute({ routeId, sourceId });
});
registerDrawerAction('zoom-route-section', ({ routeId, lineId, sourceId }) => {
    zoomToRouteSection(routeId, lineId, sourceId);
});
registerDrawerCloseHandler(removeRouteHighlight);

const mapViewModel = createMapViewModel({
    updateBaseMap,
    addOverLayer,
    removeOverLayer,
});

// 初期化
initMap();
mapViewModel.initialize();

// styleファイルの読み込み後に発火
map.once('styledata', () => {
    const { baseMap, enabledLayers } = mapViewModel.getState();

    // レイヤー設定を作成
    const layersConfig = createLayersConfig(
        mapStyle,
        enabledLayers,
        isIdInLayer,
    );

    // Layers Control
    let layers = new layersControl({
        layers: layersConfig,
        defaultBaseLayer: baseMap,
        updateBaseMap: (nextBaseMap) => mapViewModel.changeBaseMap(nextBaseMap),
        addOverLayer: (layerId) => mapViewModel.setLayerEnabled(layerId, true),
        removeOverLayer: (layerId) => mapViewModel.setLayerEnabled(layerId, false),
    });
    map.addControl(layers, 'top-right');
    map.addControl(new routeFilterControl(), 'top-right');
    initRouteFilterSettings();

});


// ページ読み込み時に設定を初期化
document.addEventListener('DOMContentLoaded', () => {
    // マップが読み込まれてから設定を適用
    if (map && map.loaded()) {
        initRouteFilterSettings();
    } else {
        const checkMapLoaded = () => {
            if (map && map.loaded()) {
                initRouteFilterSettings();
            } else {
                setTimeout(checkMapLoaded, 100);
            }
        };
        checkMapLoaded();
    }
});
