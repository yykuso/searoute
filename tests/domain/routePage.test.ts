import { describe, expect, it } from 'vitest';
import {
    ROUTE_PAGE_LAYERS,
    buildRouteDetailPath,
    getRelatedRoutes,
    getVehicleLabels,
    normalizeRoutePages,
} from '../../src/domain/routePage';
import type { RoutePageRecord } from '../../src/domain/routePage';

describe('normalizeRoutePages', () => {
    it('未知レイヤーを除外し ports を補完し routeId 昇順に並べる', () => {
        const result = normalizeRoutePages({
            records: [
                { routeId: '200', layer: 'seaRoute_KR' },
                { routeId: '20', layer: 'seaRoute_limited' },
                { routeId: '100', layer: 'seaRoute', ports: [{ name: 'A', lon: 1, lat: 2 }] },
                { routeId: '9', layer: 'seaRoute_international' },
            ],
        });
        expect(result.map((r) => r.routeId)).toEqual(['9', '100', '200']);
        expect(result[0].ports).toEqual([]);
        expect(result[1].ports).toHaveLength(1);
    });

    it('routeId 重複で throw する', () => {
        expect(() => normalizeRoutePages({
            records: [
                { routeId: '1', layer: 'seaRoute' },
                { routeId: '1', layer: 'seaRoute_KR' },
            ],
        })).toThrow(/1/);
    });

    it('records がなければ空配列', () => {
        expect(normalizeRoutePages(null)).toEqual([]);
        expect(normalizeRoutePages({})).toEqual([]);
    });
});

describe('ROUTE_PAGE_LAYERS', () => {
    it('レイヤー定義', () => {
        expect(ROUTE_PAGE_LAYERS.seaRoute).toEqual({ sourceId: 'geojson_sea_route', label: '国内航路', anchorId: 'domestic' });
        expect(ROUTE_PAGE_LAYERS.seaRoute_international.anchorId).toBe('international');
        expect(ROUTE_PAGE_LAYERS.seaRoute_KR).toEqual({ sourceId: 'geojson_KR_sea_route', label: '韓国 国内航路', anchorId: 'korea' });
    });
});

describe('buildRouteDetailPath', () => {
    it('末尾スラッシュ付き', () => {
        expect(buildRouteDetailPath('10101')).toBe('/route/10101/');
        expect(buildRouteDetailPath('a b')).toBe('/route/a%20b/');
    });
});

describe('getVehicleLabels', () => {
    it('1 の項目だけ順に返す', () => {
        const base = { routeId: '1', layer: 'seaRoute', ports: [] } as RoutePageRecord;
        expect(getVehicleLabels({ ...base, car: 1, bike: 0, bicycle: 1 })).toEqual(['自動車', '自転車']);
        expect(getVehicleLabels(base)).toEqual([]);
    });
});

describe('getRelatedRoutes', () => {
    const make = (id: string, businessName?: string): RoutePageRecord => ({ routeId: id, layer: 'seaRoute', businessName, ports: [] });

    it('自分を除外する', () => {
        const all = [make('1', 'X'), make('2', 'X'), make('3', 'Y')];
        expect(getRelatedRoutes(all[0], all).map((r) => r.routeId)).toEqual(['2']);
    });

    it('事業者が空なら空配列', () => {
        const all = [make('1'), make('2')];
        expect(getRelatedRoutes(all[0], all)).toEqual([]);
    });

    it('最大 10 件・routeId 昇順', () => {
        const all = Array.from({ length: 11 }, (_, i) => make(String(11 - i), 'X'));
        const result = getRelatedRoutes(all.find((r) => r.routeId === '11')!, all);
        expect(result).toHaveLength(10);
        expect(result.map((r) => r.routeId)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    });
});
