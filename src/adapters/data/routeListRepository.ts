import type { RouteListRepository } from '../../application/ports';
import { normalizeRouteRows } from '../../domain/route';
import type { FetchLike } from '../http/fetchWithRetry';

export function createRouteListRepository({ fetchImpl = globalThis.fetch }: { fetchImpl?: FetchLike } = {}): RouteListRepository {
    async function loadRouteRows(dataPath: string) {
        const response = await fetchImpl(dataPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return normalizeRouteRows(data);
    }
    return { loadRouteRows };
}
