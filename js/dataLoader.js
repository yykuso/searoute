// ローディング数
var loading = 0;

/**
 * GeoJSONをロードする関数
 * @param {string} geojsonPath - GeoJSONファイルのパス
 * @returns {Promise<Object>} - マージ済みのGeoJSONデータ
 */
export async function loadData(geojsonPath) {
    try {
        // ローディングアニメーションを表示
        await showLoadingAnimation();

        // GeoJSONを取得
        const geojsonResponse = await fetchWithRetry(geojsonPath);
        const geojson = await geojsonResponse.json();
        
        // ローディングアニメーションを非表示
        await hideLoadingAnimation();

        return geojson;
    
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
 * @returns {Promise<Object>} - マージ済みのGeoJSONデータ
 */
export async function loadAndMergeData(geojsonPath, detailsPath, matchProperty) {
    try {
        // ローディングアニメーションを表示
        await showLoadingAnimation();

        // GeoJSONと詳細情報を取得
        const [geojsonResponse, detailsResponse] = await Promise.all([
            fetchWithRetry(geojsonPath),
            fetchWithRetry(detailsPath)
        ]);

        const geojson = await geojsonResponse.json();
        const details = await detailsResponse.json();

        // GeoJSONに詳細情報を追加
        geojson.features = geojson.features.map((feature) => {
            const featureValue = feature.properties[matchProperty]; // GeoJSONのプロパティ値
            const matchedDetail = details[featureValue] || {}; // JSONで一致する詳細情報を取得

            return {
                ...feature,
                properties: {
                    ...feature.properties,
                    ...matchedDetail // 詳細情報をプロパティに結合
                }
            };
        });
        
        // ローディングアニメーションを非表示
        await hideLoadingAnimation();

        return geojson;
    
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
