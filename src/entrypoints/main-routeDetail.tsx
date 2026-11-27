/**
 * 航路詳細ページ（/route/<routeId>/。雛形は routeDetail.html）のエントリーポイント
 * 本文はビルド時にプリレンダリング済み。ここでは CSS とアクセス解析だけを読み込む
 */
import '../styles/tailwind.css';
import { loadGoogleAnalytics } from '../adapters/analytics/googleAnalyticsLoader';

loadGoogleAnalytics();
