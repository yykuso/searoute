import { describe, expect, it, vi } from 'vitest';
import { isMapControlTarget } from '../../../js/presentation/map/mapPointerInteractions.js';

describe('isMapControlTarget', () => {
    it('MapLibreコントロール配下の要素を除外する', () => {
        const target = {
            closest: vi.fn().mockReturnValue({ className: 'maplibregl-ctrl' }),
        };

        expect(isMapControlTarget(target)).toBe(true);
        expect(target.closest).toHaveBeenCalledWith('.maplibregl-ctrl');
    });

    it('地図上の要素は除外しない', () => {
        const target = { closest: vi.fn().mockReturnValue(null) };

        expect(isMapControlTarget(target)).toBe(false);
    });
});