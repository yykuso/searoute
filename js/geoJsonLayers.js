import { loadData, loadAndMergeData } from './dataLoader.js';
import { map } from './common.js';

// EventHandle情報の保存
var eventHandle = {};

// ポップアップ閉じるボタン表示、自動閉じ無効化
const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
});

/**
 * GeoJsonLayerを追加する関数
 * @param {string} id - GeoJsonのID
 */
export async function addGeoJsonLayer(id) {
    switch (id) {
        case "geojson_port":
            addGeoJsonPortLayer();
            addPortClickEvent("geojson_port");
            break;
        case "geojson_sea_route":
            addGeoJsonSeaRouteLayer();
            addSeaRouteClickEvent("geojson_sea_route", "geojson_sea_route_outline");
            break;
        case "geojson_international_sea_route":
            addGeoJsonInternationalSeaRouteLayer();
            addSeaRouteClickEvent("geojson_international_sea_route", "geojson_international_sea_route_outline");
            break;
        case "geojson_limited_sea_route":
            addGeoJsonLimitedSeaRouteLayer();
            addSeaRouteClickEvent("geojson_limited_sea_route", "geojson_limited_sea_route_outline");
            break;
        default:
            console.log('[Error] Layer not found : addGeoJsonLayer( ' + id + ' )');
            return;
    }
}

/**
 * GeoJsonLayer用のMarkerを追加する関数
 * @param {string} id - ImageID
 * @param {string} url - 画像URL
 */
export async function addMarker(id, url){
    if (!map.hasImage(id)) {
        const anchorImage = await map.loadImage(url);
        map.addImage(id, anchorImage.data);
    }
}

async function addGeoJsonPortLayer() {
    // マーカー読み込み
    addMarker('anchor_marker', './img/anchor.png');
    var portGeojson = await loadData('./data/portData.geojson');

    map.addSource('geojson_port', {
        type: 'geojson',
        data: portGeojson,
        attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C02-v3_2.html' target='_blank'>「国土数値情報（港湾データ）」</a>を加工して作成",
    });
    map.addLayer({
        id: 'geojson_port',
        type: 'symbol',
        source: 'geojson_port',
        layout: {
            'icon-image': 'anchor_marker',
            'icon-size': 0.3,
            'text-field': ['get', 'Name'],
            'text-font': ["NotoSansCJKjp-Regular"],
            'text-size': 12,
            'text-offset': [0, 0.8],
            'text-anchor': 'top'
        },
    });
}

async function addGeoJsonSeaRouteLayer() {
    var seaRouteGeojson = await loadAndMergeData(
        './data/seaRoute.geojson',
        './data/seaRouteDetails.json',
        'routeId'
    );
    map.addSource('geojson_sea_route', {
        type: 'geojson',
        data: seaRouteGeojson,
    });
    map.addLayer({
        // 線のアウトライン
        id: 'geojson_sea_route_outline',
        type: 'line',
        source: 'geojson_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#FFFFFF',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 3], 0.5],
                6,    // ズームレベル = 6
                ['+', ['*', ['coalesce', ['get', 'freq'], 3], 1.0], 4]
            ],
            'line-opacity': 0.5
        }
    });
    map.addLayer({
        // 実線
        id: 'geojson_sea_route_solidline',
        type: 'line',
        source: 'geojson_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], null],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 3], 0.5],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 3], 1.0]
            ],
            'line-dasharray': [1, 0],
        }
    });
    map.addLayer({
        // 破線
        id: 'geojson_sea_route_dashline',
        type: 'line',
        source: 'geojson_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], 'season'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 3], 0.5],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 3], 1.0]
            ],
            'line-dasharray': [1, 2],
        }
    });
    map.addLayer({
        // 点線
        id: 'geojson_sea_route_thinline',
        type: 'line',
        source: 'geojson_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], 'suspend'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 4],
        }
    });
    map.addLayer({
        // キャプション
        id: 'geojson_sea_route_name',
        type: 'symbol',
        source: 'geojson_sea_route',
        layout: {
            'symbol-placement': 'line',
            "text-offset": [0, 1],
            'text-field': [
                'step',
                ['zoom'],
                '',    // ズームレベル < 4
                4,    // ズームレベル >= 4
                ['get', 'businessName'],
                6,   // ズームレベル >= 6
                [
                    'format',
                    ['get', 'businessName'],{},
                    ' (',{},
                    ['get', 'routeName'],{},
                    ') ',{}
                ]
            ],
            'text-font': ["NotoSansCJKjp-Regular"],
            'text-size': 9
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
            'text-halo-blur': 2
        }
    });
}

async function addGeoJsonInternationalSeaRouteLayer() {
    // 航路情報(国際)
    var seaRouteGeojson = await loadAndMergeData(
        './data/internationalSeaRoute.geojson',
        './data/internationalSeaRouteDetails.json',
        'routeId'
    );
    map.addSource('geojson_international_sea_route', {
        type: 'geojson',
        data: seaRouteGeojson,
    });
    map.addLayer({
        // 線のアウトライン
        id: 'geojson_international_sea_route_outline',
        type: 'line',
        source: 'geojson_international_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#FFFFFF',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 3], 0.5],
                6,    // ズームレベル = 6
                ['+', ['*', ['coalesce', ['get', 'freq'], 3], 1.0], 4]
            ],
            'line-opacity': 0.5
        }
    });
    map.addLayer({
        // 実線
        id: 'geojson_international_sea_route_solidline',
        type: 'line',
        source: 'geojson_international_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], null],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 0],
        }
    });
    map.addLayer({
        // 破線
        id: 'geojson_international_sea_route_dashline',
        type: 'line',
        source: 'geojson_international_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], 'season'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 2],
        }
    });
    map.addLayer({
        // 点線
        id: 'geojson_international_sea_route_thinline',
        type: 'line',
        source: 'geojson_international_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], 'suspend'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 4],
        }
    });
    map.addLayer({
        // キャプション
        id: 'geojson_international_sea_route_name',
        type: 'symbol',
        source: 'geojson_international_sea_route',
        layout: {
            'symbol-placement': 'line',
            "text-offset": [0, 1],
            'text-field': [
                'step',
                ['zoom'],
                '',    // ズームレベル < 8
                4,    // ズームレベル >= 8
                ['get', 'businessName'],
                6,   // ズームレベル >= 10
                [
                    'format',
                    ['get', 'businessName'],{},
                    ' (',{},
                    ['get', 'routeName'],{},
                    ') ',{}
                ]
            ],
            'text-font': ["NotoSansCJKjp-Regular"],
            'text-size': 9
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
            'text-halo-blur': 2
        }
    });
}

async function addGeoJsonLimitedSeaRouteLayer() {
    // 航路情報(国際)
    var seaRouteGeojson = await loadAndMergeData(
        './data/limitedSeaRoute.geojson',
        './data/limitedSeaRouteDetails.json',
        'routeId'
    );
    map.addSource('geojson_limited_sea_route', {
        type: 'geojson',
        data: seaRouteGeojson,
    });
    map.addLayer({
        // 線のアウトライン
        id: 'geojson_limited_sea_route_outline',
        type: 'line',
        source: 'geojson_limited_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#000000',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 3], 0.5],
                6,    // ズームレベル = 6
                ['+', ['*', ['coalesce', ['get', 'freq'], 3], 1.0], 4]
            ],
            'line-opacity': 0.5
        }
    });
    map.addLayer({
        // 実線
        id: 'geojson_limited_sea_route_solidline',
        type: 'line',
        source: 'geojson_limited_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], null],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 0],
        }
    });
    map.addLayer({
        // 破線
        id: 'geojson_limited_sea_route_dashline',
        type: 'line',
        source: 'geojson_limited_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], 'season'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 2],
        }
    });
    map.addLayer({
        // 点線
        id: 'geojson_limited_sea_route_thinline',
        type: 'line',
        source: 'geojson_limited_sea_route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        filter: ['==', ['get', 'note'], 'suspend'],
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#000000'],
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                3,    // ズームレベル = 3
                ['*', ['coalesce', ['get', 'freq'], 1], 0.75],
                6,    // ズームレベル = 6
                ['*', ['coalesce', ['get', 'freq'], 1], 1.0]
            ],
            'line-dasharray': [1, 4],
        }
    });
    map.addLayer({
        // キャプション
        id: 'geojson_limited_sea_route_name',
        type: 'symbol',
        source: 'geojson_limited_sea_route',
        layout: {
            'symbol-placement': 'line',
            "text-offset": [0, 1],
            'text-field': [
                'step',
                ['zoom'],
                '',    // ズームレベル < 8
                4,    // ズームレベル >= 8
                ['get', 'businessName'],
                6,   // ズームレベル >= 10
                [
                    'format',
                    ['get', 'businessName'],{},
                    ' (',{},
                    ['get', 'routeName'],{},
                    ') ',{}
                ]
            ],
            'text-font': ["NotoSansCJKjp-Regular"],
            'text-size': 9
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
            'text-halo-blur': 2
        }
    });
}

/**
 * 航路ラインに関するイベントを追加
 * @param {string} id - 紐づけ元GeoJsonのID
 * @param {string} handleId - EventをHandleするID
 */
function addSeaRouteClickEvent(id, handleId = id) {
    map.on('click', handleId, (event) => {
        const coordinates = event.lngLat;
        const properties = event.features[0].properties;

        // businessNameに「（」が含まれる場合に分割
        let businessName = properties.businessName;
        let businessNameSub = '';
        if (businessName.includes('（')) {
            const parts = businessName.split('（');
            businessName = parts[0];
            businessNameSub = parts[1].replace('）', ''); // 閉じ括弧を除去
        }

        // 船舶名をリスト形式に変換
        const shipListHtml = properties.shipName
            ? properties.shipName.split(', ')
                .map(ship => `<li>${ship.trim()}</li>`)
                .join('')
            : '';

        const popupContent = `
        <div class="searoute-popup-box">
            <div class="flex items-center justify-center mb-2 pb-1" style="border-bottom-color: ${properties.color || '#e5e7eb'}; border-bottom-width: 5px; border-bottom-style: solid;">
                <div>
                    <h2 class="flex justify-center text-base font-semibold text-gray-800">${businessName}</h2>
                    ${businessNameSub ? `<p class="flex justify-center text-xs text-gray-600">${businessNameSub}</p>` : ''}
                    </div>
            </div>

            <div class="mb-4">
                <h3 class="text-xs font-semibold text-blue-600 mb-1 flex items-center">
                    <i class="fas fa-route fa-fw mr-2 text-blue-500"></i>航路
                </h3>
                <p class="text-gray-800 text-xs pl-2 leading-relaxed">${properties.routeName || 'N/A'}</p>
            </div>

            <div class="mb-4">
                <h3 class="text-xs font-semibold text-green-600 mb-1 flex items-center">
                    <i class="fas fa-map-pin fa-fw mr-2 text-green-500"></i>選択部分
                </h3>
                <p class="text-gray-800 text-xs pl-2 rounded-md">${properties.portName1 || 'N/A'}～${properties.portName2 || 'N/A'}</p>
            </div>

            ${properties.freqInfo ? `
            <div class="mb-4">
                <h3 class="text-xs font-semibold text-red-600 mb-1 flex items-center">
                    <i class="fas fa-rotate fa-fw mr-2 text-red-500"></i>運行頻度
                </h3>
                <p class="text-gray-800 text-xs pl-2 leading-relaxed">${properties.freqInfo}</p>
            </div>
            ` : ''}

            ${properties.info ? `
            <div class="mb-4">
                <h3 class="text-xs font-semibold text-yellow-600 mb-1 flex items-center">
                    <i class="fas fa-info-circle fa-fw mr-2 text-yellow-500"></i>情報
                </h3>
                <p class="text-gray-800 text-xs pl-2 leading-relaxed">${properties.info}</p>
            </div>
            ` : ''}

            ${properties.shipName ? `
            <div class="mb-4">
                <h3 class="text-xs font-semibold text-purple-600 mb-1 flex items-center">
                    <i class="fas fa-ship fa-fw mr-2 text-purple-500"></i>船舶
                </h3>
                <ul class="list-disc list-inside text-gray-800 text-xs pl-2">
                    ${shipListHtml}
                </ul>
            </div>
            ` : ''}

            ${properties.url ? `
            <div class="mx-4">
                <a href="${properties.url}" target="_blank" rel="noopener noreferrer" class="block w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs py-2 px-3 rounded-lg text-center transition duration-150 ease-in-out shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 flex items-center justify-center">
                    <i class="fas fa-calendar-alt fa-fw mr-1.5"></i>運航スケジュール
                </a>
            </div>
            ` : ''}
        </div>
        `;

        popup
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .setMaxWidth(null)
            .addTo(map);

        gtag('event', 'marker_click', {
            'event_category': 'map',
            'event_label': properties.businessName,
            'value': 1
        });
    });

    map.on('mousemove', handleId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', handleId, () => {
        map.getCanvas().style.cursor = '';
    });

    eventHandle[id] = handleId;
}

/**
 * Portに関するイベントを追加
 * @param {string} id - 紐づけ元GeoJsonのID
 * @param {string} handleId - EventをHandleするID
 */
function addPortClickEvent(id, handleId = id) {
    map.on('click', handleId, (event) => {
        const coordinates = event.lngLat;
        const properties = event.features[0].properties;

        const popupContent = `
            <div class="port-popup-box">
                <h2 class="port-name">${properties.Name}</h2>
            </div>
        `;

        popup
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .setMaxWidth("120px")
            .addTo(map);
    });
    
    map.on('mousemove', handleId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', handleId, () => {
        map.getCanvas().style.cursor = '';
    });
    
    eventHandle[id] = handleId;
}

/**
 * クリックしたときのイベントを削除
 * @param {string} id - 紐づけ元GeoJsonのID
 */
export function removeClickEvent(id) {
    var handleId = eventHandle[id];
    if (handleId) {
        map.off('click', handleId);
    }
}

/**
 * なにもないところをクリックしたときに既存のポップアップを削除
 */
export function addResetClickEvent() {
    map.on('click', (event) => {
        // EvendHandle済みのID
        const validIds = Object.values(eventHandle);
        // クリックした場所の地物
        const features = map.queryRenderedFeatures(event.point);

        // 地物の中で対象のIDがないときポップアップを削除
        if (!features.find(feature => validIds.includes(feature.layer.id))) {
            popup.remove();
        }
    });
}
