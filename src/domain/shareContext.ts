export interface RouteShareContext {
    type: 'route';
    routeId: string | number;
    sourceId: string;
    lat?: number;
    lng?: number;
    zoom?: number;
}

export interface PortShareContext {
    type: 'port';
    lat: number;
    lng: number;
    name: string;
}

export interface CoordShareContext {
    type: 'coord';
    lat: number;
    lng: number;
}

export type ShareContext = RouteShareContext | PortShareContext | CoordShareContext;
export type ShareType = ShareContext['type'];

type ShareParams = Record<string, string | number | undefined>;

interface ShareContextConfig<T extends ShareContext> {
    buildParams: (context: T) => ShareParams;
    parseParams: (params: URLSearchParams) => Omit<T, 'type'> | null;
    getLayerId: (context: T) => string;
}

type ShareContextConfigMap = { [K in ShareType]: ShareContextConfig<Extract<ShareContext, { type: K }>> };

const SHARE_CONTEXT_CONFIG: ShareContextConfigMap = {
    route: {
        buildParams: (context) => ({
            routeId: context.routeId,
            sourceId: context.sourceId,
        }),
        parseParams: (params) => {
            const routeId = params.get('routeId');
            const sourceId = params.get('sourceId');
            const lat = parseFloat(params.get('lat') as string);
            const lng = parseFloat(params.get('lng') as string);
            const zoom = parseFloat(params.get('zoom') as string);

            if (!routeId || !sourceId) {
                return null;
            }

            const parsed: Omit<RouteShareContext, 'type'> = { routeId, sourceId };
            if (!isNaN(lat) && !isNaN(lng)) {
                parsed.lat = lat;
                parsed.lng = lng;
            }
            if (!isNaN(zoom)) {
                parsed.zoom = zoom;
            }

            return parsed;
        },
        getLayerId: (context) => context.sourceId,
    },
    port: {
        buildParams: (context) => ({
            lat: context.lat,
            lng: context.lng,
            name: context.name,
        }),
        parseParams: (params) => {
            const lat = parseFloat(params.get('lat') as string);
            const lng = parseFloat(params.get('lng') as string);
            const name = params.get('name');
            return !isNaN(lat) && !isNaN(lng) && name ? { lat, lng, name } : null;
        },
        getLayerId: () => 'geojson_port',
    },
    coord: {
        buildParams: (context) => ({
            lat: context.lat,
            lng: context.lng,
        }),
        parseParams: (params) => {
            const lat = parseFloat(params.get('lat') as string);
            const lng = parseFloat(params.get('lng') as string);
            return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
        },
        getLayerId: () => 'geojson_port',
    },
};

function getConfig(type: unknown): ShareContextConfig<ShareContext> | undefined {
    if (typeof type !== 'string' || !Object.hasOwn(SHARE_CONTEXT_CONFIG, type)) {
        return undefined;
    }
    return SHARE_CONTEXT_CONFIG[type as ShareType] as unknown as ShareContextConfig<ShareContext>;
}

export function parseShareContext(search: string | URLSearchParams): ShareContext | null {
    const params = new URLSearchParams(search);
    const share = params.get('share');
    const config = getConfig(share);

    if (!config) {
        return null;
    }

    const parsed = config.parseParams(params);
    return parsed ? { type: share, ...parsed } as ShareContext : null;
}

export function buildShareUrl(context: ShareContext | null | undefined, baseUrl: string | URL): URL {
    const config = getConfig(context?.type);
    const url = new URL(baseUrl);
    url.search = '';

    if (!config || !context) {
        return url;
    }

    url.searchParams.set('share', context.type);
    Object.entries(config.buildParams(context)).forEach(([key, value]) => {
        url.searchParams.set(key, value as string);
    });

    return url;
}

export function getShareTargetLayerId(context: ShareContext | null | undefined): string | null {
    if (!context) {
        return null;
    }

    const config = getConfig(context.type);
    return config?.getLayerId?.(context) ?? null;
}
