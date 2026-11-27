// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readRouteDetailMapOptions, routeDetailMapBounds } from '../../../src/presentation/routeDetail/routeDetailMap';

function mapElement(attributes: Record<string, string>): HTMLElement {
    const element = document.createElement('div');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    return element;
}

const ports = [
    { name: '稚内', lon: 141.68254, lat: 45.41617 },
    { name: '鴛泊', lon: 141.22879, lat: 45.24182 },
];

describe('readRouteDetailMapOptions', () => {
    it('data 属性から routeId・sourceLayer・bbox・ports を読む', () => {
        const element = mapElement({
            'data-route-id': '10101',
            'data-source-layer': 'seaRoute',
            'data-bbox': '[141.04616,45.24146,141.71621,45.47422]',
            'data-ports': JSON.stringify(ports),
        });
        expect(readRouteDetailMapOptions(element)).toEqual({
            routeId: '10101',
            sourceLayer: 'seaRoute',
            bbox: [141.04616, 45.24146, 141.71621, 45.47422],
            ports,
        });
    });

    it('data-bbox がなくても ports は返す', () => {
        const element = mapElement({
            'data-route-id': 'KR010101',
            'data-source-layer': 'seaRoute_KR',
            'data-ports': JSON.stringify(ports),
        });
        const options = readRouteDetailMapOptions(element);
        expect(options).toEqual({ routeId: 'KR010101', sourceLayer: 'seaRoute_KR', ports });
        expect(options).not.toHaveProperty('bbox');
    });

    it('data-ports が不正な JSON なら null', () => {
        const element = mapElement({
            'data-route-id': '10101',
            'data-source-layer': 'seaRoute',
            'data-ports': '[{"name":',
        });
        expect(readRouteDetailMapOptions(element)).toBeNull();
    });

    it('data-bbox が不正な JSON・4 要素の数値配列でなければ null', () => {
        const base = { 'data-route-id': '10101', 'data-source-layer': 'seaRoute', 'data-ports': '[]' };
        expect(readRouteDetailMapOptions(mapElement({ ...base, 'data-bbox': 'oops' }))).toBeNull();
        expect(readRouteDetailMapOptions(mapElement({ ...base, 'data-bbox': '[1,2,3]' }))).toBeNull();
    });

    it('routeId がなければ null', () => {
        const element = mapElement({ 'data-source-layer': 'seaRoute', 'data-ports': '[]' });
        expect(readRouteDetailMapOptions(element)).toBeNull();
    });
});

describe('routeDetailMapBounds', () => {
    it('bbox があればそのまま使う', () => {
        expect(routeDetailMapBounds({ bbox: [1, 2, 3, 4], ports })).toEqual([1, 2, 3, 4]);
    });

    it('bbox がなければ港から境界を作る', () => {
        expect(routeDetailMapBounds({ ports })).toEqual([141.22879, 45.24182, 141.68254, 45.41617]);
    });

    it('bbox も港もなければ null（地図を出さない）', () => {
        expect(routeDetailMapBounds({ ports: [] })).toBeNull();
    });
});
