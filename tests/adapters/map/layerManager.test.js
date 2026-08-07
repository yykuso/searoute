import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../js/adapters/map/geoJsonLayerAdapter.js', () => ({
    addGeoJsonLayer: vi.fn().mockResolvedValue(true),
    addMarker: vi.fn(),
    removeClickEvent: vi.fn(),
}));
vi.mock('../../../js/adapters/persistence/cookieControl.js', () => ({ setCookie: vi.fn() }));

import { addGeoJsonLayer, removeClickEvent } from '../../../js/adapters/map/geoJsonLayerAdapter.js';
import { setCookie } from '../../../js/adapters/persistence/cookieControl.js';
import { setMap } from '../../../js/adapters/map/mapRegistry.js';
import { mapStyle } from '../../../js/config/mapStyles.js';
import {
    addOverLayer,
    getCurrentMapStyleUrl,
    getMapStyle,
    isIdInLayer,
    isLayerActive,
    removeOverLayer,
    updateBaseMap,
} from '../../../js/adapters/map/layerManager.js';

function createFakeMap({ layers = [] } = {}) {
    return {
        setStyle: vi.fn(),
        once: vi.fn((_event, callback) => callback()),
        getSource: vi.fn(() => true),
        isSourceLoaded: vi.fn(() => true),
        getStyle: vi.fn(() => ({ layers })),
        moveLayer: vi.fn(),
        removeLayer: vi.fn(),
        removeSource: vi.fn(),
        addSource: vi.fn(),
        addLayer: vi.fn(),
    };
}

let fakeMap;

describe('layerManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        addGeoJsonLayer.mockResolvedValue(true);
        fakeMap = createFakeMap();
        setMap(fakeMap);
    });

    it('isIdInLayer は配列にIDが含まれるかを判定する', () => {
        expect(isIdInLayer(['a', 'b'], 'a')).toBe(true);
        expect(isIdInLayer(['a', 'b'], 'c')).toBe(false);
        expect(isIdInLayer(null, 'a')).toBeFalsy();
    });

    it('addOverLayer はタイルレイヤーを追加し状態とCookieを更新する', async () => {
        await addOverLayer('tile_gsi_photo');

        expect(fakeMap.addSource).toHaveBeenCalled();
        expect(isLayerActive('tile_gsi_photo')).toBe(true);
        expect(setCookie).toHaveBeenCalledWith('currentLayer', expect.arrayContaining(['tile_gsi_photo']), 30);
    });

    it('addOverLayer はGeoJSONレイヤー追加が失敗した場合は状態を変更しない', async () => {
        addGeoJsonLayer.mockResolvedValueOnce(false);

        await addOverLayer('geojson_test_add_failure');

        expect(isLayerActive('geojson_test_add_failure')).toBe(false);
        expect(setCookie).not.toHaveBeenCalled();
    });

    it('同じレイヤーを二重に追加しようとした場合は何もしない', async () => {
        await addOverLayer('tile_gsi_relief');
        const addSourceCount = fakeMap.addSource.mock.calls.length;
        await addOverLayer('tile_gsi_relief');

        expect(fakeMap.addSource.mock.calls.length).toBe(addSourceCount);
        expect(isLayerActive('tile_gsi_relief')).toBe(true);
    });

    it('同じレイヤーの追加が進行中の場合は先行処理を共有する', async () => {
        let completeAdd;
        addGeoJsonLayer.mockImplementationOnce(() => new Promise((resolve) => {
            completeAdd = resolve;
        }));

        const firstAdd = addOverLayer('geojson_concurrent_add');
        const secondAdd = addOverLayer('geojson_concurrent_add');

        expect(addGeoJsonLayer).toHaveBeenCalledTimes(1);
        completeAdd(true);
        await Promise.all([firstAdd, secondAdd]);

        expect(isLayerActive('geojson_concurrent_add')).toBe(true);
        expect(setCookie).toHaveBeenCalledTimes(1);
    });

    it('removeOverLayer は登録済みレイヤーを削除してCookieへ保存する', async () => {
        await addOverLayer('geojson_test_remove_ok');
        setCookie.mockClear();

        await removeOverLayer('geojson_test_remove_ok');

        expect(removeClickEvent).toHaveBeenCalledWith('geojson_test_remove_ok');
        expect(isLayerActive('geojson_test_remove_ok')).toBe(false);
        expect(setCookie).toHaveBeenCalledWith('currentLayer', expect.not.arrayContaining(['geojson_test_remove_ok']), 30);
    });

    it('removeOverLayer は未登録のレイヤーに対しては何もしない', async () => {
        await removeOverLayer('geojson_test_never_added');

        expect(setCookie).not.toHaveBeenCalled();
    });

    it('updateBaseMap はスタイルを変更しCookieへ保存する', () => {
        updateBaseMap(mapStyle.OSM_PLANET_MAP);

        expect(setCookie).toHaveBeenCalledWith('currentMap', mapStyle.OSM_PLANET_MAP, 30);
        expect(getCurrentMapStyleUrl()).toBe(getMapStyle(mapStyle.OSM_PLANET_MAP));
    });

    it('updateBaseMap は同一スタイルへの変更を繰り返しても何もしない', () => {
        updateBaseMap(mapStyle.OTM_MAP);
        vi.clearAllMocks();

        updateBaseMap(mapStyle.OTM_MAP);

        expect(setCookie).not.toHaveBeenCalled();
    });
});


