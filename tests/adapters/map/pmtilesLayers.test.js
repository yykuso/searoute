import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    disposePmtilesLayers,
    initPmtilesLayers,
} from '../../../js/adapters/map/pmtilesLayerAdapter.js';

describe('PMTilesレイヤーのライフサイクル', () => {
    afterEach(() => disposePmtilesLayers());

    it('明示初期化時に詳細ドロワーのサイズ監視を開始する', () => {
        const drawerElement = {};
        const observe = vi.fn();
        const disconnect = vi.fn();
        const documentRef = {
            getElementById: vi.fn(() => drawerElement),
        };
        const ResizeObserverImpl = vi.fn(function ResizeObserver(callback) {
            this.observe = observe;
            this.disconnect = disconnect;
            callback([{ contentRect: { width: 320, height: 240 } }]);
        });

        expect(initPmtilesLayers({ documentRef, ResizeObserverImpl })).toBe(true);
        expect(initPmtilesLayers({ documentRef, ResizeObserverImpl })).toBe(false);
        expect(documentRef.getElementById).toHaveBeenCalledWith('detail-drawer');
        expect(observe).toHaveBeenCalledWith(drawerElement);
        expect(disposePmtilesLayers()).toBe(true);
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it('監視対象がなければ初期化しない', () => {
        const documentRef = { getElementById: () => null };

        expect(initPmtilesLayers({ documentRef, ResizeObserverImpl: vi.fn() })).toBe(false);
    });
});