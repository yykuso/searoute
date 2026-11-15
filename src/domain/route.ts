export type RouteColumn = 'routeId' | 'businessName' | 'routeName' | 'info' | 'shipName' | 'url';

export interface RouteRow {
    routeId: string;
    businessName?: string;
    routeName?: string;
    info?: string;
    shipName?: string;
    note?: string;
    url?: string;
}

/** lightweight JSON / GeoJSON / 詳細JSON のレコード */
export interface RouteRecord {
    routeId?: string | number | null;
    businessName?: string;
    routeName?: string;
    info?: string;
    information?: string;
    shipName?: string;
    note?: string;
    url?: string;
    [key: string]: unknown;
}

const ROUTE_COLUMNS: RouteColumn[] = ['routeId', 'businessName', 'routeName', 'info', 'shipName', 'url'];
const REQUIRED_ROUTE_COLUMNS = new Set<RouteColumn>(['routeId', 'businessName', 'routeName']);

export function getRouteInfoFromNote(note: unknown): string | undefined {
    if (note === 'season') {
        return '季節運航';
    }
    if (note === 'suspend') {
        return '運休中';
    }
    return undefined;
}

export function compareRouteIds(first: string, second: string): number {
    const firstNumeric = /^\d+$/.test(first);
    const secondNumeric = /^\d+$/.test(second);

    if (firstNumeric && secondNumeric) {
        return Number(first) - Number(second);
    }

    return first.localeCompare(second, 'ja', { numeric: true });
}

export function normalizeRouteRows(data: unknown): RouteRow[] {
    const source = data as { features?: unknown; records?: unknown } | null | undefined;

    if (source && Array.isArray(source.features)) {
        return normalizeGeoJsonRows(source.features as Array<{ properties?: RouteRecord } | null | undefined>);
    }

    if (source && Array.isArray(source.records)) {
        return (source.records as RouteRecord[])
            .map(toRouteRow)
            .sort((first, second) => compareRouteIds(first.routeId, second.routeId));
    }

    if (source && typeof source === 'object') {
        return Object.entries(source as Record<string, RouteRecord>)
            .map(([routeId, detail]) => toRouteRow({ ...detail, routeId }));
    }

    return [];
}

export function getVisibleRouteColumns(rows: RouteRow[]): RouteColumn[] {
    return ROUTE_COLUMNS.filter((column) => {
        if (REQUIRED_ROUTE_COLUMNS.has(column)) {
            return true;
        }

        return rows.some((row) => {
            const value = row[column];
            return value !== undefined && value !== null && value !== '';
        });
    });
}

export function matchesRouteSearchText(text: unknown, query: unknown): boolean {
    return String(text).toLocaleLowerCase('ja').includes(String(query).toLocaleLowerCase('ja'));
}

export function createRouteSearchPattern(query: unknown): RegExp {
    const escapedQuery = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(${escapedQuery})`, 'gi');
}

function normalizeGeoJsonRows(features: Array<{ properties?: RouteRecord } | null | undefined>): RouteRow[] {
    const routeMap = new Map<string, RouteRow>();

    features.forEach((feature) => {
        const properties: RouteRecord = feature?.properties || {};
        if (properties.routeId === undefined || properties.routeId === null) {
            return;
        }

        const routeId = String(properties.routeId);
        const previous: Partial<RouteRow> = routeMap.get(routeId) || {};

        routeMap.set(routeId, {
            routeId,
            businessName: properties.businessName || previous.businessName,
            routeName: properties.routeName || previous.routeName,
            info: properties.info || properties.information || getRouteInfoFromNote(properties.note) || previous.info,
            shipName: properties.shipName || previous.shipName,
            note: properties.note || previous.note,
            url: properties.url || previous.url,
        });
    });

    return Array.from(routeMap.values())
        .sort((first, second) => compareRouteIds(first.routeId, second.routeId));
}

function toRouteRow(record: RouteRecord): RouteRow {
    return {
        routeId: String(record.routeId),
        businessName: record.businessName,
        routeName: record.routeName,
        info: record.info || record.information || getRouteInfoFromNote(record.note),
        shipName: record.shipName,
        note: record.note,
        url: record.url,
    };
}
