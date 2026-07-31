export const ROUTE_LAYER_SUFFIXES = ['_outline', '_solidline', '_dashline', '_thinline', '_name'];

export const NEVER_MATCH_FILTER = ['==', ['get', 'routeId'], '__never_match__'];

export const STATUS_FILTERS = {
    active: ['any', ['==', ['get', 'note'], null], ['==', ['get', 'note'], '']],
    season: ['==', ['get', 'note'], 'season'],
    suspend: ['==', ['get', 'note'], 'suspend'],
};

export function buildAvailabilityFilter(propertyName) {
    return ['any',
        ['==', ['get', propertyName], 1],
        ['==', ['get', propertyName], '1'],
    ];
}

export function buildAnyFilter(filters, fallback = null) {
    const validFilters = filters.filter(Boolean);
    if (validFilters.length === 0) return fallback;
    if (validFilters.length === 1) return validFilters[0];
    return ['any', ...validFilters];
}

export function combineFilters(...filters) {
    const validFilters = filters.filter(Boolean);
    if (validFilters.length === 0) return null;
    if (validFilters.length === 1) return validFilters[0];
    return ['all', ...validFilters];
}

export function buildStatusFilterForSuffix(suffix, status = {}) {
    if (suffix === '_solidline') return status.active  ? STATUS_FILTERS.active  : NEVER_MATCH_FILTER;
    if (suffix === '_dashline')  return status.season  ? STATUS_FILTERS.season  : NEVER_MATCH_FILTER;
    if (suffix === '_thinline')  return status.suspend ? STATUS_FILTERS.suspend : NEVER_MATCH_FILTER;
    return buildAnyFilter([
        status.active  ? STATUS_FILTERS.active  : null,
        status.season  ? STATUS_FILTERS.season  : null,
        status.suspend ? STATUS_FILTERS.suspend : null,
    ], NEVER_MATCH_FILTER);
}

export function buildCarriageFilter(carriage = {}) {
    return buildAnyFilter([
        carriage.car     ? buildAvailabilityFilter('car')     : null,
        carriage.bike    ? buildAvailabilityFilter('bike')    : null,
        carriage.bicycle ? buildAvailabilityFilter('bicycle') : null,
    ]);
}

export function buildRouteFilter(suffix, routeFilters) {
    return combineFilters(
        buildStatusFilterForSuffix(suffix, routeFilters?.status),
        buildCarriageFilter(routeFilters?.carriage),
    );
}
