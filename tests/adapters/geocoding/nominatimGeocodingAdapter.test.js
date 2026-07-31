import { describe, expect, it, vi } from 'vitest';
import { forwardGeocode, reverseGeocode } from '../../../js/adapters/geocoding/nominatimGeocodingAdapter.js';

function jsonResponse(body) {
    return { json: () => Promise.resolve(body) };
}

describe('nominatimGeocodingAdapter', () => {
    describe('forwardGeocode', () => {
        it('GeoJSON Feature配列からPoint候補を生成する', async () => {
            const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
                features: [
                    {
                        bbox: [130, 30, 132, 32],
                        properties: { display_name: 'テスト港' },
                    },
                ],
            }));

            const result = await forwardGeocode('テスト港', { fetchImpl });

            expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('q=テスト港'));
            expect(result.features).toHaveLength(1);
            expect(result.features[0]).toMatchObject({
                type: 'Feature',
                place_name: 'テスト港',
                text: 'テスト港',
                place_type: ['place'],
                center: [131, 31],
            });
        });

        it('取得に失敗した場合は空のfeatures配列を返す', async () => {
            const fetchImpl = vi.fn().mockRejectedValue(new Error('network error'));

            const result = await forwardGeocode('テスト港', { fetchImpl });

            expect(result).toEqual({ features: [] });
        });
    });

    describe('reverseGeocode', () => {
        it('display_nameをカンマ区切りで反転整形して返す', async () => {
            const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
                display_name: '日本, 東京都, 千代田区',
            }));

            const addr = await reverseGeocode(35.0, 139.0, { fetchImpl });

            expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('lat=35'));
            expect(addr).toBe('千代田区 東京都 日本');
        });

        it('display_nameが無い場合は「住所情報なし」を返す', async () => {
            const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));

            const addr = await reverseGeocode(35.0, 139.0, { fetchImpl });

            expect(addr).toBe('住所情報なし');
        });

        it('取得に失敗した場合は「住所取得失敗」を返す', async () => {
            const fetchImpl = vi.fn().mockRejectedValue(new Error('network error'));

            const addr = await reverseGeocode(35.0, 139.0, { fetchImpl });

            expect(addr).toBe('住所取得失敗');
        });
    });
});
