import { describe, expect, it } from 'vitest';
import { loadRouteListTables } from '../../../src/application/useCases/loadRouteListTables';
import type { RouteTableConfig } from '../../../src/application/viewModels/routeListViewModel';

const configs: RouteTableConfig[] = [
    { dataPath: 'https://example.com/a.json', selector: '.a', sourceId: 'a' },
    { dataPath: 'https://example.com/b.json', selector: '.b', sourceId: 'b' },
    { dataPath: 'https://example.com/c.json', selector: '.c', sourceId: 'c' },
];

describe('loadRouteListTables', () => {
    it('全件成功で設定順のテーブルを返す', async () => {
        const tables = await loadRouteListTables(configs, {
            loadRouteRows: async () => [{ routeId: '1', businessName: 'B', routeName: 'R' }],
        });
        expect(tables).toHaveLength(3);
        expect(tables.map((t) => t.sourceId)).toEqual(['a', 'b', 'c']);
        expect(tables[0].visibleColumns).toEqual(['routeId', 'businessName', 'routeName']);
    });

    it('1件でも失敗したら dataPath を含むエラーで reject する', async () => {
        const promise = loadRouteListTables(configs, {
            loadRouteRows: async (path: string) => {
                if (path.endsWith('b.json')) throw new Error('boom');
                return [];
            },
        });
        await expect(promise).rejects.toThrow('https://example.com/b.json');
    });
});
