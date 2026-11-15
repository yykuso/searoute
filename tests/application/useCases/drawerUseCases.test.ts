import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDrawerUseCases } from '../../../src/application/useCases/drawerUseCases';
import {
    configureDrawerPresenter,
    createDrawerViewModel,
    drawerViewModel,
} from '../../../src/application/viewModels/drawerViewModel';

function createDeps(search = '') {
    const viewModel = createDrawerViewModel();
    return {
        viewModel,
        deps: {
            routeDetails: { loadRouteDetails: vi.fn(async () => ({ shipName: '第一船' })) },
            imageSearch: { findShipImage: vi.fn(async () => ({ src: 'https://example.com/a.jpg', title: '第一船' })) },
            analytics: { trackEvent: vi.fn() },
            geocoding: { reverseGeocode: vi.fn(async () => '東京都 千代田区') },
            routeMap: {
                focusSharedRoute: vi.fn(async () => [{
                    type: 'Feature' as const,
                    properties: { routeId: 42, businessName: '船社（支社）' },
                    geometry: null,
                }]),
                removeRouteHighlight: vi.fn(),
            },
            camera: { flyTo: vi.fn() },
            marker: { showPin: vi.fn(), clearPin: vi.fn() },
            ports: { getPorts: vi.fn(async () => ({ type: 'FeatureCollection' as const, features: [] })) },
            navigation: {
                getSearch: () => search,
                getPathname: () => '/index.html',
                getHref: () => `https://searoute.info/index.html${search}`,
                replaceState: vi.fn(),
            },
            drawerViewModel: viewModel,
        },
    };
}

describe('drawerUseCases', () => {
    beforeEach(() => {
        configureDrawerPresenter();
        drawerViewModel.close();
        drawerViewModel.setContent(null);
    });

    it('航路クリックで詳細を読み込み、ドロワー表示・解析送信・船画像反映を行う', async () => {
        const show = vi.fn(() => true);
        configureDrawerPresenter({ show });
        const { deps, viewModel } = createDeps();
        const useCases = createDrawerUseCases(deps);

        await useCases.selectRoute({
            properties: { routeId: 7, businessName: '船社（支社）' },
            sourceId: 'geojson_sea_route',
            lngLat: { lat: 34, lng: 135 },
            zoom: 9,
        });
        await vi.waitFor(() => expect(drawerViewModel.getState().content?.body).toMatchObject({ shipImage: { title: '第一船' } }));

        expect(deps.routeDetails.loadRouteDetails).toHaveBeenCalledWith(7, 'geojson_sea_route');
        expect(viewModel.getState().context).toEqual({
            type: 'route', routeId: 7, sourceId: 'geojson_sea_route', lat: 34, lng: 135, zoom: 9,
        });
        expect(show).toHaveBeenCalledWith(expect.objectContaining({ kind: 'route' }), '船社', '支社');
        expect(deps.marker.clearPin).toHaveBeenCalled();
        expect(deps.analytics.trackEvent).toHaveBeenCalledWith('marker_click', 'map', '船社（支社）');
        expect(deps.imageSearch.findShipImage).toHaveBeenCalledWith('第一船', '船社（支社）');
    });

    it('港湾クリックで Google マップ検索URL付きのドロワーを表示する', () => {
        const show = vi.fn(() => true);
        configureDrawerPresenter({ show });
        const { deps, viewModel } = createDeps();

        createDrawerUseCases(deps).selectPort({ properties: { Name: '神戸' }, coordinates: [135.18, 34.68] });

        expect(viewModel.getState().context).toEqual({ type: 'port', lat: 34.68, lng: 135.18, name: '神戸' });
        expect(show).toHaveBeenCalledWith(
            { kind: 'port', properties: { Name: '神戸' }, googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent('神戸港')}` },
            '神戸',
            '港湾情報',
        );
    });

    it('座標ドロワーはピンを立てて住所を非同期で反映する', async () => {
        const { deps, viewModel } = createDeps();

        createDrawerUseCases(deps).openCoordinate(35.6812345, 139.7671234);

        expect(deps.marker.showPin).toHaveBeenCalledWith([139.76712, 35.68123]);
        expect(viewModel.getState().context).toEqual({ type: 'coord', lat: 35.68123, lng: 139.76712 });
        expect(drawerViewModel.getState().content).toMatchObject({ title: '35.68123, 139.76712', subtitle: '座標情報' });
        await vi.waitFor(() => expect(drawerViewModel.getState().content?.body).toMatchObject({ address: '東京都 千代田区' }));
    });

    it('背景クリックでドロワーを閉じて強調表示を消す', () => {
        const hide = vi.fn(() => true);
        configureDrawerPresenter({ hide });
        const { deps } = createDeps();

        createDrawerUseCases(deps).handleBackgroundClick();

        expect(hide).toHaveBeenCalled();
        expect(deps.routeMap.removeRouteHighlight).toHaveBeenCalled();
    });

    it('共有URLの航路を復元し、成功したらクエリを消す', async () => {
        const { deps, viewModel } = createDeps('?share=route&routeId=42&sourceId=geojson_sea_route');

        await createDrawerUseCases(deps).restoreFromUrl();

        expect(deps.routeMap.focusSharedRoute).toHaveBeenCalledWith({
            routeId: 42, sourceId: 'geojson_sea_route', lat: undefined, lng: undefined, zoom: undefined,
        });
        expect(deps.routeDetails.loadRouteDetails).toHaveBeenCalledWith(42, 'geojson_sea_route');
        expect(viewModel.getState().context).toEqual({
            type: 'route', routeId: '42', sourceId: 'geojson_sea_route', lat: undefined, lng: undefined, zoom: undefined,
        });
        expect(deps.navigation.replaceState).toHaveBeenCalledWith('/index.html');
    });

    it('共有URLの航路が見つからなければクエリを残す', async () => {
        const { deps } = createDeps('?share=route&routeId=42&sourceId=geojson_sea_route');
        deps.routeMap.focusSharedRoute.mockResolvedValue([]);

        await createDrawerUseCases(deps).restoreFromUrl();

        expect(deps.routeDetails.loadRouteDetails).not.toHaveBeenCalled();
        expect(deps.navigation.replaceState).not.toHaveBeenCalled();
    });
});
