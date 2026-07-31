import { getVisibleRouteColumns } from '../../domain/route.js';
import { createRouteListRepository } from '../../adapters/data/routeListRepository.js';

function createInitialState() {
    return {
        status: 'idle',
        tables: [],
        query: '',
        errorMessage: '',
    };
}

export function createRouteListViewModel({
    tables,
    repository = createRouteListRepository(),
    logger = console,
} = {}) {
    const listeners = new Set();
    const state = createInitialState();

    function getState() {
        return {
            ...state,
            tables: state.tables.map((table) => ({
                ...table,
                rows: [...table.rows],
                visibleColumns: [...table.visibleColumns],
            })),
        };
    }

    function notify() {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    async function initialize() {
        state.status = 'loading';
        state.errorMessage = '';
        notify();

        const loadedTables = [];
        let failedCount = 0;

        for (const config of tables) {
            try {
                const rows = await repository.loadRouteRows(config.dataPath);
                loadedTables.push({
                    selector: config.selector,
                    sourceId: config.sourceId,
                    rows,
                    visibleColumns: getVisibleRouteColumns(rows),
                });
            } catch (error) {
                failedCount += 1;
                logger.error(`データ読み込み失敗 (${config.dataPath}):`, error);
                loadedTables.push({
                    selector: config.selector,
                    sourceId: config.sourceId,
                    rows: [],
                    visibleColumns: ['routeId', 'businessName', 'routeName', 'info', 'shipName', 'url'],
                });
            }
        }

        state.tables = loadedTables;
        state.status = failedCount > 0 ? 'error' : 'ready';
        state.errorMessage = failedCount > 0 ? '一部データの読み込みに失敗しました。' : '';
        notify();
    }

    function search(query) {
        state.query = query || '';
        notify();
    }

    function reset() {
        state.query = '';
        notify();
    }

    function subscribe(listener) {
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
    }

    return {
        getState,
        initialize,
        search,
        reset,
        subscribe,
    };
}