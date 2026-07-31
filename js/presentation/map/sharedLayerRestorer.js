import { getShareQueryContext, getShareTargetLayerId } from '../shareDrawer.js';
import { addOverLayer, isLayerActive } from '../../adapters/map/layerManager.js';

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
 * 共有 URL の対象レイヤーを事前に有効化する
 */
export async function ensureSharedLayerEnabled() {
    const shareContext = getShareQueryContext();
    if (!shareContext) {
        return;
    }

    const targetLayerId = getShareTargetLayerId(shareContext);

    if (!targetLayerId || isLayerActive(targetLayerId)) {
        syncLayerControlState(targetLayerId, true);
        return;
    }

    await addOverLayer(targetLayerId);
    syncLayerControlState(targetLayerId, true);
}
