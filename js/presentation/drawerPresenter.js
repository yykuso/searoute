import { drawerViewModel } from './drawerViewModel.js';

const defaultPresenter = {
    show: () => false,
    hide: () => false,
    openCoordinate: () => false,
};

let presenter = { ...defaultPresenter };

export function configureDrawerPresenter(overrides = {}) {
    presenter = { ...defaultPresenter, ...overrides };
}

export function showDrawer(content, title, subtitle) {
    const result = presenter.show(content, title, subtitle);
    drawerViewModel.open();
    return result;
}

export function hideDrawer() {
    const result = presenter.hide();
    drawerViewModel.close();
    return result;
}

export function openCoordinateDrawer(lat, lng) {
    const result = presenter.openCoordinate(lat, lng);
    drawerViewModel.open({ type: 'coord' });
    return result;
}