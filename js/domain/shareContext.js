const SHARE_CONTEXT_CONFIG = {
    route: {
        buildParams: (context) => ({
            routeId: context.routeId,
            sourceId: context.sourceId,
        }),
        parseParams: (params) => {
            const routeId = params.get('routeId');
            const sourceId = params.get('sourceId');
            const lat = parseFloat(params.get('lat'));
            const lng = parseFloat(params.get('lng'));
            const zoom = parseFloat(params.get('zoom'));

            if (!routeId || !sourceId) {
                return null;
            }

            const parsed = { routeId, sourceId };
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
            const lat = parseFloat(params.get('lat'));
            const lng = parseFloat(params.get('lng'));
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
            const lat = parseFloat(params.get('lat'));
            const lng = parseFloat(params.get('lng'));
            return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
        },
        getLayerId: () => 'geojson_port',
    },
};

export function parseShareContext(search) {
    const params = new URLSearchParams(search);
    const share = params.get('share');
    const config = SHARE_CONTEXT_CONFIG[share];

    if (!config) {
        return null;
    }

    const parsed = config.parseParams(params);
    return parsed ? { type: share, ...parsed } : null;
}

export function buildShareUrl(context, baseUrl) {
    const config = SHARE_CONTEXT_CONFIG[context?.type];
    const url = new URL(baseUrl);
    url.search = '';

    if (!config) {
        return url;
    }

    url.searchParams.set('share', context.type);
    Object.entries(config.buildParams(context)).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    return url;
}

export function getShareTargetLayerId(context) {
    if (!context) {
        return null;
    }

    const config = SHARE_CONTEXT_CONFIG[context.type];
    return config?.getLayerId?.(context) ?? null;
}