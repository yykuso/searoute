export function createRouteDetailsRepository(options) {
    const {
        routeLayerConfigs,
        fetchImpl = globalThis.fetch,
        baseUrl = 'https://pmtiles.searoute.info/details',
    } = options;
    const cache = new Map();
    const inFlight = new Map();

    async function loadRouteDetails(routeId, sourceId) {
        if (!sourceId || routeId === null || routeId === undefined || routeId === '') {
            return {};
        }

        const config = routeLayerConfigs[sourceId];
        if (!config) {
            console.warn(`Unknown sourceId: ${sourceId}`);
            return {};
        }

        const normalizedRouteId = String(routeId);
        const cacheKey = `${config.sourceLayer}:${normalizedRouteId}`;

        if (cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        if (inFlight.has(cacheKey)) {
            return inFlight.get(cacheKey);
        }

        const loadPromise = loadFromCandidates(config, normalizedRouteId, cacheKey);
        inFlight.set(cacheKey, loadPromise);
        return loadPromise;
    }

    async function loadFromCandidates(config, routeId, cacheKey) {
        const candidates = [config.sourceLayer, config.datasetName].filter(Boolean);

        try {
            for (const folderName of candidates) {
                const path = `${baseUrl}/${folderName}/${encodeURIComponent(routeId)}.json`;
                const response = await fetchImpl(path);
                if (!response.ok) {
                    continue;
                }

                const details = await response.json();
                const result = details || {};
                cache.set(cacheKey, result);
                return result;
            }

            cache.set(cacheKey, {});
            return {};
        } catch (error) {
            console.warn(`Error loading details for ${config.sourceLayer}:${routeId}`, error);
            cache.set(cacheKey, {});
            return {};
        } finally {
            inFlight.delete(cacheKey);
        }
    }

    return { loadRouteDetails };
}