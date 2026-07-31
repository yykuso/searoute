const ROUTE_COLUMNS = ['routeId', 'businessName', 'routeName', 'info', 'shipName', 'url'];
const REQUIRED_ROUTE_COLUMNS = new Set(['routeId', 'businessName', 'routeName']);

export function getRouteInfoFromNote(note) {
    if (note === 'season') {
        return '季節運航';
    }
    if (note === 'suspend') {
        return '運休中';
    }
    return undefined;
}

export function compareRouteIds(first, second) {
    const firstNumeric = /^\d+$/.test(first);
    const secondNumeric = /^\d+$/.test(second);

    if (firstNumeric && secondNumeric) {
        return Number(first) - Number(second);
    }

    return first.localeCompare(second, 'ja', { numeric: true });
}

export function normalizeRouteRows(data) {
    if (data && Array.isArray(data.features)) {
        return normalizeGeoJsonRows(data.features);
    }

    if (data && Array.isArray(data.records)) {
        return data.records
            .map(toRouteRow)
            .sort((first, second) => compareRouteIds(first.routeId, second.routeId));
    }

    if (data && typeof data === 'object') {
        return Object.entries(data).map(([routeId, detail]) => toRouteRow({ ...detail, routeId }));
    }

    return [];
}

export function getVisibleRouteColumns(rows) {
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

export function matchesRouteSearchText(text, query) {
    return String(text).toLocaleLowerCase('ja').includes(String(query).toLocaleLowerCase('ja'));
}

export function createRouteSearchPattern(query) {
    const escapedQuery = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(${escapedQuery})`, 'gi');
}

function normalizeGeoJsonRows(features) {
    const routeMap = new Map();

    features.forEach((feature) => {
        const properties = feature?.properties || {};
        if (properties.routeId === undefined || properties.routeId === null) {
            return;
        }

        const routeId = String(properties.routeId);
        const previous = routeMap.get(routeId) || {};

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

function toRouteRow(record) {
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