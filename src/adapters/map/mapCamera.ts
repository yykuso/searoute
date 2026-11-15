/**
 * 地図カメラの操作（MapLibre 本体を読み込まずに使えるよう mapFactory から分離）
 */
import type { MapCameraPort } from '../../application/ports';
import { map } from './mapRegistry';

export const mapCamera: MapCameraPort = {
    flyTo: (options) => { map.flyTo(options); },
};
