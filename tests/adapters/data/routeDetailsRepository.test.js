import { describe, expect, it, vi } from 'vitest';
import { createRouteDetailsRepository } from '../../../js/adapters/data/routeDetailsRepository.js';

const routeLayerConfigs = {
    domestic: {
        sourceLayer: 'seaRoute',
        datasetName: 'domesticRoutes',
    },
};

describe('routeDetailsRepository', () => {
    it('sourceLayerが見つからない場合にdatasetNameへフォールバックする', async () => {
        const details = { shipName: '第一船' };
        const fetchImpl = vi.fn()
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(details) });
        const repository = createRouteDetailsRepository({
            routeLayerConfigs,
            fetchImpl,
            baseUrl: 'https://example.com/details',
        });

        await expect(repository.loadRouteDetails('route/1', 'domestic')).resolves.toEqual(details);
        expect(fetchImpl).toHaveBeenNthCalledWith(1, 'https://example.com/details/seaRoute/route%2F1.json');
        expect(fetchImpl).toHaveBeenNthCalledWith(2, 'https://example.com/details/domesticRoutes/route%2F1.json');
    });

    it('取得結果をキャッシュする', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ routeName: '本線' }),
        });
        const repository = createRouteDetailsRepository({ routeLayerConfigs, fetchImpl });

        await repository.loadRouteDetails(1, 'domestic');
        await repository.loadRouteDetails(1, 'domestic');

        expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('同じ詳細への同時リクエストを共有する', async () => {
        let resolveResponse;
        const fetchImpl = vi.fn().mockReturnValue(new Promise((resolve) => {
            resolveResponse = resolve;
        }));
        const repository = createRouteDetailsRepository({ routeLayerConfigs, fetchImpl });

        const first = repository.loadRouteDetails(1, 'domestic');
        const second = repository.loadRouteDetails(1, 'domestic');
        resolveResponse({ ok: true, json: () => Promise.resolve({ routeName: '本線' }) });

        await expect(Promise.all([first, second])).resolves.toEqual([
            { routeName: '本線' },
            { routeName: '本線' },
        ]);
        expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('不正な入力と未知のsourceIdでは空オブジェクトを返す', async () => {
        const fetchImpl = vi.fn();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const repository = createRouteDetailsRepository({ routeLayerConfigs, fetchImpl });

        await expect(repository.loadRouteDetails('', 'domestic')).resolves.toEqual({});
        await expect(repository.loadRouteDetails(1, 'unknown')).resolves.toEqual({});
        expect(fetchImpl).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});