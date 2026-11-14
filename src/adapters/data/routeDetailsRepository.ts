import type { RouteDetailsRepository } from '../../application/ports';
import type { RouteLayerConfig } from '../../config/routeLayers';
import type { RouteDetails } from '../../domain/seaRoute';
import type { FetchLike } from '../http/fetchWithRetry';

export interface RouteDetailsRepositoryOptions {
    routeLayerConfigs: Record<string, Pick<RouteLayerConfig, 'sourceLayer' | 'datasetName'>>;
    fetchImpl?: FetchLike;
    baseUrl?: string;
}

export function createRouteDetailsRepository(options: RouteDetailsRepositoryOptions): RouteDetailsRepository {
    const {
        routeLayerConfigs,
        fetchImpl = globalThis.fetch,
        baseUrl = 'https://pmtiles.searoute.info/details',
    } = options;
    const cache = new Map<string, RouteDetails>();
    const inFlight = new Map<string, Promise<RouteDetails>>();

    async function loadRouteDetails(routeId: unknown, sourceId: string | null | undefined): Promise<RouteDetails> {
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
            return cache.get(cacheKey) as RouteDetails;
        }

        if (inFlight.has(cacheKey)) {
            return inFlight.get(cacheKey) as Promise<RouteDetails>;
        }

        const loadPromise = loadFromCandidates(config, normalizedRouteId, cacheKey);
        inFlight.set(cacheKey, loadPromise);
        return loadPromise;
    }

    async function loadFromCandidates(
        config: Pick<RouteLayerConfig, 'sourceLayer' | 'datasetName'>,
        routeId: string,
        cacheKey: string,
    ): Promise<RouteDetails> {
        const candidates = [config.sourceLayer, config.datasetName].filter(Boolean) as string[];

        try {
            for (const folderName of candidates) {
                const path = `${baseUrl}/${folderName}/${encodeURIComponent(routeId)}.json`;
                const response = await fetchImpl(path);
                if (!response.ok) {
                    continue;
                }

                const details = await response.json() as RouteDetails | null;
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
