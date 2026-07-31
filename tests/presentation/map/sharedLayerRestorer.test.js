import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../js/presentation/shareDrawer.js', () => ({
    getShareQueryContext: vi.fn(),
    getShareTargetLayerId: vi.fn(),
}));
vi.mock('../../../js/adapters/map/layerManager.js', () => ({
    addOverLayer: vi.fn(),
    isLayerActive: vi.fn(),
}));

import { getShareQueryContext, getShareTargetLayerId } from '../../../js/presentation/shareDrawer.js';
import { addOverLayer, isLayerActive } from '../../../js/adapters/map/layerManager.js';
import { ensureSharedLayerEnabled } from '../../../js/presentation/map/sharedLayerRestorer.js';

function createFakeInput() {
    const layerItem = { classList: { toggle: vi.fn() } };
    return {
        checked: false,
        closest: vi.fn(() => layerItem),
        layerItem,
    };
}

describe('sharedLayerRestorer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('共有コンテキストが無い場合は何もしない', async () => {
        getShareQueryContext.mockReturnValue(null);
        const documentStub = { getElementById: vi.fn() };
        vi.stubGlobal('document', documentStub);

        await ensureSharedLayerEnabled();

        expect(documentStub.getElementById).not.toHaveBeenCalled();
        expect(addOverLayer).not.toHaveBeenCalled();

        vi.unstubAllGlobals();
    });

    it('対象レイヤーが既に有効な場合はコントロール状態のみ同期する', async () => {
        getShareQueryContext.mockReturnValue({ type: 'route' });
        getShareTargetLayerId.mockReturnValue('geojson_sea_route');
        isLayerActive.mockReturnValue(true);
        const input = createFakeInput();
        const documentStub = { getElementById: vi.fn(() => input) };
        vi.stubGlobal('document', documentStub);

        await ensureSharedLayerEnabled();

        expect(addOverLayer).not.toHaveBeenCalled();
        expect(input.checked).toBe(true);
        expect(input.layerItem.classList.toggle).toHaveBeenCalledWith('checked', true);

        vi.unstubAllGlobals();
    });

    it('対象レイヤーが未有効な場合はaddOverLayerしてから同期する', async () => {
        getShareQueryContext.mockReturnValue({ type: 'route' });
        getShareTargetLayerId.mockReturnValue('geojson_sea_route');
        isLayerActive.mockReturnValue(false);
        const input = createFakeInput();
        const documentStub = { getElementById: vi.fn(() => input) };
        vi.stubGlobal('document', documentStub);

        await ensureSharedLayerEnabled();

        expect(addOverLayer).toHaveBeenCalledWith('geojson_sea_route');
        expect(input.checked).toBe(true);

        vi.unstubAllGlobals();
    });

    it('対象レイヤーIDが無い場合はDOM操作をせずに終了する', async () => {
        getShareQueryContext.mockReturnValue({ type: 'unknown' });
        getShareTargetLayerId.mockReturnValue(null);
        const documentStub = { getElementById: vi.fn() };
        vi.stubGlobal('document', documentStub);

        await ensureSharedLayerEnabled();

        expect(documentStub.getElementById).not.toHaveBeenCalled();
        expect(addOverLayer).not.toHaveBeenCalled();

        vi.unstubAllGlobals();
    });
});
