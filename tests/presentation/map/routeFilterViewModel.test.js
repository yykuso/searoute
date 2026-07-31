import { describe, expect, it, vi } from 'vitest';
import {
    createRouteFilterViewModel,
    getInitialRouteFilters,
    getLegacyRouteFilters,
} from '../../../js/presentation/map/routeFilterViewModel.js';

describe('getLegacyRouteFilters', () => {
    it('routeFilterMode=suspend の場合は運休のみ有効になる', () => {
        const getCookieImpl = vi.fn((name) => (name === 'routeFilterMode' ? 'suspend' : null));

        const filters = getLegacyRouteFilters({ getCookieImpl });

        expect(filters.status).toEqual({ active: false, season: false, suspend: true });
    });
});

describe('getInitialRouteFilters', () => {
    it('routeFilters Cookie が壊れている場合はレガシー設定にフォールバックする', () => {
        const logger = { warn: vi.fn() };
        const getCookieImpl = vi.fn((name) => {
            if (name === 'routeFilters') return 'not-json';
            if (name === 'routeFilterMode') return 'car';
            return null;
        });

        const filters = getInitialRouteFilters({ getCookieImpl, logger });

        expect(filters.carriage.car).toBe(true);
        expect(logger.warn).toHaveBeenCalled();
    });
});

describe('createRouteFilterViewModel', () => {
    it('initialize と setFilter で適用・永続化コールバックを呼び出す', () => {
        const onApply = vi.fn();
        const onPersist = vi.fn();
        const viewModel = createRouteFilterViewModel({
            initialFilters: {
                status: { active: true, season: true, suspend: false },
                carriage: { car: false, bike: false, bicycle: false },
            },
            onApply,
            onPersist,
        });

        const snapshots = [];
        viewModel.subscribe((state) => snapshots.push(state));

        viewModel.initialize();
        viewModel.setFilter('status', 'suspend', true);

        expect(onApply).toHaveBeenCalledTimes(2);
        expect(onPersist).toHaveBeenCalledTimes(2);
        expect(snapshots.at(-1).filters.status.suspend).toBe(true);
    });
});