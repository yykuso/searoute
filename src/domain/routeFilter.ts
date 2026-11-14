export interface RouteStatusFilters {
    active: boolean;
    season: boolean;
    suspend: boolean;
}

export interface RouteCarriageFilters {
    car: boolean;
    bike: boolean;
    bicycle: boolean;
}

export interface RouteFilters {
    status: RouteStatusFilters;
    carriage: RouteCarriageFilters;
}

export type RouteFilterGroup = keyof RouteFilters;

/** Cookie などから読み込んだ未検証のフィルター値 */
export type RouteFiltersInput = {
    [G in RouteFilterGroup]?: { [K in keyof RouteFilters[G]]?: unknown } | null;
} | null | undefined;

export const DEFAULT_ROUTE_FILTERS: Readonly<{
    status: Readonly<RouteStatusFilters>;
    carriage: Readonly<RouteCarriageFilters>;
}> = Object.freeze({
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

export function cloneDefaultRouteFilters(): RouteFilters {
    return {
        status: { ...DEFAULT_ROUTE_FILTERS.status },
        carriage: { ...DEFAULT_ROUTE_FILTERS.carriage },
    };
}

export function normalizeRouteFilters(filters?: RouteFiltersInput | RouteFilters): RouteFilters {
    const normalized = cloneDefaultRouteFilters();
    const source = filters as Record<string, Record<string, unknown> | null | undefined> | null | undefined;
    const target = normalized as unknown as Record<string, Record<string, boolean>>;

    Object.keys(target).forEach((group) => {
        Object.keys(target[group]).forEach((key) => {
            target[group][key] = Boolean(source?.[group]?.[key]);
        });
    });

    return normalized;
}

export function isDefaultRouteFilters(filters?: RouteFiltersInput | RouteFilters): boolean {
    const normalized = normalizeRouteFilters(filters) as unknown as Record<string, Record<string, boolean>>;
    const defaults = DEFAULT_ROUTE_FILTERS as unknown as Record<string, Record<string, boolean>>;

    return Object.keys(defaults).every((group) => {
        return Object.keys(defaults[group]).every((key) => {
            return normalized[group][key] === defaults[group][key];
        });
    });
}
