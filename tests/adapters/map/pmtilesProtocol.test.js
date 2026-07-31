import { describe, expect, it, vi } from 'vitest';
import { setupPmtilesProtocol } from '../../../js/adapters/map/pmtilesLayerAdapter.js';

describe('setupPmtilesProtocol', () => {
    it('pmtiles/maplibregl が未ロードの場合は何もしない', () => {
        const windowRef = { __searoutePmtilesReady: undefined };
        setupPmtilesProtocol({ windowRef });
        expect(windowRef.__searoutePmtilesReady).toBe(false);
    });

    it('正常にプロトコルを登録して Ready フラグを立てる', () => {
        const addProtocol = vi.fn();
        const tile = vi.fn();
        const Protocol = vi.fn(function() { this.tile = tile; });
        const windowRef = {
            pmtiles: { Protocol },
            maplibregl: { addProtocol },
        };
        setupPmtilesProtocol({ windowRef });
        expect(addProtocol).toHaveBeenCalledWith('pmtiles', tile);
        expect(windowRef.__searoutePmtilesReady).toBe(true);
    });

    it('Protocol コンストラクタが例外を投げても Ready フラグは false のまま', () => {
        const windowRef = {
            pmtiles: { Protocol: vi.fn(() => { throw new Error('fail'); }) },
            maplibregl: { addProtocol: vi.fn() },
        };
        expect(() => setupPmtilesProtocol({ windowRef })).not.toThrow();
        expect(windowRef.__searoutePmtilesReady).toBe(false);
    });
});
