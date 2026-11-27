/**
 * 航路詳細ページ（/route/<routeId>/）用のデータ型と純関数
 */
import { compareRouteIds } from './route';

export type RoutePageLayer = 'seaRoute' | 'seaRoute_international' | 'seaRoute_KR';

/** config の RouteLayerId の部分集合（domain は config に依存できないため構造的に同じ値を持つ） */
export type RoutePageSourceId = 'geojson_sea_route' | 'geojson_international_sea_route' | 'geojson_KR_sea_route';

export interface RoutePort {
    name: string;
    lon: number;
    lat: number;
}

export interface RoutePageRecord {
    routeId: string;
    layer: RoutePageLayer;
    businessName?: string;
    routeName?: string;
    url?: string;
    info?: string;
    freq?: number;
    freqInfo?: string;
    car?: number;
    bike?: number;
    bicycle?: number;
    shipName?: string;
    note?: string;
    bbox?: [number, number, number, number];
    lastChecked?: string;
    ports: RoutePort[];
}

export const ROUTE_PAGE_LAYERS: Record<RoutePageLayer, { sourceId: RoutePageSourceId; label: string; anchorId: string }> = {
    seaRoute: { sourceId: 'geojson_sea_route', label: '国内航路', anchorId: 'domestic' },
    seaRoute_international: { sourceId: 'geojson_international_sea_route', label: '国際航路', anchorId: 'international' },
    seaRoute_KR: { sourceId: 'geojson_KR_sea_route', label: '韓国 国内航路', anchorId: 'korea' },
};

function isRoutePageLayer(value: unknown): value is RoutePageLayer {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROUTE_PAGE_LAYERS, value);
}

/** routePages.json を読み、未知レイヤーを捨てて routeId 昇順で返す。routeId 重複は throw */
export function normalizeRoutePages(data: unknown): RoutePageRecord[] {
    const source = data as { records?: unknown } | null | undefined;
    if (!source || !Array.isArray(source.records)) {
        return [];
    }

    const seen = new Set<string>();
    const records: RoutePageRecord[] = [];
    for (const raw of source.records as Array<Partial<RoutePageRecord> | null | undefined>) {
        if (!raw || !isRoutePageLayer(raw.layer)) continue;
        const routeId = String(raw.routeId ?? '');
        if (!routeId) {
            throw new Error('routePages: routeId が空のレコードがあります');
        }
        if (seen.has(routeId)) {
            throw new Error(`routePages: routeId が重複しています: ${routeId}`);
        }
        seen.add(routeId);
        records.push({ ...raw, routeId, layer: raw.layer, ports: Array.isArray(raw.ports) ? raw.ports : [] });
    }
    return records.sort((first, second) => compareRouteIds(first.routeId, second.routeId));
}

export function buildRouteDetailPath(routeId: string): string {
    return `/route/${encodeURIComponent(routeId)}/`;
}

export function getVehicleLabels(record: RoutePageRecord): string[] {
    const labels: string[] = [];
    if (record.car === 1) labels.push('自動車');
    if (record.bike === 1) labels.push('バイク');
    if (record.bicycle === 1) labels.push('自転車');
    return labels;
}

/** 同じ事業者の他航路（routeId 昇順・最大 10 件） */
export function getRelatedRoutes(record: RoutePageRecord, all: RoutePageRecord[]): RoutePageRecord[] {
    if (!record.businessName) return [];
    return all
        .filter((other) => other.routeId !== record.routeId && other.businessName === record.businessName)
        .sort((first, second) => compareRouteIds(first.routeId, second.routeId))
        .slice(0, 10);
}
