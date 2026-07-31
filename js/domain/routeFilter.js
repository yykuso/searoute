export const DEFAULT_ROUTE_FILTERS = Object.freeze({
    status: Object.freeze({
        active: true,
        season: true,
        suspend: false,
    }),
    carriage: Object.freeze({
        car: false,
        bike: false,
        bicycle: false,
    }),
});

export function cloneDefaultRouteFilters() {
    return {
        status: { ...DEFAULT_ROUTE_FILTERS.status },
        carriage: { ...DEFAULT_ROUTE_FILTERS.carriage },
    };
}

export function normalizeRouteFilters(filters) {
    const normalized = cloneDefaultRouteFilters();

    Object.keys(normalized).forEach((group) => {
        Object.keys(normalized[group]).forEach((key) => {
            normalized[group][key] = Boolean(filters?.[group]?.[key]);
        });
    });

    return normalized;
}

export function isDefaultRouteFilters(filters) {
    const normalized = normalizeRouteFilters(filters);

    return Object.keys(DEFAULT_ROUTE_FILTERS).every((group) => {
        return Object.keys(DEFAULT_ROUTE_FILTERS[group]).every((key) => {
            return normalized[group][key] === DEFAULT_ROUTE_FILTERS[group][key];
        });
    });
}