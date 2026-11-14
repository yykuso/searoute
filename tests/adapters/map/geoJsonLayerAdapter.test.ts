import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/adapters/map/pmtilesLayerAdapter', () => ({
    addSeaRouteLayer: vi.fn(),
    animateToRouteBounds: vi.fn(),
    calculateBounds: vi.fn(() => null),
    calculateFitBoundsPadding: vi.fn(),
    getSeaRouteHandleIds: vi.fn(() => []),
    highlightRouteFeatures: vi.fn(),
    loadRouteDetails: vi.fn(async () => ({})),
    queryRouteFeatures: vi.fn(),
    removeRouteHighlight: vi.fn(),
    removeSeaRouteClickEvent: vi.fn(),
    setRouteFilters: vi.fn(),
    toggleSuspendedRoutes: vi.fn(),
}));
import {
    animateToRouteBounds,
    calculateBounds,
    calculateFitBoundsPadding,
    highlightRouteFeatures,
    queryRouteFeatures,
} from '../../../src/adapters/map/pmtilesLayerAdapter';
import { focusSharedRoute } from '../../../src/adapters/map/geoJsonLayerAdapter';
import { setMap } from '../../../src/adapters/map/mapRegistry';

// 旧 initShareFromUrl の航路復元のうち地図操作部分（ドロワー表示は application の drawerUseCases.restoreFromUrl）
describe('focusSharedRoute', () => {
    let mapRef;

    beforeEach(() => {
        vi.clearAllMocks();
        mapRef = {};
        setMap(mapRef);
    });

    it('一覧から共有された航路の全区間を強調表示する', async () => {
        const matchingFeatures = [
            {
                type: 'Feature',
                properties: { routeId: 42, businessName: 'Example Ferry' },
                geometry: { type: 'LineString', coordinates: [[130, 33], [131, 34]] },
            },
            {
                type: 'Feature',
                properties: { routeId: 42, businessName: 'Example Ferry' },
                geometry: { type: 'LineString', coordinates: [[131, 34], [132, 35]] },
            },
        ];
        vi.mocked(queryRouteFeatures).mockReturnValue({
            type: 'FeatureCollection',
            features: matchingFeatures,
        });
        vi.mocked(calculateBounds).mockReturnValue({ minLng: 130, minLat: 33, maxLng: 132, maxLat: 35 });
        vi.mocked(calculateFitBoundsPadding).mockReturnValue({ top: 50, left: 414, right: 50, bottom: 50 });

        const result = await focusSharedRoute({ routeId: 42, sourceId: 'geojson_sea_route' });

        expect(calculateFitBoundsPadding).toHaveBeenCalledWith({ reserveDrawerSpace: true });
        expect(animateToRouteBounds).toHaveBeenCalledWith(
            mapRef,
            { minLng: 130, minLat: 33, maxLng: 132, maxLat: 35 },
            { top: 50, left: 414, right: 50, bottom: 50 },
        );
        expect(highlightRouteFeatures).toHaveBeenCalledWith(matchingFeatures);
        expect(result).toEqual(matchingFeatures);
    });
});