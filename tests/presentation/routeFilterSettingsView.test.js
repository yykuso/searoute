import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../js/adapters/map/geoJsonLayerAdapter.js', () => ({
    setRouteFilters: vi.fn(),
}));

import { setRouteFilters } from '../../js/adapters/map/geoJsonLayerAdapter.js';
import {
    getInitialRouteFilters,
    getLegacyRouteFilters,
    initRouteFilterSettings,
} from '../../js/presentation/map/routeFilterSettingsView.js';

function createInput({ group, key, checked = false } = {}) {
    return {
        dataset: { routeFilterGroup: group, routeFilterKey: key },
        checked,
        addEventListener: vi.fn(),
    };
}

function createDocumentStub(inputs, { filterToggle = null } = {}) {
    return {
        querySelectorAll: vi.fn(() => inputs),
        querySelector: vi.fn(() => filterToggle),
    };
}

describe('getLegacyRouteFilters', () => {
    it('showSuspendedRoutes Cookie が true の場合は運休を表示する', () => {
        const getCookieImpl = vi.fn((name) => (name === 'showSuspendedRoutes' ? 'true' : null));

        const filters = getLegacyRouteFilters({ getCookieImpl });

        expect(filters.status.suspend).toBe(true);
    });

    it('routeFilterMode=car の場合は車両航路を有効にする', () => {
        const getCookieImpl = vi.fn((name) => (name === 'routeFilterMode' ? 'car' : null));

        const filters = getLegacyRouteFilters({ getCookieImpl });

        expect(filters.carriage.car).toBe(true);
    });
});

describe('getInitialRouteFilters', () => {
    it('routeFilters Cookie が有効なJSONの場合は正規化して返す', () => {
        const getCookieImpl = vi.fn((name) => (name === 'routeFilters'
            ? JSON.stringify({ status: { active: false, season: false, suspend: true }, carriage: {} })
            : null));

        const filters = getInitialRouteFilters({ getCookieImpl });

        expect(filters).toEqual({
            status: { active: false, season: false, suspend: true },
            carriage: { car: false, bike: false, bicycle: false },
        });
    });

    it('routeFilters Cookie が壊れている場合はレガシー設定にフォールバックする', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const getCookieImpl = vi.fn((name) => (name === 'routeFilters' ? 'not-json' : null));

        const filters = getInitialRouteFilters({ getCookieImpl });

        expect(filters.status.active).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
    });
});

describe('initRouteFilterSettings', () => {
    afterEach(() => vi.clearAllMocks());

    it('フィルター入力が見つからない場合は false を返す', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const documentRef = createDocumentStub([]);

        const result = initRouteFilterSettings({ documentRef });

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith('route filter inputs not found');
        consoleWarnSpy.mockRestore();
    });

    it('入力をCookie状態に同期し、変更イベントを購読する', () => {
        const suspendInput = createInput({ group: 'status', key: 'suspend', checked: false });
        const filterToggle = { classList: { toggle: vi.fn() } };
        const documentRef = createDocumentStub([suspendInput], { filterToggle });
        const getCookieImpl = vi.fn(() => null);
        const setCookieImpl = vi.fn();

        const result = initRouteFilterSettings({ documentRef, getCookieImpl, setCookieImpl });

        expect(result).toBe(true);
        expect(setRouteFilters).toHaveBeenCalled();
        expect(suspendInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        expect(filterToggle.classList.toggle).toHaveBeenCalledWith('route-filter-active', false);

        const changeHandler = suspendInput.addEventListener.mock.calls[0][1];
        suspendInput.checked = true;
        changeHandler({ target: suspendInput });

        expect(setCookieImpl).toHaveBeenCalledWith('routeFilters', expect.any(String), 365);
        expect(filterToggle.classList.toggle).toHaveBeenCalledWith('route-filter-active', true);
    });

    it('同じ入力を二重に購読しない', () => {
        const activeInput = createInput({ group: 'status', key: 'active', checked: true });
        activeInput.dataset.routeFilterBound = 'true';
        const documentRef = createDocumentStub([activeInput]);

        initRouteFilterSettings({ documentRef, getCookieImpl: () => null, setCookieImpl: vi.fn() });

        expect(activeInput.addEventListener).not.toHaveBeenCalled();
    });
});