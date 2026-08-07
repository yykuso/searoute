import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../js/presentation/shareDrawer.js', () => ({
    restoreDrawerFromUrl: vi.fn(),
    setDrawerContext: vi.fn(),
}));
vi.mock('../../../js/adapters/map/pmtilesLayerAdapter.js', () => ({
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
vi.mock('../../../js/adapters/data/wikipediaImageAdapter.js', () => ({
    loadShipImageIntoDrawer: vi.fn(),
}));
vi.mock('../../../js/presentation/drawerHelpers.js', () => ({
    buildPortSidebarContent: vi.fn(),
    buildSeaRouteSidebarContent: vi.fn(() => '<div>route</div>'),
    splitBusinessName: vi.fn(() => ({ primary: 'Example Ferry', secondary: '' })),
}));
vi.mock('../../../js/presentation/drawerViewModel.js', () => ({
    hideDrawer: vi.fn(),
    openCoordinateDrawer: vi.fn(),
    showDrawer: vi.fn(),
}));

import { restoreDrawerFromUrl } from '../../../js/presentation/shareDrawer.js';
import {
    animateToRouteBounds,
    calculateBounds,
    calculateFitBoundsPadding,
    highlightRouteFeatures,
    queryRouteFeatures,
} from '../../../js/adapters/map/pmtilesLayerAdapter.js';
import { initShareFromUrl } from '../../../js/adapters/map/geoJsonLayerAdapter.js';
import { setMap } from '../../../js/adapters/map/mapRegistry.js';

describe('initShareFromUrl', () => {
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
        queryRouteFeatures.mockReturnValue({
            type: 'FeatureCollection',
            features: matchingFeatures,
        });
        restoreDrawerFromUrl.mockImplementation(async ({ route }) => {
            await route('42', 'geojson_sea_route');
        });
        calculateBounds.mockReturnValue({ minLng: 130, minLat: 33, maxLng: 132, maxLat: 35 });
        calculateFitBoundsPadding.mockReturnValue({ top: 50, left: 414, right: 50, bottom: 50 });

        await initShareFromUrl();

        expect(calculateFitBoundsPadding).toHaveBeenCalledWith({ reserveDrawerSpace: true });
        expect(animateToRouteBounds).toHaveBeenCalledWith(
            mapRef,
            { minLng: 130, minLat: 33, maxLng: 132, maxLat: 35 },
            { top: 50, left: 414, right: 50, bottom: 50 },
        );
        expect(highlightRouteFeatures).toHaveBeenCalledWith(matchingFeatures);
    });
});