import { describe, expect, it } from 'vitest';
import {
    DEFAULT_ROUTE_FILTERS,
    cloneDefaultRouteFilters,
    isDefaultRouteFilters,
    normalizeRouteFilters,
} from '../../js/domain/routeFilter.js';

describe('routeFilter', () => {
    it('既定のフィルターを独立したオブジェクトとして複製する', () => {
        const first = cloneDefaultRouteFilters();
        const second = cloneDefaultRouteFilters();

        first.status.active = false;

        expect(second).toEqual(DEFAULT_ROUTE_FILTERS);
        expect(DEFAULT_ROUTE_FILTERS.status.active).toBe(true);
    });

    it('既知のキーを真偽値へ正規化し、未知のキーを除外する', () => {
        expect(normalizeRouteFilters({
            status: { active: 1, season: '', suspend: 'yes', unknown: true },
            carriage: { car: null, bike: [], bicycle: 0 },
            unknown: { enabled: true },
        })).toEqual({
            status: { active: true, season: false, suspend: true },
            carriage: { car: false, bike: true, bicycle: false },
        });
    });

    it('不足しているキーを false として正規化する', () => {
        expect(normalizeRouteFilters({ status: { active: true } })).toEqual({
            status: { active: true, season: false, suspend: false },
            carriage: { car: false, bike: false, bicycle: false },
        });
    });

    it('既定値と一致するか判定する', () => {
        expect(isDefaultRouteFilters(DEFAULT_ROUTE_FILTERS)).toBe(true);
        expect(isDefaultRouteFilters({
            ...cloneDefaultRouteFilters(),
            carriage: { car: true, bike: false, bicycle: false },
        })).toBe(false);
    });
});