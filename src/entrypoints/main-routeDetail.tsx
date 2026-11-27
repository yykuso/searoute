/**
 * 航路詳細ページ（/route/<routeId>/。雛形は routeDetail.html）のエントリーポイント
 * 本文はビルド時にプリレンダリング済み。CSS とアクセス解析を読み込み、
 * 埋め込み地図（MapLibre）は初回描画後に遅延読み込みする
 */
import '../styles/tailwind.css';
import { loadGoogleAnalytics } from '../adapters/analytics/googleAnalyticsLoader';
import { afterFirstPaint } from './afterFirstPaint';

loadGoogleAnalytics();

afterFirstPaint(() => {
    const element = document.getElementById('route-detail-map');
    if (!element) return;
    void import('../presentation/routeDetail/routeDetailMap').then(({ mountRouteDetailMap }) => mountRouteDetailMap(element));
});
