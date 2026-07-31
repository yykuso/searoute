/**
 * データローディングモジュール
 *
 * 責務:
 * - GeoJSONと詳細情報JSONの非同期読み込み
 * - データのマージと統合
 * - ネットワーク再試行ロジック
 * - ローディングアニメーション制御
 */

import { fetchWithRetry } from '../http/fetchWithRetry.js';
import { createLoadingIndicator } from '../../presentation/loadingIndicator.js';

const loadingIndicator = createLoadingIndicator();

/**
 * ローディング状態を管理するラッパー関数
 * callback 内のエラーが発生しても確実にローディングを非表示にする
 * @param {Function} callback - 実行する非同期関数
 * @returns {Promise<any>} - callback の戻り値
 */
async function withLoading(callback) {
  try {
    loadingIndicator.show();
    return await callback();
  } finally {
    loadingIndicator.hide();
  }
}

/**
 * GeoJSONをロードする関数
 * @param {string} geojsonPath - GeoJSONファイルのパス
 * @returns {Promise<Object>} - GeoJSONデータ
 */
export async function loadData(geojsonPath) {
  try {
    return await withLoading(async () => {
      const geojsonResponse = await fetchWithRetry(geojsonPath);
      return await geojsonResponse.json();
    });
  } catch (error) {
    console.error("データの読み込みに失敗しました:", error);
    throw error;
  }
}

/**
 * GeoJSONと詳細情報をロードしてマージする関数
 * @param {string} geojsonPath - GeoJSONファイルのパス
 * @param {string} detailsPath - 詳細情報ファイルのパス
 * @param {string} matchProperty - 結合に使用するプロパティ名
 * @param {boolean} [detailsPriority=false] - 同一プロパティのとき詳細情報ファイルを優先するかどうか
 * @returns {Promise<Object>} - マージ済みのGeoJSONデータ
 */
export async function loadAndMergeData(
  geojsonPath,
  detailsPath,
  matchProperty,
  detailsPriority = false,
) {
  try {
    return await withLoading(async () => {
      // GeoJSONと詳細情報を並列取得
      const [geojsonResponse, detailsResponse] = await Promise.all([
        fetchWithRetry(geojsonPath),
        fetchWithRetry(detailsPath),
      ]);

      const geojson = await geojsonResponse.json();
      const details = await detailsResponse.json();

      // GeoJSONに詳細情報を追加
      geojson.features = geojson.features.map((feature) => {
        const featureValue = feature.properties[matchProperty];
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
