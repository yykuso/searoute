import { describe, expect, it, vi } from 'vitest';
import { createRouteListViewModel } from '../../../js/presentation/routeList/routeListViewModel.js';

describe('routeListViewModel', () => {
    it('initialize はテーブルを読み込んで ready 状態へ遷移する', async () => {
        const repository = {
            loadRouteRows: vi
                .fn()
                .mockResolvedValueOnce([{ routeId: '2', routeName: 'Route A', businessName: 'Example Ferry' }])
                .mockResolvedValueOnce([{ routeId: '8', routeName: 'Route B', businessName: 'Island Lines', shipName: 'Sea Bird' }]),
        };
        const viewModel = createRouteListViewModel({
            tables: [
                { dataPath: 'a.json', selector: '.a tbody', sourceId: 'a' },
                { dataPath: 'b.json', selector: '.b tbody', sourceId: 'b' },
            ],
            repository,
        });

        const snapshots = [];
        viewModel.subscribe((state) => {
            snapshots.push(state);
        });

        await viewModel.initialize();

        const last = snapshots.at(-1);
        expect(repository.loadRouteRows).toHaveBeenNthCalledWith(1, 'a.json');
        expect(repository.loadRouteRows).toHaveBeenNthCalledWith(2, 'b.json');
        expect(last.status).toBe('ready');
        expect(last.tables).toHaveLength(2);
        expect(last.tables[0].visibleColumns).toEqual(['routeId', 'businessName', 'routeName']);
        expect(last.tables[1].visibleColumns).toEqual(['routeId', 'businessName', 'routeName', 'shipName']);
        expect(last.errorMessage).toBe('');
    });

    it('search/reset は query を更新する', () => {
        const viewModel = createRouteListViewModel({
            tables: [],
            repository: { loadRouteRows: vi.fn() },
        });

        viewModel.search('Ocean');
        expect(viewModel.getState().query).toBe('Ocean');

        viewModel.reset();
        expect(viewModel.getState().query).toBe('');
    });

    it('読み込み失敗時は error 状態とメッセージを設定し処理を継続する', async () => {
        const logger = { error: vi.fn() };
        const repository = {
            loadRouteRows: vi
                .fn()
                .mockRejectedValueOnce(new Error('network'))
                .mockResolvedValueOnce([{ routeId: '5', routeName: 'Route C', businessName: 'Port Line' }]),
        };
        const viewModel = createRouteListViewModel({
            tables: [
                { dataPath: 'missing.json', selector: '.missing tbody', sourceId: 'missing' },
                { dataPath: 'ok.json', selector: '.ok tbody', sourceId: 'ok' },
            ],
            repository,
            logger,
        });

        await viewModel.initialize();

        const state = viewModel.getState();
        expect(state.status).toBe('error');
        expect(state.errorMessage).toBe('一部データの読み込みに失敗しました。');
        expect(state.tables).toHaveLength(2);
        expect(state.tables[0].rows).toEqual([]);
        expect(state.tables[1].rows).toHaveLength(1);
        expect(logger.error).toHaveBeenCalled();
    });
});