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
            'line-width': 8,
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
            'line-width': ['coalesce', ['get', 'frequency'], 3],
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
            'line-width': ['coalesce', ['get', 'frequency'], 3],
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
            'line-width': ['coalesce', ['get', 'frequency'], 1],
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
                'format', 
                ['get', 'businessName'],{},
                ' (',{},
                ['get', 'routeName'],{},
                ') ',{}
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
            'line-width': 8,
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
            'line-width': ['coalesce', ['get', 'frequency'], 3],
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
            'line-width': ['coalesce', ['get', 'frequency'], 3],
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
            'line-width': ['coalesce', ['get', 'frequency'], 1],
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
                'format', 
                ['get', 'businessName'],{},
                ' (',{},
                ['get', 'routeName'],{},
                ') ',{}
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

        // businessNameに「（」が含まれる場合に改行を追加
        let businessName = properties.businessName;
        if (businessName.includes('（')) {
            businessName = businessName.replace('（', '<br>（');
        }

        const popupContent = `
            <div class="searoute-popup-box">
                <div class="searoute-businessname">${businessName}</div>
                <hr size="5" color="${properties.color}">
                <div class="searoute-title highlight-yellow">航路</div>
                <div class="searoute-detail">${properties.routeName}</div>
                <div class="searoute-title highlight-yellow">選択部分</div>
                <div class="searoute-detail">${properties.portName1}～${properties.portName2}</div>
                <div class="searoute-title highlight-yellow">情報</div>
                <div class="searoute-detail">${properties.information || "なし"}</div>
                <div class="searoute-title highlight-yellow">船舶</div>
                <div class="searoute-detail">${properties.shipName || "-"}</div>
                <div class="searoute-title highlight-yellow">リンク</div>
                <div class="searoute-detail"><a href="${properties.url}" class="expanded button" target="_blank">運航スケジュール</a></div>
            </div> 
        `;

        popup
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .setMaxWidth("240px")
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
