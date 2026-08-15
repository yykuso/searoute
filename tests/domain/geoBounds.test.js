import { describe, expect, it } from 'vitest';
import { boundsFromBbox, calculateBounds } from '../../js/domain/geoBounds.js';

describe('boundsFromBbox', () => {
    it('詳細JSONのbboxを境界オブジェクトへ変換する', () => {
        expect(boundsFromBbox([141.04, 45.24, 141.71, 45.47])).toEqual({
            minLng: 141.04,
            minLat: 45.24,
            maxLng: 141.71,
            maxLat: 45.47,
        });
    });

    it.each([
        undefined,
        [],
        [141.04, 45.24, 141.71],
        [141.04, 45.24, '141.71', 45.47],
        [141.71, 45.24, 141.04, 45.47],
        [141.04, -91, 141.71, 45.47],
    ])('欠損または不正なbboxではnullを返す: %j', (bbox) => {
        expect(boundsFromBbox(bbox)).toBeNull();
    });
});

describe('calculateBounds', () => {
    it('LineStringの境界を計算する', () => {
        expect(calculateBounds([{
            geometry: {
                type: 'LineString',
                coordinates: [[139.5, 35.8], [130.2, 33.1], [141.1, 43.2]],
            },
        }])).toEqual({ minLng: 130.2, maxLng: 141.1, minLat: 33.1, maxLat: 43.2 });
    });

    it('複数のMultiLineStringをまとめて計算する', () => {
        expect(calculateBounds([
            {
                geometry: {
                    type: 'MultiLineString',
                    coordinates: [
                        [[129, 32], [130, 33]],
                        [[140, 42], [141, 44]],
                    ],
                },
            },
            {
                geometry: {
                    type: 'LineString',
                    coordinates: [[135, 30], [145, 40]],
                },
            },
        ])).toEqual({ minLng: 129, maxLng: 145, minLat: 30, maxLat: 44 });
    });

    it('対象となる線がない場合はnullを返す', () => {
        expect(calculateBounds([])).toBeNull();
        expect(calculateBounds([{
            geometry: { type: 'Point', coordinates: [139, 35] },
        }])).toBeNull();
    });
});