import { describe, expect, it, vi } from 'vitest';
import { bindGeolocateTrackingWithoutZoomLock, restoreSharedRoute } from '../../js/application/initializeMap.js';

function createEmitter() {
    const handlers = new Map();
    return {
        on: vi.fn((eventName, handler) => {
            const list = handlers.get(eventName) || [];
            list.push(handler);
            handlers.set(eventName, list);
        }),
        emit: (eventName, payload) => {
            const list = handlers.get(eventName) || [];
            for (const handler of list) {
                handler(payload);
            }
        },
    };
}

describe('restoreSharedRoute', () => {
    it('ensureSharedLayerEnabled と initShareFromUrl を順番に呼ぶ', async () => {
        const calls = [];
        const ensureSharedLayerEnabled = vi.fn(async () => calls.push('ensure'));
        const initShareFromUrl = vi.fn(async () => calls.push('init'));
        await restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl });
        expect(calls).toEqual(['ensure', 'init']);
    });

    it('ensureSharedLayerEnabled が失敗しても initShareFromUrl は実行される', async () => {
        const ensureSharedLayerEnabled = vi.fn(async () => { throw new Error('fail'); });
        const initShareFromUrl = vi.fn(async () => {});
        await restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl });
        expect(initShareFromUrl).toHaveBeenCalled();
    });
});

describe('bindGeolocateTrackingWithoutZoomLock', () => {
    it('初回 geolocate は既定ズームを尊重し、強制補正しない', () => {
        const mapEmitter = createEmitter();
        const geolocateEmitter = createEmitter();
        const mapRef = {
            ...mapEmitter,
            getZoom: vi.fn(() => 5),
            easeTo: vi.fn(),
        };

        bindGeolocateTrackingWithoutZoomLock({ mapRef, geolocateControl: geolocateEmitter });

        geolocateEmitter.emit('trackuserlocationstart');
        geolocateEmitter.emit('geolocate', { coords: { longitude: 139.7, latitude: 35.6 } });

        expect(mapRef.easeTo).not.toHaveBeenCalled();
    });

    it('追従中はユーザーが選んだズームを維持して中心のみ更新する', () => {
        vi.useFakeTimers();

        let currentZoom = 5;
        const mapEmitter = createEmitter();
        const geolocateEmitter = createEmitter();
        const mapRef = {
            ...mapEmitter,
            getZoom: vi.fn(() => currentZoom),
            easeTo: vi.fn(),
        };

        bindGeolocateTrackingWithoutZoomLock({ mapRef, geolocateControl: geolocateEmitter });

        geolocateEmitter.emit('trackuserlocationstart');

        // 初回追従で既定ズームに変わった状態を想定
        currentZoom = 12;
        geolocateEmitter.emit('geolocate', { coords: { longitude: 139.7, latitude: 35.6 } });

        // ユーザーが手動でズーム変更
        currentZoom = 9;
        mapEmitter.emit('zoomend');

        geolocateEmitter.emit('geolocate', { coords: { longitude: 140.0, latitude: 36.0 } });
        vi.runAllTimers();

        expect(mapRef.easeTo).toHaveBeenCalledWith({
            center: [140.0, 36.0],
            zoom: 9,
            duration: 0,
            animate: false,
            essential: true,
        });

        vi.useRealTimers();
    });

    it('追従終了後は geolocate で補正しない', () => {
        vi.useFakeTimers();

        const mapEmitter = createEmitter();
        const geolocateEmitter = createEmitter();
        const mapRef = {
            ...mapEmitter,
            getZoom: vi.fn(() => 10),
            easeTo: vi.fn(),
        };

        bindGeolocateTrackingWithoutZoomLock({ mapRef, geolocateControl: geolocateEmitter });

        geolocateEmitter.emit('trackuserlocationstart');
        geolocateEmitter.emit('trackuserlocationend');
        geolocateEmitter.emit('geolocate', { coords: { longitude: 141.0, latitude: 37.0 } });
        vi.runAllTimers();

        expect(mapRef.easeTo).not.toHaveBeenCalled();

        vi.useRealTimers();
    });
});
