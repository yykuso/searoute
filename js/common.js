import layersControl from './layersControl.js';
import { loadAndMergeData } from './dataLoader.js';

// ########################################
//  URL Query Parameter
// ########################################
// URLから緯度・経度・ズームを取得
function getMapStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const lat = parseFloat(params.get("lat")) || 35.3622;
    const lng = parseFloat(params.get("lng")) || 138.7313;
    const zoom = parseFloat(params.get("zoom")) || 4;
    return { lat, lng, zoom };
}

// URLに緯度・経度・ズームを反映
function updateURL(lat, lng, zoom) {
    const params = new URLSearchParams();
    params.set("lat", lat.toFixed(5));
    params.set("lng", lng.toFixed(5));
    params.set("zoom", zoom.toFixed(2));
    history.replaceState(null, "", `?${params.toString()}`);
}

// URLから初期状態を取得
const { lat, lng, zoom } = getMapStateFromURL();


// ########################################
//  Map
// ########################################
const map = new maplibregl.Map({
    container: 'map',
    center: [lng, lat],
    zoom: zoom,
    // style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json'
    style: {
        version: 8,
        sources: {},
        layers: [],
        glyphs: 'https://glyphs.geolonia.com/{fontstack}/{range}.pbf'
    },
});

// Map本体
map.on('load', async () => {
    // ####################
    //  Tiles
    const osmAttribution = "© <a href='https://www.openstreetmap.org/copyright/' target='_blank'>OpenStreetMap</a> contributors";
    const gsiAttribution = "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>国土地理院</a>";

    // OpenStreetMap
    map.addSource('osm_tiles', {
        type: 'raster',
        tiles: [
            'https://a.tile.openstreetmap.jp/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.jp/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.jp/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: osmAttribution,
    });
    map.addLayer({
        id: 'osm_tiles',
        type: 'raster',
        source: 'osm_tiles',
        minzoom: 2,
        maxzoom: 18,
    });

    // OpenTopoMap
    map.addSource('otm_tiles', {
        type: 'raster',
        tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: osmAttribution,
    });
    map.addLayer({
        id: 'otm_tiles',
        type: 'raster',
        source: 'otm_tiles',
        minzoom: 2,
        maxzoom: 18,
        layout: {
            'visibility': 'none',
        },
    });

    // GSI Pale
    map.addSource('gsi_pale_tiles', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: gsiAttribution,
    });
    map.addLayer({
        id: 'gsi_pale_tiles',
        type: 'raster',
        source: 'gsi_pale_tiles',
        minzoom: 2,
        maxzoom: 18,
        layout: {
            'visibility': 'none',
        },
    });

    // GSI Std
    map.addSource('gsi_std_tiles', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: gsiAttribution,
    });
    map.addLayer({
        id: 'gsi_std_tiles',
        type: 'raster',
        source: 'gsi_std_tiles',
        minzoom: 2,
        maxzoom: 18,
        layout: {
            'visibility': 'none',
        },
    });

    // GSI Blank
    map.addSource('gsi_blank_tiles', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: gsiAttribution,
    });
    map.addLayer({
        id: 'gsi_blank_tiles',
        type: 'raster',
        source: 'gsi_blank_tiles',
        minzoom: 5,
        maxzoom: 18,
        layout: {
            'visibility': 'none',
        },
    });

    // TransportMap
    map.addSource('transportmap_tiles', {
        type: 'raster',
        tiles: [
            'https://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=e2a13af0ede642faa4f3e766cc345f72',
            'https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=e2a13af0ede642faa4f3e766cc345f72',
            'https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=e2a13af0ede642faa4f3e766cc345f72',
        ],
        tileSize: 256,
        attribution: "Map style: &copy; <a href='https://thunderforest.com' target='_blank'>Thunderforest</a>",
    });
    map.addLayer({
        id: 'transportmap_tiles',
        type: 'raster',
        source: 'transportmap_tiles',
        minzoom: 2,
        maxzoom: 19,
        layout: {
            'visibility': 'none',
        },
    });

    // ####################
    //  Layers
    // GSI Seamlessphoto
    map.addSource('gsi_photo_tiles', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: gsiAttribution,
    });
    map.addLayer({
        id: 'gsi_photo_tiles',
        type: 'raster',
        source: 'gsi_photo_tiles',
        minzoom: 2,
        maxzoom: 18,
        paint: {
            'raster-opacity': 0.5,
        },
        layout: {
            'visibility': 'none',
        },
    });

    // OpenSeaMap
    map.addSource('openseamap_tiles', {
        type: 'raster',
        tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "Map style: <a href='https://www.openseamap.org' target='_blank'>OpenSeaMap</a> contributors",
    });
    map.addLayer({
        id: 'openseamap_tiles',
        type: 'raster',
        source: 'openseamap_tiles',
        minzoom: 2,
        maxzoom: 18,
        layout: {
            'visibility': 'none',
        },
    });

    // OpenRailwayMap
    map.addSource('openrailwaymap_tiles', {
        type: 'raster',
        tiles: [
            'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: "Map style: &copy; <a href='https://www.OpenRailwayMap.org' target='_blank'>OpenRailwayMap</a>",
    });
    map.addLayer({
        id: 'openrailwaymap_tiles',
        type: 'raster',
        source: 'openrailwaymap_tiles',
        minzoom: 2,
        maxzoom: 19,
        layout: {
            'visibility': 'none',
        },
    });

    // 航路情報
    var seaRouteGeojson = await loadAndMergeData(
        './data/seaRoute.geojson',
        './data/seaRouteDetails.json',
        'routeId'
    );
    map.addSource('sea_route_layers', {
        type: 'geojson',
        data: seaRouteGeojson,
    });
    map.addLayer({
        // 線のアウトライン
        id: 'sea_route_layers_outline',
        type: 'line',
        source: 'sea_route_layers',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#FFFFFF',
            'line-width': 9,
            'line-opacity': 0.5
        }
    });
    map.addLayer({
        // 実線
        id: 'sea_route_layers_solidline',
        type: 'line',
        source: 'sea_route_layers',
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
        id: 'sea_route_layers_dashline',
        type: 'line',
        source: 'sea_route_layers',
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
        id: 'sea_route_layers_thinline',
        type: 'line',
        source: 'sea_route_layers',
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
        id: 'sea_route_layers_name',
        type: 'symbol',
        source: 'sea_route_layers',
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
            'text-font': ['Noto Sans CJK JP Regular'],
            'text-size': 9
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
            'text-halo-blur': 2
        }
    });

    // 航路情報(国際)
    var seaRouteGeojson = await loadAndMergeData(
        './data/internationalSeaRoute.geojson',
        './data/internationalSeaRouteDetails.json',
        'routeId'
    );
    map.addSource('international_sea_route_layers', {
        type: 'geojson',
        data: seaRouteGeojson,
    });
    map.addLayer({
        // 線のアウトライン
        id: 'international_sea_route_layers_outline',
        type: 'line',
        source: 'international_sea_route_layers',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#FFFFFF',
            'line-width': 9,
            'line-opacity': 0.5
        }
    });
    map.addLayer({
        // 実線
        id: 'international_sea_route_layers_solidline',
        type: 'line',
        source: 'international_sea_route_layers',
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
        id: 'international_sea_route_layers_dashline',
        type: 'line',
        source: 'international_sea_route_layers',
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
        id: 'international_sea_route_layers_thinline',
        type: 'line',
        source: 'international_sea_route_layers',
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
        id: 'international_sea_route_layers_name',
        type: 'symbol',
        source: 'international_sea_route_layers',
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
            'text-font': ['Noto Sans CJK JP Regular'],
            'text-size': 9
        },
        paint: {
            'text-color': ['coalesce', ['get', 'color'], '#000000'],
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
            'text-halo-blur': 2
        }
    });
    
    // 港湾情報
    const anchorImage = await map.loadImage('./img/anchor.png');
    map.addImage('anchor_marker', anchorImage.data);
    map.addSource('port_layers', {
        type: 'geojson',
        data: './data/portData.geojson',
        attribution: "<a href='https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C02-v3_2.html' target='_blank'>「国土数値情報（港湾データ）」</a>を加工して作成",
    });
    map.addLayer({
        id: 'port_layers',
        type: 'symbol',
        source: 'port_layers',
        layout: {
            'icon-image': 'anchor_marker',
            'icon-size': 0.3,
            'text-field': ['get', 'Name'],
            'text-font': ['Noto Sans CJK JP Regular'],
            'text-size': 12,
            'text-offset': [0, 0.8],
            'text-anchor': 'top',
            'visibility': 'none',
        },
    });

    // BaseLayer
    const mapBaseLayer = {
        osm_tiles: 'OpenStreetMap',
        otm_tiles: 'OpenTopoMap',
        transportmap_tiles: 'TransportMap',
        gsi_pale_tiles: '地理院 淡色地図',
        gsi_std_tiles: '地理院 標準地図',
        gsi_blank_tiles: '地理院 白地図',
    };
    // OverLayer
    const mapOverLayer = {
        sea_route_layers: {
            name: '航路情報',
            visible: true,
            layers: [
                'sea_route_layers_outline',
                'sea_route_layers_solidline',
                'sea_route_layers_dashline',
                'sea_route_layers_thinline',
                'sea_route_layers_name'
            ]
        },
        international_sea_route_layers: {
            name: '国際航路',
            visible: false,
            layers: [
                'international_sea_route_layers_outline',
                'international_sea_route_layers_solidline',
                'international_sea_route_layers_dashline',
                'international_sea_route_layers_thinline',
                'international_sea_route_layers_name'
            ]
        },
        port_layers: {
            name: '港湾情報',
            visible: false,
        },
        gsi_photo_tiles: {
            name: '地理院 オルソ',
            visible: false,
        },
        openseamap_tiles: {
            name: 'OpenSeaMap',
            visible: false,
        },
        openrailwaymap_tiles: {
            name: 'OpenRailwayMap',
            visible: false,
        },
    };
    // Layers Control
    let layers = new layersControl({
        baseLayers: mapBaseLayer,
        overLayers: mapOverLayer,
    });
    map.addControl(layers, 'top-right');
});

// Navigation Controls
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
map.addControl(new maplibregl.GeolocateControl(), 'bottom-right');
map.addControl(new maplibregl.ScaleControl(), 'bottom-left');


// ########################################
// ポップアップ
// ########################################
// ポップアップ閉じるボタン表示、自動閉じ無効化
const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
});

// ライン・ポイント以外をクリックした場合、既存を閉じる
map.on('click', (event) => {
    if (!map.queryRenderedFeatures(event.point, { 
            layers: [
                'sea_route_layers_outline',
                'international_sea_route_layers_outline',
                'port_layers',
            ]
        }).length) {
        popup.remove();
    }
});

// ########################################
//  航路ライン イベント
// ########################################
// 航路ラインをクリックしたときのイベントを登録
map.on('click', 'sea_route_layers_outline', (event) => {
    // クリックしたラインのプロパティを取得
    const properties = event.features[0].properties;

    // ポップアップ内容
    const popupContent = `
        <div class="searoute-popup-box">
            <div class="searoute-businessname">${properties.businessName}</div>
            <hr size="5" color="${properties.color}">
            <div class="searoute-title highlight-yellow">航路</div>
            <div class="searoute-detail">${properties.routeName}</div>
            <div class="searoute-title highlight-yellow">選択部分</div>
            <div class="searoute-detail">${properties.portName1}～${properties.portName2}</div>
            <div class="searoute-title highlight-yellow">情報</div>
            <div class="searoute-detail">${properties.information || "なし"}</div>
            <div class="searoute-title highlight-yellow">リンク</div>
            <div class="searoute-detail"><a href="${properties.url}" class="expanded button" target="_blank">運航スケジュール</a></div>
        </div>
    `;

    popup.remove();

    // ポップアップをクリック地点に表示
    popup
        .setLngLat(event.lngLat)
        .setHTML(popupContent)
        .setMaxWidth("240px")
        .addTo(map);
});
// 航路ライン mouse enter
map.on('mouseenter', 'sea_route_layers_outline', () => {
    map.getCanvas().style.cursor = 'pointer';
});

// 航路ライン mouse leave
map.on('mouseleave', 'sea_route_layers_outline', () => {
    map.getCanvas().style.cursor = '';
});

// ########################################
//  国際航路ライン イベント
// ########################################
// 航路ラインをクリックしたときのイベントを登録
map.on('click', 'international_sea_route_layers_outline', (event) => {
    // クリックしたラインのプロパティを取得
    const properties = event.features[0].properties;

    // ポップアップ内容
    const popupContent = `
        <div class="searoute-popup-box">
            <div class="searoute-businessname">${properties.businessName}</div>
            <hr size="5" color="${properties.color}">
            <div class="searoute-title highlight-yellow">航路</div>
            <div class="searoute-detail">${properties.routeName}</div>
            <div class="searoute-title highlight-yellow">選択部分</div>
            <div class="searoute-detail">${properties.portName1}～${properties.portName2}</div>
            <div class="searoute-title highlight-yellow">情報</div>
            <div class="searoute-detail">${properties.information || "なし"}</div>
            <div class="searoute-title highlight-yellow">リンク</div>
            <div class="searoute-detail"><a href="${properties.url}" class="expanded button" target="_blank">運航スケジュール</a></div>
        </div>
    `;

    popup.remove();

    // ポップアップをクリック地点に表示
    popup
        .setLngLat(event.lngLat)
        .setHTML(popupContent)
        .setMaxWidth("240px")
        .addTo(map);
});
// 航路ライン mouse enter
map.on('mouseenter', 'international_sea_route_layers_outline', () => {
    map.getCanvas().style.cursor = 'pointer';
});

// 航路ライン mouse leave
map.on('mouseleave', 'international_sea_route_layers_outline', () => {
    map.getCanvas().style.cursor = '';
});

// ########################################
//  港湾ポイント イベント
// ########################################
// 港湾ポイント クリック
map.on('click', 'port_layers', (event) => {
    const properties = event.features[0].properties;
    const popupContent = `
        <div class="port-popup-box">
            <h2 class="port-name">${properties.Name}</h2>
        </div>
    `;

    popup.remove();

    popup
        .setLngLat(event.lngLat)
        .setHTML(popupContent)
        .setMaxWidth("150px")
        .addTo(map);
});
// 港湾ポイント mouse enter
map.on('mouseenter', 'port_layers', () => {
    map.getCanvas().style.cursor = 'pointer';
});

// 港湾ポイント mouse leave
map.on('mouseleave', 'port_layers', () => {
    map.getCanvas().style.cursor = '';
});


// マップ移動時にURLを更新
map.on("moveend", () => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    updateURL(center.lat, center.lng, zoom);
});
