import { normalizeRouteRows } from '../../domain/route.js';

export function createRouteListRepository({ fetchImpl = globalThis.fetch } = {}) {
    async function loadRouteRows(dataPath) {
        const response = await fetchImpl(dataPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return normalizeRouteRows(data);
    }

    return { loadRouteRows };
}
