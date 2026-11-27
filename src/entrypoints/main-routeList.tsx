/**
 * 航路一覧ページ（routeList.html）のエントリーポイント
 * React アプリ（routeListApp.tsx）はプリレンダリング済み HTML の初回描画後に読み込んでハイドレーションする
 */
import '../styles/tailwind.css';
import { loadGoogleAnalytics } from '../adapters/analytics/googleAnalyticsLoader';
import { afterFirstPaint } from './afterFirstPaint';

loadGoogleAnalytics();

afterFirstPaint(() => {
    void import('./routeListApp').then(({ startRouteListApp }) => startRouteListApp(document.getElementById('app') as HTMLElement));
});
