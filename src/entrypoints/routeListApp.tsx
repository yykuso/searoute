/**
 * 航路一覧ページの React アプリ（main-routeList.tsx から初回描画後に動的 import する）
 */
import { ROUTE_LIST_SNAPSHOT_ID, parseRouteListSnapshot } from '../application/routeListSnapshot';
import { RouteListPage } from '../presentation/routeList/RouteListPage';
import { mountApp } from './mountApp';
import { createRouteListServices } from './routeListServices';

export function startRouteListApp(container: HTMLElement): void {
    const initialTables = parseRouteListSnapshot(
        document.getElementById(ROUTE_LIST_SNAPSHOT_ID)?.textContent,
    );
    const { viewModel } = createRouteListServices({ initialTables: initialTables ?? undefined });
    mountApp(container, <RouteListPage viewModel={viewModel} />);
    if (!initialTables) void viewModel.initialize();
}
