const UNIFIED_PMTILES_PATH = 'https://pmtiles.searoute.info/searoute.pmtiles';

const DEFAULT_SHARE_OVERVIEW = { center: [137.5, 36.5], zoom: 4 };

export const ROUTE_LAYER_CONFIGS = {
    geojson_sea_route: {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute',
        datasetName: 'seaRoute',
        outlineColor: '#FFFFFF',
        freqDefault: 3,
        freqMultZ3: 0.5,
        shareOverview: { center: [137.5, 36.5], zoom: 4 },
    },
    geojson_international_sea_route: {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute_international',
        datasetName: 'internationalSeaRoute',
        outlineColor: '#FFFFFF',
        freqDefault: 1,
        freqMultZ3: 0.75,
        shareOverview: { center: [127, 33], zoom: 3 },
    },
    geojson_KR_sea_route: {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute_KR',
        datasetName: 'seaRouteKR',
        outlineColor: '#FFFFFF',
        freqDefault: 1,
        freqMultZ3: 0.75,
        shareOverview: { center: [129, 35.5], zoom: 5 },
    },
    geojson_limited_sea_route: {
        pmtilesPath: UNIFIED_PMTILES_PATH,
        sourceLayer: 'seaRoute_limited',
        datasetName: 'limitedSeaRoute',
        outlineColor: '#000000',
        freqDefault: 1,
        freqMultZ3: 0.75,
        shareOverview: { center: [137.5, 36.5], zoom: 5 },
    },
};

export function getRouteShareOverview(sourceId) {
    return ROUTE_LAYER_CONFIGS[sourceId]?.shareOverview ?? DEFAULT_SHARE_OVERVIEW;
}