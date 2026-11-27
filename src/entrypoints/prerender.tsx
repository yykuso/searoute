/// <reference types="node" />
// ビルド時（Node の SSR）専用のモジュールなので Node の型を使う（routePages.json のファイル読み込み・環境変数）
/**
 * ビルド時プリレンダリング（SSG）
 * 各ページの React ツリーを HTML 文字列にし、ビルド成果物の <div id="app"> へ埋め込む（vite.config.ts の prerender プラグインから呼ぶ）
 * 地図・データ取得などブラウザ専用の処理は副作用（useEffect）でのみ動くため、ここではサービスを空実装で渡す
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import type { FetchLike } from '../adapters/http/fetchWithRetry';
import { createRouteListRepository } from '../adapters/data/routeListRepository';
import { buildLlmsFullText, buildRouteListJsonLd } from '../application/routeListPublication';
import { buildRouteDetailHead } from '../application/routeDetailPublication';
import { serializeRouteListSnapshot } from '../application/routeListSnapshot';
import { loadRouteListTables } from '../application/useCases/loadRouteListTables';
import { ROUTE_DATA_BASE_URL } from '../config/routeData';
import { getRelatedRoutes, normalizeRoutePages } from '../domain/routePage';
import type { RoutePageRecord } from '../domain/routePage';
import type { RouteTableState } from '../application/viewModels/routeListViewModel';
import { createDrawerViewModel } from '../application/viewModels/drawerViewModel';
import { createMapViewModel } from '../application/viewModels/mapViewModel';
import { createRouteListViewModel } from '../application/viewModels/routeListViewModel';
import { createLoadingIndicator } from '../presentation/common/loadingIndicator';
import { MapPage } from '../presentation/map/MapPage';
import { MapServicesProvider } from '../presentation/map/mapPageServices';
import type { MapPageServices } from '../presentation/map/mapPageServices';
import { RouteDetailPage } from '../presentation/routeDetail/RouteDetailPage';
import { RouteListPage } from '../presentation/routeList/RouteListPage';
import { ROUTE_LIST_TABLE_CONFIGS } from './routeListServices';

const FETCH_TIMEOUT_MS = 30_000;
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

export { buildLlmsFullText };

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
    const fetchImpl: FetchLike = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const configs = ROUTE_LIST_TABLE_CONFIGS.map((config) => ({ ...config, dataPath: `${config.dataPath}?v=${stamp}` }));
    return loadRouteListTables(configs, createRouteListRepository({ fetchImpl }));
}

/** 航路詳細ページ（キーは route/<routeId>/index.html。同じ事業者の他航路を関連航路として渡す） */
export function renderRouteDetailPages(records: RoutePageRecord[]): Array<{ fileName: string; page: PrerenderedPage }> {
    return records.map((record) => ({
        fileName: `route/${encodeURIComponent(record.routeId)}/index.html`,
        page: {
            app: renderToString(<RouteDetailPage record={record} related={getRelatedRoutes(record, records)} />),
            head: buildRouteDetailHead(record, SITE_URL),
        },
    }));
}

/**
 * ビルド時に航路詳細ページのデータ（routePages.json）を読む
 * SEAROUTE_ROUTE_PAGES_FILE（プロジェクトルートからの相対パス）があればそのファイル、
 * SEAROUTE_SKIP_ROUTE_DATA=1 なら空、それ以外は配信元から取得する（失敗は reject）
 */
export async function loadPrerenderRoutePages(): Promise<RoutePageRecord[]> {
    const file = process.env.SEAROUTE_ROUTE_PAGES_FILE;
    if (file) {
        return normalizeRoutePages(JSON.parse(await readFile(resolve(process.cwd(), file), 'utf8')));
    }
    if (process.env.SEAROUTE_SKIP_ROUTE_DATA === '1') {
        return [];
    }
    const url = `${ROUTE_DATA_BASE_URL}/lightweight/routePages.json?v=${Date.now()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`routePages.json の取得に失敗しました: ${response.status} ${url}`);
    }
    return normalizeRoutePages(await response.json());
}
