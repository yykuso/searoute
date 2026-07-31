import { describe, expect, it, vi } from 'vitest';
import { createRouteListRepository } from '../../../js/presentation/routeList/routeListViewModel.js';

function jsonResponse(body, ok = true) {
    return { ok, status: ok ? 200 : 500, json: async () => body };
}

describe('routeListRepository', () => {
    it('正規化済みの行データを返す', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
            records: [{ routeId: '2', businessName: 'Example', routeName: 'Route A' }],
        }));
        const repository = createRouteListRepository({ fetchImpl });

        const rows = await repository.loadRouteRows('https://example.com/data.json');

        expect(fetchImpl).toHaveBeenCalledWith('https://example.com/data.json');
        expect(rows).toEqual([{ routeId: '2', businessName: 'Example', routeName: 'Route A' }]);
    });

    it('レスポンスが失敗した場合は例外を投げる', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));
        const repository = createRouteListRepository({ fetchImpl });

        await expect(repository.loadRouteRows('https://example.com/bad.json')).rejects.toThrow('HTTP error! status: 500');
    });
});
