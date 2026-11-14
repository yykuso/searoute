import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureSharedLayerEnabled } from '../../../src/application/useCases/shareUseCases';

// 旧 presentation/map/sharedLayerRestorer のテスト。
// レイヤーコントロールの DOM 同期（input.checked / .checked クラス）は presentation 側の
// onLayerEnabled コールバックへ分離したため、ここではコールバック呼び出しで検証する（DOM 側は Phase 2）。
function createDeps(search: string, { active = false } = {}) {
    return {
        navigation: { getSearch: () => search },
        layers: {
            addOverLayer: vi.fn(async () => {}),
            isLayerActive: vi.fn(() => active),
        },
        onLayerEnabled: vi.fn(),
    };
}

describe('sharedLayerRestorer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('共有コンテキストが無い場合は何もしない', async () => {
        const deps = createDeps('');

        await ensureSharedLayerEnabled(deps);

        expect(deps.onLayerEnabled).not.toHaveBeenCalled();
        expect(deps.layers.addOverLayer).not.toHaveBeenCalled();
    });

    it('対象レイヤーが既に有効な場合はコントロール状態のみ同期する', async () => {
        const deps = createDeps('?share=route&routeId=1&sourceId=geojson_sea_route', { active: true });

        await ensureSharedLayerEnabled(deps);

        expect(deps.layers.addOverLayer).not.toHaveBeenCalled();
        expect(deps.onLayerEnabled).toHaveBeenCalledWith('geojson_sea_route');
    });

    it('対象レイヤーが未有効な場合はaddOverLayerしてから同期する', async () => {
        const deps = createDeps('?share=route&routeId=1&sourceId=geojson_sea_route', { active: false });
        const calls: string[] = [];
        deps.layers.addOverLayer.mockImplementation(async () => { calls.push('add'); });
        deps.onLayerEnabled.mockImplementation(() => { calls.push('sync'); });

        await ensureSharedLayerEnabled(deps);

        expect(deps.layers.addOverLayer).toHaveBeenCalledWith('geojson_sea_route');
        expect(deps.onLayerEnabled).toHaveBeenCalledWith('geojson_sea_route');
        expect(calls).toEqual(['add', 'sync']);
    });

    it('対象レイヤーIDが無い場合はDOM操作をせずに終了する', async () => {
        const deps = createDeps('?share=unknown');

        await ensureSharedLayerEnabled(deps);

        expect(deps.onLayerEnabled).not.toHaveBeenCalled();
        expect(deps.layers.addOverLayer).not.toHaveBeenCalled();
    });
});
