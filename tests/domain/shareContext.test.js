import { describe, expect, it } from 'vitest';
import {
    buildShareUrl,
    getShareTargetLayerId,
    parseShareContext,
} from '../../js/domain/shareContext.js';

describe('shareContext', () => {
    it('航路共有クエリを任意の地図状態とともに解析する', () => {
        expect(parseShareContext('?share=route&routeId=42&sourceId=geojson_sea_route&lat=35.1&lng=139.2&zoom=8')).toEqual({
            type: 'route',
            routeId: '42',
            sourceId: 'geojson_sea_route',
            lat: 35.1,
            lng: 139.2,
            zoom: 8,
        });
    });

    it('必須値が不足した共有クエリを拒否する', () => {
        expect(parseShareContext('?share=route&routeId=42')).toBeNull();
        expect(parseShareContext('?share=port&lat=35&lng=139')).toBeNull();
        expect(parseShareContext('?share=coord&lat=x&lng=139')).toBeNull();
        expect(parseShareContext('?share=unknown')).toBeNull();
    });

    it('既存クエリを除去して港湾共有URLを構築する', () => {
        const url = buildShareUrl(
            { type: 'port', lat: 35.1, lng: 139.2, name: 'テスト港' },
            'https://searoute.info/index.html?old=value#map'
        );

        expect(url.toString()).toBe('https://searoute.info/index.html?share=port&lat=35.1&lng=139.2&name=%E3%83%86%E3%82%B9%E3%83%88%E6%B8%AF#map');
    });

    it('共有種別に対応するレイヤーIDを返す', () => {
        expect(getShareTargetLayerId({ type: 'route', sourceId: 'geojson_sea_route' })).toBe('geojson_sea_route');
        expect(getShareTargetLayerId({ type: 'port' })).toBe('geojson_port');
        expect(getShareTargetLayerId({ type: 'coord' })).toBe('geojson_port');
        expect(getShareTargetLayerId({ type: 'unknown' })).toBeNull();
        expect(getShareTargetLayerId(null)).toBeNull();
    });
});