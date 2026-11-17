/**
 * 航路データ（PMTiles・詳細 JSON・一覧用 JSON）の配信元
 *
 * 配信元は本番のオリジン（searoute.info・*.searoute.pages.dev 等）にしか CORS を許可していない。
 * 開発サーバー（npm run dev）では vite.config.ts が __SEAROUTE_DEV_ROUTE_DATA_BASE__ に
 * 同じオリジンのプロキシのパスを設定する（ビルド・テストでは未定義のため本番の URL を使う）。
 */
declare const __SEAROUTE_DEV_ROUTE_DATA_BASE__: string | undefined;

export const ROUTE_DATA_BASE_URL: string = typeof __SEAROUTE_DEV_ROUTE_DATA_BASE__ === 'string'
    ? __SEAROUTE_DEV_ROUTE_DATA_BASE__
    : 'https://pmtiles.searoute.info';
