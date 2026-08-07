import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    disposePmtilesLayers,
    initPmtilesLayers,
    queryRouteFeatures,
    toPlainGeoJsonFeature,
    zoomToRoute,
} from '../../../js/adapters/map/pmtilesLayerAdapter.js';
import { setMap } from '../../../js/adapters/map/mapRegistry.js';

describe('PMTiles航路featureの変換', () => {
    it('MapLibre固有情報を含まないplain GeoJSON Featureへ変換する', () => {
        class MapFeature {
            constructor() {
                this.canonical = { z: 8, x: 227, y: 99 };
            }

            toJSON() {
                return {
                    type: 'Feature',
                    id: 10101,
                    properties: { routeId: '10101', color: '#0055aa' },
                    geometry: {
                        type: 'LineString',
                        coordinates: [[130, 33], [131, 34]],
                    },
                    canonical: this.canonical,
                };
            }
        }

        const result = toPlainGeoJsonFeature(new MapFeature());

        expect(result).toEqual({
            type: 'Feature',
            id: 10101,
            properties: { routeId: '10101', color: '#0055aa' },
            geometry: {
                type: 'LineString',
                coordinates: [[130, 33], [131, 34]],
            },
        });
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    });

    it('querySourceFeaturesの結果を変換して返す', () => {
        const querySourceFeatures = vi.fn(() => [{
            canonical: { z: 8, x: 227, y: 99 },
            toJSON: () => ({
                type: 'Feature',
                properties: { routeId: '10101' },
                geometry: { type: 'LineString', coordinates: [[130, 33], [131, 34]] },
                canonical: { z: 8, x: 227, y: 99 },
            }),
        }]);
        setMap({ querySourceFeatures });

        const result = queryRouteFeatures('geojson_sea_route');

        expect(querySourceFeatures).toHaveBeenCalledWith(
            'geojson_sea_route',
            { sourceLayer: 'seaRoute' },
        );
        expect(result.features[0]).not.toHaveProperty('canonical');
        expect(result.features[0]).not.toHaveProperty('toJSON');
    });
});

describe('航路選択時の移動', () => {
    it('航路全体へMapLibreのflyToでアニメーションする', () => {
        const cameraForBounds = vi.fn(() => ({ center: [130.5, 33.5], zoom: 8 }));
        const flyTo = vi.fn();
        vi.stubGlobal('document', { getElementById: vi.fn(() => null) });
        setMap({
            querySourceFeatures: vi.fn(() => [{
                type: 'Feature',
                properties: { routeId: '10101' },
                geometry: { type: 'LineString', coordinates: [[130, 33], [131, 34]] },
            }]),
            cameraForBounds,
            flyTo,
            getLayer: vi.fn(() => null),
            getSource: vi.fn(() => null),
            addSource: vi.fn(),
            addLayer: vi.fn(),
        });

        zoomToRoute({ routeId: '10101', sourceId: 'geojson_sea_route' });

        expect(cameraForBounds).toHaveBeenCalledWith(
            [[130, 33], [131, 34]],
            { padding: { top: 50, left: 50, right: 50, bottom: 50 } },
        );
        expect(flyTo).toHaveBeenCalledWith(
            {
                center: [130.5, 33.5],
                zoom: 8,
                duration: 2000,
                curve: 1.42,
                essential: true,
            },
        );
        vi.unstubAllGlobals();
    });
});

describe('PMTilesレイヤーのライフサイクル', () => {
    afterEach(() => disposePmtilesLayers());

    it('明示初期化時に詳細ドロワーのサイズ監視を開始する', () => {
        const drawerElement = {};
        const observe = vi.fn();
        const disconnect = vi.fn();
        const documentRef = {
            getElementById: vi.fn(() => drawerElement),
        };
        const ResizeObserverImpl = vi.fn(function ResizeObserver(callback) {
            this.observe = observe;
            this.disconnect = disconnect;
            callback([{ contentRect: { width: 320, height: 240 } }]);
        });

        expect(initPmtilesLayers({ documentRef, ResizeObserverImpl })).toBe(true);
        expect(initPmtilesLayers({ documentRef, ResizeObserverImpl })).toBe(false);
        expect(documentRef.getElementById).toHaveBeenCalledWith('detail-drawer');
        expect(observe).toHaveBeenCalledWith(drawerElement);
        expect(disposePmtilesLayers()).toBe(true);
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it('監視対象がなければ初期化しない', () => {
        const documentRef = { getElementById: () => null };

        expect(initPmtilesLayers({ documentRef, ResizeObserverImpl: vi.fn() })).toBe(false);
    });
});