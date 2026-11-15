/**
 * データローディングモジュール
 *
 * 責務:
 * - GeoJSONと詳細情報JSONの非同期読み込み
 * - データのマージと統合
 * - ネットワーク再試行ロジック
 * - ローディング表示（LoadingPort を注入）の制御
 */
import type { LoadingPort } from '../../application/ports';
import { fetchWithRetry } from '../http/fetchWithRetry';

const noopLoading: LoadingPort = { show: () => {}, hide: () => {} };
let loadingIndicator: LoadingPort = noopLoading;

/** ローディング表示の実装を差し込む（presentation の loadingIndicator を entrypoints で注入） */
export function configureLoadingIndicator(port: LoadingPort | null): void {
    loadingIndicator = port ?? noopLoading;
}

/**
 * ローディング状態を管理するラッパー関数
 * callback 内のエラーが発生しても確実にローディングを非表示にする
 */
async function withLoading<T>(callback: () => Promise<T>): Promise<T> {
    try {
        loadingIndicator.show();
        return await callback();
    } finally {
        loadingIndicator.hide();
    }
}

/**
 * GeoJSONをロードする関数
 */
export async function loadData<T = unknown>(geojsonPath: string): Promise<T> {
    try {
        return await withLoading(async () => {
            const geojsonResponse = await fetchWithRetry(geojsonPath);
            return await geojsonResponse.json() as T;
        });
    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
        throw error;
    }
}

interface FeatureWithProperties {
    properties: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * GeoJSONと詳細情報をロードしてマージする関数
 * @param matchProperty - 結合に使用するプロパティ名
 * @param detailsPriority - 同一プロパティのとき詳細情報ファイルを優先するかどうか
 */
export async function loadAndMergeData(
    geojsonPath: string,
    detailsPath: string,
    matchProperty: string,
    detailsPriority = false,
): Promise<{ features: FeatureWithProperties[]; [key: string]: unknown }> {
    try {
        return await withLoading(async () => {
            // GeoJSONと詳細情報を並列取得
            const [geojsonResponse, detailsResponse] = await Promise.all([
                fetchWithRetry(geojsonPath),
                fetchWithRetry(detailsPath),
            ]);

            const geojson = await geojsonResponse.json() as { features: FeatureWithProperties[] };
            const details = await detailsResponse.json() as Record<string, Record<string, unknown>>;

            // GeoJSONに詳細情報を追加
            geojson.features = geojson.features.map((feature) => {
                const featureValue = feature.properties[matchProperty] as string;
                const matchedDetail = details[featureValue] || {};

                return {
                    ...feature,
                    properties: detailsPriority
                        ? { ...feature.properties, ...matchedDetail }
                        : { ...matchedDetail, ...feature.properties },
                };
            });

            return geojson;
        });
    } catch (error) {
        console.error("データの読み込みまたは結合に失敗しました:", error);
        throw error;
    }
}

export { fetchWithRetry };
