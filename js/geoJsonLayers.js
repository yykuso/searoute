import { loadData, loadAndMergeData } from './dataLoader.js';
import { map } from './common.js';
import { showDetailDrawer, hideDetailDrawer } from './detailDrawer.js';

// EventHandle情報の保存
var eventHandle = {};

// 設定値の管理
let showSuspendedRoutes = true;

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
        const properties = event.features[0].properties;

        // businessNameに「（」が含まれる場合に分割
        let businessName = properties.businessName;
        let businessNameSub = '';
        if (businessName.includes('（')) {
            const parts = businessName.split('（');
            businessName = parts[0];
            businessNameSub = parts[1].replace('）', '');
        }
        const freqInfoHtml = properties.freqInfo
            ? properties.freqInfo.split(', ')
                .map(freqInfo => `<span class="block">${freqInfo.trim()}</span>`)
                .join('')
            : '';
        const infoHtml = properties.info
            ? properties.info.split(', ')
                .map(info => `<span class="block">${info.trim()}</span>`)
                .join('')
            : '';
        const shipListHtml = properties.shipName
            ? properties.shipName.split(', ')
                .map(ship => `<span class="block">・${ship.trim()}</span>`)
                .join('')
            : '';
        const sidebarContent = `
            <div class="mb-3">
                <div style="height:4px; width:100%; background:${properties.color || '#e5e7eb'}; border-radius:6px;"></div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-blue-600 w-24 min-w-[96px] text-center mr-2">
                    <i class="fas fa-route fa-fw mr-1 text-blue-500"></i><span class="mx-auto">航路</span>
                </h3>
                <div class="text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors" onclick="window.zoomToRoute({routeId: '${properties.routeId || ''}', sourceId: '${id}'})">${properties.routeName || 'N/A'}</div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-green-600 w-24 min-w-[96px] text-center mr-2">
                    <i class="fas fa-map-pin fa-fw mr-1 text-green-500"></i><span class="mx-auto">選択部分</span>
                </h3>
                <div class="text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors" onclick="window.zoomToRouteSection('${properties.routeId || ''}', '${properties.lineId || ''}', '${id}')">${(properties.portName1 || 'N/A').replace(/'/g, '&#39;').replace(/"/g, '&quot;')}～${(properties.portName2 || 'N/A').replace(/'/g, '&#39;').replace(/"/g, '&quot;')}</div>
            </div>
            ${properties.freqInfo ? `
                <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                    <h3 class="flex items-center justify-between text-xs font-semibold text-red-600 w-24 min-w-[96px] text-center mr-2">
                        <i class="fas fa-rotate fa-fw mr-1 text-red-500"></i><span class="mx-auto">運行頻度</span>
                    </h3>
                    <div class="text-gray-800 text-xs">${freqInfoHtml}</div>
                </div>
            ` : ''}
            ${properties.info ? `
                <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                    <h3 class="flex items-center justify-between text-xs font-semibold text-yellow-600 w-24 min-w-[96px] text-center mr-2">
                        <i class="fas fa-info-circle fa-fw mr-1 text-yellow-500"></i><span class="mx-auto">情報</span>
                    </h3>
                    <div class="text-gray-800 text-xs">${infoHtml}</div>
                </div>
            ` : ''}
            ${properties.shipName ? `
                <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                    <h3 class="flex items-center justify-between text-xs font-semibold text-purple-600 w-24 min-w-[96px] text-center mr-2">
                        <i class="fas fa-ship fa-fw mr-1 text-purple-500"></i><span class="mx-auto">船舶</span>
                    </h3>
                    <ul class="text-gray-800 text-xs">${shipListHtml}</ul>
                </div>
            ` : ''}
            ${properties.url ? (() => {
                let domain = '';
                try {
                    domain = new URL(properties.url).hostname;
                } catch (e) {
                    domain = properties.url;
                }
                return `
                    <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                        <h3 class="flex items-center justify-between text-xs font-semibold text-indigo-600 w-24 min-w-[96px] text-center mr-2">
                            <i class="fas fa-link fa-fw mr-1.5 text-indigo-500"></i><span class="mx-auto">リンク</span>
                        </h3>
                        <a href="${properties.url}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded">運行スケジュール - ${domain}</a>
                    </div>
                `;
            })() : ''}
            `;

        window.showDetailDrawerWithPinClear(
            sidebarContent,
            businessName,
            businessNameSub
        );
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
        const properties = event.features[0].properties;
        const portName = properties.Name || properties.portName || 'N/A';

        // portNameに「港」や「桟橋」が含まれていない場合は「港」を追加
        const searchPortName = (portName.includes('港') || portName.includes('桟橋')) ? portName : `${portName}港`;
        const googleMapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchPortName)}`;

        const infoHtml = properties.info
            ? properties.info.split(', ')
                .map(info => `<span class="block">${info.trim()}</span>`)
                .join('')
            : '';
        const sidebarContent = `
            <div class="mb-3">
                <div style="height:4px; width:100%; background:#505050; border-radius:6px;"></div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-green-600 w-24 min-w-[96px] text-center mr-2">
                    <i class="fas fa-map-marked-alt fa-fw mr-1 text-green-500"></i><span class="mx-auto">地図</span>
                </h3>
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded">Googleマップで開く</a>
            </div>
            ${properties.info ? `
                <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                    <h3 class="flex items-center justify-between text-xs font-semibold text-yellow-600 w-24 min-w-[96px] text-center mr-2">
                        <i class="fas fa-info-circle fa-fw mr-1 text-yellow-500"></i><span class="mx-auto">情報</span>
                    </h3>
                    <div class="text-gray-800 text-xs">${infoHtml}</div>
                </div>
            ` : ''}
        `;
        window.showDetailDrawerWithPinClear(
            sidebarContent,
            portName,
            "港湾情報"
        );
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
        const validIds = Object.values(eventHandle);
        const features = map.queryRenderedFeatures(event.point);
        if (!features.find(feature => validIds.includes(feature.layer.id))) {
            if (window.hideSidebar) window.hideSidebar();
            // ハイライトも削除
            removeRouteHighlight();
        }
    });
}

/**
 * 航路や航路区間に移動する統一関数をグローバルに公開
 */
window.zoomToRoute = function(params) {
    try {
        // パラメータの解析
        const { routeName, routeId, lineId, sourceId } = params;

        // 現在表示されているソースからフィーチャーを取得
        const source = map.getSource(sourceId);
        if (!source) {
            console.error('Source not found:', sourceId);
            return;
        }

        // sourceのデータを取得
        const data = source._data;
        if (!data || !data.features) {
            console.error('No features found in source:', sourceId);
            return;
        }

        let matchingFeatures = [];
        let searchType = '';

        if (routeName) {
            // routeNameで検索
            matchingFeatures = data.features.filter(feature =>
                feature.properties && feature.properties.routeName === routeName
            );
            searchType = 'routeName';
        } else if (routeId && lineId) {
            // routeIdとlineIdで検索（文字列として比較）
            matchingFeatures = data.features.filter(feature =>
                feature.properties &&
                String(feature.properties.routeId) === String(routeId) &&
                String(feature.properties.lineId) === String(lineId)
            );
            searchType = 'routeSection';

            // 見つからない場合は、routeIdのみで検索してフォールバック
            if (matchingFeatures.length === 0) {
                matchingFeatures = data.features.filter(feature =>
                    feature.properties &&
                    String(feature.properties.routeId) === String(routeId)
                );
                searchType = 'routeOnly';
            }
        } else if (routeId) {
            // routeIdのみで検索
            matchingFeatures = data.features.filter(feature =>
                feature.properties &&
                String(feature.properties.routeId) === String(routeId)
            );
            searchType = 'routeOnly';
        }

        if (matchingFeatures.length === 0) {
            console.error('No matching features found for:', params);
            return;
        }

        // 全ての一致するフィーチャーの境界ボックスを計算
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

        matchingFeatures.forEach(feature => {
            if (feature.geometry.type === 'LineString') {
                feature.geometry.coordinates.forEach(coord => {
                    const [lng, lat] = coord;
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                });
            } else if (feature.geometry.type === 'MultiLineString') {
                feature.geometry.coordinates.forEach(lineString => {
                    lineString.forEach(coord => {
                        const [lng, lat] = coord;
                        minLng = Math.min(minLng, lng);
                        maxLng = Math.max(maxLng, lng);
                        minLat = Math.min(minLat, lat);
                        maxLat = Math.max(maxLat, lat);
                    });
                });
            }
        });

        // 境界ボックスが有効かチェック
        if (minLng === Infinity || minLat === Infinity || maxLng === -Infinity || maxLat === -Infinity) {
            console.error('Invalid bounds calculated for:', params);
            return;
        }

        // ドロワーの高さ・幅を考慮したパディングを計算
        let padding = {
            top: 50,
            left: 50,
            right: 50,
            bottom: 50
        };

        // ドロワーが表示されている場合はパディングを調整
        const detailDrawer = document.getElementById('detail-drawer');
        if (detailDrawer && !detailDrawer.classList.contains('hidden')) {
            if (window.innerWidth >= 768) {
                // PC表示: 左側のパディングを調整（サイドバーの幅を考慮）
                const drawerWidth = detailDrawer.offsetWidth;
                padding.left = drawerWidth + 30;
            } else {
                // モバイル表示: 下側のパディングを調整（ドロワーの高さを考慮）
                const drawerHeight = detailDrawer.offsetHeight;
                padding.bottom = drawerHeight + 30;
            }
        }

        // マップを航路に移動
        map.fitBounds([
            [minLng, minLat],
            [maxLng, maxLat]
        ], {
            padding: padding,
            duration: 1000 // アニメーション時間（ミリ秒）
        });

        // ハイライト表示を追加
        addRouteHighlight(matchingFeatures, sourceId);

        // Google Analytics イベント送信
        if (typeof gtag !== 'undefined') {
            const eventLabel = routeName || `${routeId}-${lineId}`;
            const eventType = searchType === 'routeName' ? 'route_zoom' : 'route_section_zoom';
            gtag('event', eventType, {
                'event_category': 'map',
                'event_label': eventLabel,
                'value': 1
            });
        }

    } catch (error) {
        console.error('Error in zoomToRoute:', error);
    }
};

/**
 * 航路のハイライト表示を追加
 */
function addRouteHighlight(features, sourceId) {
    // 既存のハイライトを削除
    removeRouteHighlight();

    // ハイライト用のGeoJSONデータを作成
    const highlightData = {
        type: 'FeatureCollection',
        features: features
    };

    // ハイライト用ソースを追加
    map.addSource('route-highlight', {
        type: 'geojson',
        data: highlightData
    });

    // ハイライト用レイヤーを追加（航路の色で太い線）
    map.addLayer({
        id: 'route-highlight-line',
        type: 'line',
        source: 'route-highlight',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': ['coalesce', ['get', 'color'], '#FF6B35'],
            'line-width': 8,
            'line-opacity': 0.6
        }
    });

    // 別の航路をクリックするまでハイライトを維持
}

/**
 * 航路のハイライト表示を削除
 */
function removeRouteHighlight() {
    if (map.getLayer('route-highlight-line')) {
        map.removeLayer('route-highlight-line');
    }
    if (map.getSource('route-highlight')) {
        map.removeSource('route-highlight');
    }
}

// ハイライト削除機能をグローバルに公開
window.removeRouteHighlight = removeRouteHighlight;

// 既存の関数呼び出しとの互換性を保持するためのラッパー関数
window.zoomToRouteSection = function(routeId, lineId, sourceId) {
    window.zoomToRoute({ routeId, lineId, sourceId });
};

/**
 * 休止中航路の表示・非表示を切り替える
 * @param {boolean} showSuspended - 休止中航路を表示するかどうか
 */
export function toggleSuspendedRoutes(showSuspended) {
    showSuspendedRoutes = showSuspended;

    // 各航路レイヤーのフィルターを更新
    const routeTypes = ['geojson_sea_route', 'geojson_international_sea_route', 'geojson_limited_sea_route'];

    routeTypes.forEach(routeType => {
        const layerSuffixes = ['_outline', '_solidline', '_dashline', '_thinline', '_name'];

        layerSuffixes.forEach(suffix => {
            const layerId = routeType + suffix;

            if (map.getLayer(layerId)) {
                if (showSuspended) {
                    // 既存のフィルターを復元
                    if (suffix === '_solidline') {
                        map.setFilter(layerId, ['==', ['get', 'note'], null]);
                    } else if (suffix === '_dashline') {
                        map.setFilter(layerId, ['==', ['get', 'note'], 'season']);
                    } else if (suffix === '_thinline') {
                        map.setFilter(layerId, ['==', ['get', 'note'], 'suspend']);
                    } else {
                        // outline と name レイヤーはフィルターなし
                        map.setFilter(layerId, null);
                    }
                } else {
                    // 休止中航路を非表示にする
                    if (suffix === '_solidline') {
                        map.setFilter(layerId, ['==', ['get', 'note'], null]);
                    } else if (suffix === '_dashline') {
                        map.setFilter(layerId, ['==', ['get', 'note'], 'season']);
                    } else if (suffix === '_thinline') {
                        // 休止中航路（suspend）を非表示
                        map.setFilter(layerId, ['==', ['get', 'note'], 'never_match']);
                    } else {
                        // outline と name レイヤーは休止中以外を表示
                        map.setFilter(layerId, ['!=', ['get', 'note'], 'suspend']);
                    }
                }
            }
        });
    });
}
