import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    configureDrawerPresenter,
    hideDrawer,
    openCoordinateDrawer,
    showDrawer,
} from '../../js/presentation/drawerViewModel.js';
import { drawerViewModel } from '../../js/presentation/drawerViewModel.js';

describe('drawerPresenter', () => {
    beforeEach(() => {
        configureDrawerPresenter();
        drawerViewModel.close();
        drawerViewModel.setContext(null);
    });

    it('設定したドロワー操作へ引数を委譲する', () => {
        const show = vi.fn(() => true);
        const hide = vi.fn(() => true);
        const openCoordinate = vi.fn(() => true);
        configureDrawerPresenter({ show, hide, openCoordinate });

        expect(showDrawer('content', 'title', 'subtitle')).toBe(true);
        expect(hideDrawer()).toBe(true);
        expect(openCoordinateDrawer(35, 136)).toBe(true);
        expect(show).toHaveBeenCalledWith('content', 'title', 'subtitle');
        expect(hide).toHaveBeenCalledOnce();
        expect(openCoordinate).toHaveBeenCalledWith(35, 136);
    });

    it('show/hide/openCoordinate はドロワー開閉状態を同期する', () => {
        configureDrawerPresenter({
            show: vi.fn(() => true),
            hide: vi.fn(() => true),
            openCoordinate: vi.fn(() => true),
        });

        showDrawer('content', 'title');
        expect(drawerViewModel.getState().drawer.isOpen).toBe(true);

        hideDrawer();
        expect(drawerViewModel.getState().drawer.isOpen).toBe(false);

        openCoordinateDrawer(35, 136);
        expect(drawerViewModel.getState().drawer).toEqual({ type: 'coord', isOpen: true });
    });

    it('未設定の操作は安全に失敗する', () => {
        expect(showDrawer()).toBe(false);
        expect(hideDrawer()).toBe(false);
        expect(openCoordinateDrawer()).toBe(false);
    });
});