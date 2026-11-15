export interface ShareOverview {
    center: [number, number];
    zoom: number;
}

export interface RouteLayerConfig {
    pmtilesPath: string;
    /** 未設定時は PMTiles メタデータから解決して書き戻す */
    sourceLayer: string | null;
    datasetName: string;
    outlineColor: string;
    freqDefault: number;
    freqMultZ3: number;
    shareOverview: ShareOverview;
}

export type RouteLayerId =
    | 'geojson_sea_route'
    | 'geojson_international_sea_route'
    | 'geojson_KR_sea_route'
    | 'geojson_limited_sea_route';

const UNIFIED_PMTILES_PATH = 'https://pmtiles.searoute.info/searoute.pmtiles';

const DEFAULT_SHARE_OVERVIEW: ShareOverview = { center: [137.5, 36.5], zoom: 4 };

export const ROUTE_LAYER_CONFIGS: Record<RouteLayerId, RouteLayerConfig> = {
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

/** 任意の文字列キーで航路レイヤー設定を引く（未定義なら undefined） */
export function getRouteLayerConfig(sourceId: string | null | undefined): RouteLayerConfig | undefined {
    return (ROUTE_LAYER_CONFIGS as Record<string, RouteLayerConfig | undefined>)[sourceId as string];
}

export function getRouteShareOverview(sourceId: string): ShareOverview {
    return getRouteLayerConfig(sourceId)?.shareOverview ?? DEFAULT_SHARE_OVERVIEW;
}
