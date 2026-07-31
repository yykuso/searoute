/**
 * 航路一覧ページのエントリーポイント
 * テーブル設定を定義し、View と ViewModel の生成・接続を行う
 */
import { createRouteListPageView } from '../presentation/routeList/routeListView.js';
import { createRouteListViewModel } from '../presentation/routeList/routeListViewModel.js';

// テーブル設定
const TABLE_CONFIGS = [
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

const view = createRouteListPageView();
const viewModel = createRouteListViewModel({ tables: TABLE_CONFIGS });

viewModel.subscribe((state) => {
    view.render(state);
});

view.bindSearch(() => {
    viewModel.search(view.getSearchQuery());
});

view.bindReset(() => {
    viewModel.reset();
});

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    await viewModel.initialize();
});