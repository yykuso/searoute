/**
 * 航路一覧ページの依存組み立て（Composition Root）
 */
import { createRouteListViewModel } from '../application/viewModels/routeListViewModel';
import type { RouteTableConfig } from '../application/viewModels/routeListViewModel';
import { createRouteListRepository } from '../adapters/data/routeListRepository';

// テーブル設定
export const ROUTE_LIST_TABLE_CONFIGS: RouteTableConfig[] = [
    {
        dataPath: 'https://pmtiles.searoute.info/lightweight/seaRoute.json',
        selector: '.sea-route-table tbody',
        sourceId: 'geojson_sea_route'
    },
    {
        dataPath: 'https://pmtiles.searoute.info/lightweight/seaRoute_international.json',
        selector: '.international-sea-route-table tbody',
        sourceId: 'geojson_international_sea_route'
    },
    {
        dataPath: 'https://pmtiles.searoute.info/lightweight/seaRoute_KR.json',
        selector: '.sea-route-KR-table tbody',
        sourceId: 'geojson_KR_sea_route'
    },
];

export function createRouteListServices() {
    const viewModel = createRouteListViewModel({
        tables: ROUTE_LIST_TABLE_CONFIGS,
        repository: createRouteListRepository(),
    });
    return { viewModel };
}

export type RouteListServices = ReturnType<typeof createRouteListServices>;
