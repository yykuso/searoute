/**
 * GeoJSONと詳細情報をロードしてマージする関数
 * @param {string} geojsonPath - GeoJSONファイルのパス
 * @param {string} detailsPath - 詳細情報ファイルのパス
 * @param {string} matchProperty - 結合に使用するプロパティ名
 * @returns {Promise<Object>} - マージ済みのGeoJSONデータ
 */
export async function loadAndMergeData(geojsonPath, detailsPath, matchProperty) {
    try {
        // GeoJSONと詳細情報を取得
        const [geojsonResponse, detailsResponse] = await Promise.all([
            fetch(geojsonPath),
            fetch(detailsPath)
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

        return geojson;
    } catch (error) {
        console.error("データの読み込みまたは結合に失敗しました:", error);
        throw error;
    }
}
