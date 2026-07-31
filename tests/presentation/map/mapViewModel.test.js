import { describe, expect, it, vi } from 'vitest';
import { createMapViewModel } from '../../../js/presentation/map/mapViewModel.js';
import { mapStyle } from '../../../js/config/mapStyles.js';

describe('mapViewModel', () => {
    it('initialize は現在のベースマップを適用する', () => {
        const updateBaseMap = vi.fn();
        const viewModel = createMapViewModel({
            getCookieImpl: vi.fn((name) => (name === 'currentMap' ? String(mapStyle.GSI_STD_MAP) : null)),
            updateBaseMap,
        });

        viewModel.initialize();

        expect(updateBaseMap).toHaveBeenCalledWith(mapStyle.GSI_STD_MAP);
        expect(viewModel.getState().status).toBe('ready');
    });

    it('Cookieから初期ベースマップとレイヤーを復元する', () => {
        const getCookieImpl = vi.fn((name) => {
            if (name === 'currentMap') return String(mapStyle.GSI_STD_MAP);
            if (name === 'currentLayer') return 'geojson_sea_route,tile_openseamap';
            return null;
        });

        const viewModel = createMapViewModel({ getCookieImpl });

        expect(viewModel.getState().baseMap).toBe(mapStyle.GSI_STD_MAP);
        expect(viewModel.getState().enabledLayers).toEqual(['geojson_sea_route', 'tile_openseamap']);
    });

    it('changeBaseMapは同じ値なら更新しない', () => {
        const updateBaseMap = vi.fn();
        const viewModel = createMapViewModel({
            getCookieImpl: () => String(mapStyle.EMPTY_MAP),
            updateBaseMap,
        });

        viewModel.changeBaseMap(mapStyle.EMPTY_MAP);

        expect(updateBaseMap).not.toHaveBeenCalled();
    });

    it('setLayerEnabledは追加と削除を実行して状態を更新する', async () => {
        const addOverLayer = vi.fn().mockResolvedValue(undefined);
        const removeOverLayer = vi.fn().mockResolvedValue(undefined);
        const viewModel = createMapViewModel({
            getCookieImpl: vi.fn((name) => (name === 'currentLayer' ? 'geojson_sea_route' : null)),
            addOverLayer,
            removeOverLayer,
        });

        await viewModel.setLayerEnabled('tile_openseamap', true);
        await viewModel.setLayerEnabled('geojson_sea_route', false);

        expect(addOverLayer).toHaveBeenCalledWith('tile_openseamap');
        expect(removeOverLayer).toHaveBeenCalledWith('geojson_sea_route');
        expect(viewModel.getState().enabledLayers).toEqual(['tile_openseamap']);
    });
});