/**
 * ビルド時プリレンダリング（SSG）
 * 各ページの React ツリーを HTML 文字列にし、ビルド成果物の <div id="app"> へ埋め込む（vite.config.ts の prerender プラグインから呼ぶ）
 * 地図・データ取得などブラウザ専用の処理は副作用（useEffect）でのみ動くため、ここではサービスを空実装で渡す
 */
import { renderToString } from 'react-dom/server';
import { createRouteListRepository } from '../adapters/data/routeListRepository';
import { buildRouteListJsonLd } from '../application/routeListPublication';
import { serializeRouteListSnapshot } from '../application/routeListSnapshot';
import { loadRouteListTables } from '../application/useCases/loadRouteListTables';
import type { RouteTableState } from '../application/viewModels/routeListViewModel';
import { createDrawerViewModel } from '../application/viewModels/drawerViewModel';
import { createMapViewModel } from '../application/viewModels/mapViewModel';
import { createRouteListViewModel } from '../application/viewModels/routeListViewModel';
import { createLoadingIndicator } from '../presentation/common/loadingIndicator';
import { MapPage } from '../presentation/map/MapPage';
import { MapServicesProvider } from '../presentation/map/mapPageServices';
import type { MapPageServices } from '../presentation/map/mapPageServices';
import { RouteListPage } from '../presentation/routeList/RouteListPage';
import { ROUTE_LIST_TABLE_CONFIGS } from './routeListServices';

export const SITE_URL = 'https://searoute.info';

function unavailable(): never {
    throw new Error('プリレンダリング中は利用できません');
}

/** プリレンダリング用のサービス（描画に必要な初期状態のみ提供） */
export function createStaticMapServices(buildNumber: string): MapPageServices {
    return {
        createMap: unavailable,
        drawerViewModel: createDrawerViewModel(),
        openCoordinate: unavailable,
        mapViewModel: createMapViewModel(),
        getLayersConfig: unavailable,
        createRouteFilterViewModel: unavailable,
        restoreShare: async () => {},
        copyShareUrl: async () => {},
        analytics: { trackEvent: () => {} },
        consent: { hasConsent: () => false, accept: () => {} },
        loading: createLoadingIndicator(),
        buildNumber,
        initialHash: '',
    };
}

export function renderMapPage(buildNumber: string): string {
    return renderToString(
        <MapServicesProvider services={createStaticMapServices(buildNumber)}>
            <MapPage />
        </MapServicesProvider>,
    );
}

export function renderRouteListPage(routeTables: RouteTableState[] = []): string {
    const viewModel = createRouteListViewModel({
        tables: [],
        repository: { loadRouteRows: async () => [] },
        initialTables: routeTables.length > 0 ? routeTables : undefined,
    });
    return renderToString(<RouteListPage viewModel={viewModel} />);
}

export type PrerenderedPage = { app: string; head?: string; bodyEnd?: string };

/** ページごとのプリレンダリング結果（キーはビルド成果物の HTML ファイル名） */
export function renderPages(buildNumber: string, routeTables: RouteTableState[] = []): Record<string, PrerenderedPage> {
    const routeList: PrerenderedPage = { app: renderRouteListPage(routeTables) };
    if (routeTables.length > 0) {
        routeList.head = buildRouteListJsonLd(routeTables, SITE_URL);
        routeList.bodyEnd = serializeRouteListSnapshot(routeTables);
    }
    return {
        'index.html': { app: renderMapPage(buildNumber) },
        'routeList.html': routeList,
    };
}

/** ビルド時に航路一覧データを取得する（1件でも失敗したら reject） */
export function loadPrerenderRouteTables(): Promise<RouteTableState[]> {
    const stamp = Date.now();
    const configs = ROUTE_LIST_TABLE_CONFIGS.map((config) => ({ ...config, dataPath: `${config.dataPath}?v=${stamp}` }));
    return loadRouteListTables(configs, createRouteListRepository());
}
