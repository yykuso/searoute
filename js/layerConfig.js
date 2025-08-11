/**
 * レイヤー設定ファイル
 * 新しいレイヤーを追加する際は、このファイルを編集するだけで自動的にレイヤーコントロールに追加されます
 */

/**
 * レイヤー設定を生成する関数
 * @param {Object} mapStyle - マップスタイル定義オブジェクト
 * @param {Array} defaultLayer - デフォルトで表示するレイヤーのリスト
 * @param {Function} isIdInLayer - レイヤーが含まれているかチェックする関数
 * @returns {Object} レイヤー設定オブジェクト
 */
export function createLayersConfig(mapStyle, defaultLayer, isIdInLayer) {
    return {
        // ベースレイヤー（背景地図）
        base: {
            'OSM Custom': {
                id: mapStyle["OSM_CUSTOM_MAP"],
                name: 'OSM Custom'
            },
            'OSM Bright': {
                id: mapStyle["OSM_BRIGHT_MAP"],
                name: 'OSM Bright'
            },
            'OSM Planet': {
                id: mapStyle["OSM_PLANET_MAP"],
                name: 'OSM Planet'
            },
            '地理院 標準': {
                id: mapStyle["GSI_STD_MAP"],
                name: '地理院 標準'
            },
            '地理院 淡色': {
                id: mapStyle["GSI_PALE_MAP"],
                name: '地理院 淡色'
            },
            '地理院 白地図': {
                id: mapStyle["GSI_BLANK_MAP"],
                name: '地理院 白地図'
            },
            'OpenTopoMap': {
                id: mapStyle["OTM_MAP"],
                name: 'OpenTopoMap'
            },
            'TransportMap': {
                id: mapStyle["TRANSPORT_MAP"],
                name: 'TransportMap'
            },
        },

        // オーバーレイレイヤー（ラスタータイル）
        overlay: {
            tile_gsi_photo: {
                name: '地理院 写真',
                visible: isIdInLayer(defaultLayer, 'tile_gsi_photo')
            },
            tile_gsi_relief: {
                name: '地理院 標高図',
                visible: isIdInLayer(defaultLayer, 'tile_gsi_relief')
            },
            tile_esriimagery: {
                name: 'EsriWorldImagery',
                visible: isIdInLayer(defaultLayer, 'tile_esriimagery')
            },
            tile_railwaymap: {
                name: 'OpenRailwayMap',
                visible: isIdInLayer(defaultLayer, 'tile_railwaymap')
            },
            tile_openseamap: {
                name: 'OpenSeaMap',
                visible: isIdInLayer(defaultLayer, 'tile_openseamap')
            },
            // 新しいオーバーレイレイヤーを追加する場合は、ここに追加
            // 例：天気情報レイヤー
            // tile_weather: {
            //     name: '天気情報',
            //     visible: isIdInLayer(defaultLayer, 'tile_weather')
            // },
            // 例：交通情報レイヤー
            // tile_traffic: {
            //     name: '交通情報',
            //     visible: isIdInLayer(defaultLayer, 'tile_traffic')
            // },
        },

        // GeoJSONレイヤー（ベクターデータ）
        geojson: {
            geojson_port: {
                name: '港湾情報',
                visible: isIdInLayer(defaultLayer, 'geojson_port')
            },
            geojson_sea_route: {
                name: '国内航路',
                visible: isIdInLayer(defaultLayer, 'geojson_sea_route')
            },
            geojson_international_sea_route: {
                name: '国際航路',
                visible: isIdInLayer(defaultLayer, 'geojson_international_sea_route')
            },
            geojson_limited_sea_route: {
                name: '期間限定航路',
                visible: isIdInLayer(defaultLayer, 'geojson_limited_sea_route')
            },
            // 新しいGeoJSONレイヤーを追加する場合は、ここに追加
            // 例：観光スポット
            // geojson_tourism: {
            //     name: '観光スポット',
            //     visible: isIdInLayer(defaultLayer, 'geojson_tourism')
            // },
            // 例：気象観測所
            // geojson_weather_stations: {
            //     name: '気象観測所',
            //     visible: isIdInLayer(defaultLayer, 'geojson_weather_stations')
            // },
        }
    };
}

/**
 * レイヤー設定の例 - 新しいレイヤーを追加する際の参考
 */
export const layerConfigExample = {
    // ベースレイヤー追加例
    base: {
        'New Base Map': {
            id: 999, // mapStyleで定義された数値ID
            name: '新しい背景地図'
        }
    },

    // オーバーレイレイヤー追加例
    overlay: {
        tile_new_overlay: {
            name: '新しいオーバーレイ',
            visible: false // デフォルトの表示状態
        }
    },

    // GeoJSONレイヤー追加例
    geojson: {
        geojson_new_data: {
            name: '新しいデータ',
            visible: true // デフォルトの表示状態
        }
    }
};
