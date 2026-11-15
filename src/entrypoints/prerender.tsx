/**
 * ビルド時プリレンダリング（SSG）
 * 各ページの React ツリーを HTML 文字列にし、ビルド成果物の <div id="app"> へ埋め込む（vite.config.ts の prerender プラグインから呼ぶ）
 * 地図・データ取得などブラウザ専用の処理は副作用（useEffect）でのみ動くため、ここではサービスを空実装で渡す
 */
import { renderToString } from 'react-dom/server';
import { createDrawerViewModel } from '../application/viewModels/drawerViewModel';
import { createMapViewModel } from '../application/viewModels/mapViewModel';
import { createRouteListViewModel } from '../application/viewModels/routeListViewModel';
import { createLoadingIndicator } from '../presentation/common/loadingIndicator';
import { MapPage } from '../presentation/map/MapPage';
import { MapServicesProvider } from '../presentation/map/mapPageServices';
import type { MapPageServices } from '../presentation/map/mapPageServices';
import { RouteListPage } from '../presentation/routeList/RouteListPage';

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

export function renderRouteListPage(): string {
    const viewModel = createRouteListViewModel({
        tables: [],
        repository: { loadRouteRows: async () => [] },
    });
    return renderToString(<RouteListPage viewModel={viewModel} />);
}

/** ページごとのプリレンダリング結果（キーはビルド成果物の HTML ファイル名） */
export function renderPages(buildNumber: string): Record<string, string> {
    return {
        'index.html': renderMapPage(buildNumber),
        'routeList.html': renderRouteListPage(),
    };
}
