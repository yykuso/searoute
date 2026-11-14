import { getVisibleRouteColumns } from '../../domain/route';
import type { RouteColumn, RouteRow } from '../../domain/route';
import type { LoggerPort, RouteListRepository } from '../ports';

export interface RouteTableConfig {
    dataPath: string;
    selector: string;
    sourceId: string;
}

export interface RouteTableState {
    selector: string;
    sourceId: string;
    rows: RouteRow[];
    visibleColumns: RouteColumn[];
}

export interface RouteListState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    tables: RouteTableState[];
    query: string;
    errorMessage: string;
}

export interface RouteListViewModelOptions {
    tables: RouteTableConfig[];
    repository: RouteListRepository;
    logger?: Pick<LoggerPort, 'error'>;
}

type Listener = (state: RouteListState) => void;

function createInitialState(): RouteListState {
    return {
        status: 'idle',
        tables: [],
        query: '',
        errorMessage: '',
    };
}

export function createRouteListViewModel({
    tables,
    repository,
    logger = console,
}: RouteListViewModelOptions) {
    const listeners = new Set<Listener>();
    const state = createInitialState();

    function getState(): RouteListState {
        return {
            ...state,
            tables: state.tables.map((table) => ({
                ...table,
                rows: [...table.rows],
                visibleColumns: [...table.visibleColumns],
            })),
        };
    }

    function notify(): void {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    async function initialize(): Promise<void> {
        state.status = 'loading';
        state.errorMessage = '';
        notify();

        const loadedTables: RouteTableState[] = [];
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

    function search(query: string | null | undefined): void {
        state.query = query || '';
        notify();
    }

    function reset(): void {
        state.query = '';
        notify();
    }

    function subscribe(listener: Listener): () => boolean {
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

export type RouteListViewModel = ReturnType<typeof createRouteListViewModel>;
