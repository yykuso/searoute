/**
 * データローディングモジュール
 *
 * 責務:
 * - GeoJSONと詳細情報JSONの非同期読み込み
 * - データのマージと統合
 * - ネットワーク再試行ロジック
 * - ローディングアニメーション制御
 */

// ローディング数
var loading = 0;

/**
 * ローディング状態を管理するラッパー関数
 * callback 内のエラーが発生しても確実にローディングを非表示にする
 * @param {Function} callback - 実行する非同期関数
 * @returns {Promise<any>} - callback の戻り値
 */
async function withLoading(callback) {
    try {
        await showLoadingAnimation();
        return await callback();
    } finally {
        await hideLoadingAnimation();
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
export async function loadAndMergeData(geojsonPath, detailsPath, matchProperty, detailsPriority = false) {
    try {
        return await withLoading(async () => {
            // GeoJSONと詳細情報を並列取得
            const [geojsonResponse, detailsResponse] = await Promise.all([
                fetchWithRetry(geojsonPath),
                fetchWithRetry(detailsPath)
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
                        : { ...matchedDetail, ...feature.properties }
                };
            });

            return geojson;
        });
    } catch (error) {
        console.error("データの読み込みまたは結合に失敗しました:", error);
        throw error;
    }
}

/**
 * 指定された回数だけリトライするfetch関数
 * @param {string} url - リクエストURL
 * @param {number} retries - リトライ回数
 * @param {number} delay - リトライ間隔（ミリ秒）
 * @returns {Promise<Response>} - fetchのレスポンス
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i < retries - 1) {
                console.warn(`Fetch failed, retrying... (${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error;
            }
        }
    }
}

/**
 * ローディングアニメーションを表示する関数
 */
async function showLoadingAnimation() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loading++;
        loadingElement.style.display = 'block';
    }
}

/**
 * ローディングアニメーションを非表示にする関数
 */
async function hideLoadingAnimation() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loading--;
        if(loading <= 0) {
            loadingElement.style.display = 'none';
        }
    }
}
