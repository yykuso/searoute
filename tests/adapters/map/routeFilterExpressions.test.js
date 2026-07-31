import { describe, expect, it } from 'vitest';
import {
    NEVER_MATCH_FILTER,
    STATUS_FILTERS,
    buildAnyFilter,
    buildAvailabilityFilter,
    buildCarriageFilter,
    buildRouteFilter,
    buildStatusFilterForSuffix,
    combineFilters,
} from '../../../js/adapters/map/pmtilesLayerAdapter.js';

describe('buildAvailabilityFilter', () => {
    it('プロパティが 1 または "1" のときにマッチする expression を返す', () => {
        const expr = buildAvailabilityFilter('car');
        expect(expr).toEqual(['any',
            ['==', ['get', 'car'], 1],
            ['==', ['get', 'car'], '1'],
        ]);
    });
});

describe('buildAnyFilter', () => {
    it('空の場合は fallback を返す', () => {
        expect(buildAnyFilter([], 'FALLBACK')).toBe('FALLBACK');
        expect(buildAnyFilter([null, false], null)).toBe(null);
    });

    it('1 つだけの場合はそのまま返す', () => {
        const f = STATUS_FILTERS.active;
        expect(buildAnyFilter([f])).toBe(f);
    });

    it('複数の場合は ["any", ...] で包む', () => {
        const a = STATUS_FILTERS.active;
        const b = STATUS_FILTERS.season;
        expect(buildAnyFilter([a, b])).toEqual(['any', a, b]);
    });
});

describe('combineFilters', () => {
    it('空の場合は null を返す', () => {
        expect(combineFilters()).toBe(null);
        expect(combineFilters(null, null)).toBe(null);
    });

    it('1 つだけの場合はそのまま返す', () => {
        const f = STATUS_FILTERS.active;
        expect(combineFilters(f)).toBe(f);
    });

    it('複数の場合は ["all", ...] で包む', () => {
        const a = STATUS_FILTERS.active;
        const b = STATUS_FILTERS.season;
        expect(combineFilters(a, b)).toEqual(['all', a, b]);
    });
});

describe('buildStatusFilterForSuffix', () => {
    it('_solidline / active=true は STATUS_FILTERS.active を返す', () => {
        expect(buildStatusFilterForSuffix('_solidline', { active: true })).toBe(STATUS_FILTERS.active);
    });

    it('_solidline / active=false は NEVER_MATCH_FILTER を返す', () => {
        expect(buildStatusFilterForSuffix('_solidline', { active: false })).toBe(NEVER_MATCH_FILTER);
    });

    it('_dashline / season=true は STATUS_FILTERS.season を返す', () => {
        expect(buildStatusFilterForSuffix('_dashline', { season: true })).toBe(STATUS_FILTERS.season);
    });

    it('_thinline / suspend=false は NEVER_MATCH_FILTER を返す', () => {
        expect(buildStatusFilterForSuffix('_thinline', { suspend: false })).toBe(NEVER_MATCH_FILTER);
    });

    it('_outline は有効なステータス全てを any で返す', () => {
        const result = buildStatusFilterForSuffix('_outline', { active: true, season: true, suspend: false });
        expect(result).toEqual(['any', STATUS_FILTERS.active, STATUS_FILTERS.season]);
    });

    it('全て無効の場合は NEVER_MATCH_FILTER を返す', () => {
        expect(buildStatusFilterForSuffix('_outline', {})).toBe(NEVER_MATCH_FILTER);
    });
});

describe('buildCarriageFilter', () => {
    it('carriage が空の場合は null を返す', () => {
        expect(buildCarriageFilter({})).toBe(null);
        expect(buildCarriageFilter()).toBe(null);
    });

    it('car のみ有効の場合は car の availability filter を返す', () => {
        const result = buildCarriageFilter({ car: true });
        expect(result).toEqual(['any',
            ['==', ['get', 'car'], 1],
            ['==', ['get', 'car'], '1'],
        ]);
    });

    it('複数有効の場合は any で結合する', () => {
        const result = buildCarriageFilter({ car: true, bike: true });
        expect(result[0]).toBe('any');
        expect(result).toHaveLength(3);
    });
});

describe('buildRouteFilter', () => {
    it('status と carriage を all で組み合わせる', () => {
        const filter = buildRouteFilter('_solidline', {
            status: { active: true },
            carriage: { car: true },
        });
        expect(filter[0]).toBe('all');
        expect(filter[1]).toBe(STATUS_FILTERS.active);
    });

    it('carriage が全て無効の場合は status フィルターのみ返す', () => {
        const filter = buildRouteFilter('_solidline', {
            status: { active: true },
            carriage: {},
        });
        expect(filter).toBe(STATUS_FILTERS.active);
    });
});
