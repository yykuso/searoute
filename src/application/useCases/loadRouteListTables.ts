import { getVisibleRouteColumns } from '../../domain/route';
import type { RouteListRepository } from '../ports';
import type { RouteTableConfig, RouteTableState } from '../viewModels/routeListViewModel';

/** 全テーブルの航路データを取得する。1件でも失敗したら dataPath を含むエラーで reject する */
export async function loadRouteListTables(
    configs: RouteTableConfig[],
    repository: RouteListRepository,
): Promise<RouteTableState[]> {
    return Promise.all(configs.map(async (config) => {
        try {
            const rows = await repository.loadRouteRows(config.dataPath);
            return {
                selector: config.selector,
                sourceId: config.sourceId,
                rows,
                visibleColumns: getVisibleRouteColumns(rows),
            };
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            throw new Error(`航路データの取得に失敗しました: ${config.dataPath} (${reason})`, { cause: error });
        }
    }));
}
