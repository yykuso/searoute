/**
 * 航路一覧ページの React アプリ（main-routeList.tsx から初回描画後に動的 import する）
 */
import { RouteListPage } from '../presentation/routeList/RouteListPage';
import { mountApp } from './mountApp';
import { createRouteListServices } from './routeListServices';

export function startRouteListApp(container: HTMLElement): void {
    const { viewModel } = createRouteListServices();
    mountApp(container, <RouteListPage viewModel={viewModel} />);
    void viewModel.initialize();
}
