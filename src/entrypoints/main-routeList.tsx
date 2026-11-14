/**
 * 航路一覧ページ（routeList.html）のエントリーポイント
 */
import { loadGoogleAnalytics } from '../adapters/analytics/googleAnalyticsLoader';
import { RouteListPage } from '../presentation/routeList/RouteListPage';
import { mountApp } from './mountApp';
import { createRouteListServices } from './routeListServices';

loadGoogleAnalytics();

const { viewModel } = createRouteListServices();

mountApp(
    document.getElementById('app') as HTMLElement,
    <RouteListPage viewModel={viewModel} />,
);

void viewModel.initialize();
