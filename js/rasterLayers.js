import {
    map,
    thunderforestApikey,
    mapStyle,
} from './common.js';

/**
 * RasterLayerを追加する関数
 * @param {number} layer - RasterLayerのID
 */
export function addRasterLayer(layer) {
    switch (layer) {
        case mapStyle["OTM_MAP"]:
            addOTMLayer('tile_otm');
            break;
        case mapStyle["TRANSPORT_MAP"]:
            addTransportMapLayer('tile_transportmap');
            break;
        case mapStyle["OPEN_SEA_MAP"]:
            addOpenSeaMapLayer('tile_openseamap');
            break;
        case mapStyle["RAILWAY_MAP"]:
            addRailwayMapLayer('tile_railwaymap');
            break;
        case mapStyle["GSI_PHOTO_MAP"]:
            addGSIPhotoLayer('tile_gsi_photo');
            break;
        case mapStyle["GSI_RELIEF_MAP"]:
            addGSIReliefLayer('tile_gsi_relief');
            break;
        default:
            console.log('[Error] Layer not found : addRasterLayer( ' + layer + ' )');
            return;
    }
}

function addOTMLayer(id) {
    map.addSource(id, {
        type: 'raster',
        tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a>"
            + " "
            + " <a href='https://opentopomap.org/' target='_blank' rel='noopener noreferrer'>&copy; OpenTopoMap</a>",
    });
    map.addLayer({
        id: id,
        type: 'raster',
        source: id,
        minzoom: 2,
        maxzoom: 18,
    });
}

function addTransportMapLayer(id) {
    map.addSource(id, {
        type: 'raster',
        tiles: [
            'https://a.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + thunderforestApikey,
            'https://b.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + thunderforestApikey,
            'https://c.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=' + thunderforestApikey,
        ],
        tileSize: 256,
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a>"
            + " "
            + " <a href='https://thunderforest.com' target='_blank' rel='noopener noreferrer'>&copy; Thunderforest</a>",
    });
    map.addLayer({
        id: id,
        type: 'raster',
        source: id,
        minzoom: 2,
        maxzoom: 19,
    });
}

function addOpenSeaMapLayer(id) {
    map.addSource(id, {
        type: 'raster',
        tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a>"
            + " "
            + "<a href='https://www.openseamap.org' target='_blank' rel='noopener noreferrer'>&copy; OpenSeaMap</a>",
    });
    map.addLayer({
        id: id,
        type: 'raster',
        source: id,
        minzoom: 2,
        maxzoom: 18,
    });
}

function addRailwayMapLayer(id) {
    map.addSource(id, {
        type: 'raster',
        tiles: [
            'https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
            'https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: "<a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>&copy; OpenStreetMap contributors</a>"
            + " "
            + "<a href='https://www.OpenRailwayMap.org' target='_blank' rel='noopener noreferrer'>&copy; OpenRailwayMap</a>",
    });
    map.addLayer({
        id: id,
        type: 'raster',
        source: id,
        minzoom: 2,
        maxzoom: 19,
    });
}

function addGSIPhotoLayer(id) {
    map.addSource(id, {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank' rel='noopener noreferrer'>国土地理院</a>",
    });
    map.addLayer({
        id: id,
        type: 'raster',
        source: id,
        minzoom: 2,
        maxzoom: 18,
        paint: {
            'raster-opacity': 0.6,
        },
    });
}

function addGSIReliefLayer(id) {
    map.addSource(id, {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank' rel='noopener noreferrer'>国土地理院</a>",
    });
    map.addLayer({
        id: id,
        type: 'raster',
        source: id,
        minzoom: 5,
        maxzoom: 15,
        paint: {
            'raster-opacity': 0.7,
        },
    });
}