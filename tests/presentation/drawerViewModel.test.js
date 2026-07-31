import { describe, expect, it } from 'vitest';
import { createDrawerViewModel } from '../../js/presentation/drawerViewModel.js';

describe('drawerViewModel', () => {
    it('routeコンテキスト設定で選択航路を保持する', () => {
        const viewModel = createDrawerViewModel();

        viewModel.setContext({ type: 'route', routeId: '12', sourceId: 'geojson_sea_route' });

        const state = viewModel.getState();
        expect(state.drawer.type).toBe('route');
        expect(state.selectedRoute).toEqual({ routeId: '12', sourceId: 'geojson_sea_route' });
        expect(state.coordinate).toBeNull();
    });

    it('coordコンテキスト設定で座標を保持する', () => {
        const viewModel = createDrawerViewModel();

        viewModel.setContext({ type: 'coord', lat: 35.6, lng: 139.7 });

        const state = viewModel.getState();
        expect(state.drawer.type).toBe('coord');
        expect(state.coordinate).toEqual({ lat: 35.6, lng: 139.7 });
        expect(state.selectedRoute).toBeNull();
    });

    it('open/closeで開閉状態が切り替わる', () => {
        const viewModel = createDrawerViewModel();

        viewModel.open({ type: 'port' });
        expect(viewModel.getState().drawer).toEqual({ type: 'port', isOpen: true });

        viewModel.close();
        expect(viewModel.getState().drawer).toEqual({ type: 'port', isOpen: false });
    });
});