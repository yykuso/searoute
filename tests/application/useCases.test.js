import { describe, expect, it, vi } from 'vitest';
import { bindGeolocateTrackingZoom, restoreSharedRoute } from '../../js/application/initializeMap.js';

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

describe('bindGeolocateTrackingZoom', () => {
    it('追従開始時は初回位置取得用の最大ズームに戻す', () => {
        const mapEmitter = createEmitter();
        const geolocateEmitter = createEmitter();
        geolocateEmitter.options = { fitBoundsOptions: { maxZoom: 8 } };
        const mapRef = {
            ...mapEmitter,
            getZoom: vi.fn(() => 5),
        };

        bindGeolocateTrackingZoom({ mapRef, geolocateControl: geolocateEmitter });

        geolocateEmitter.emit('trackuserlocationstart');

        expect(geolocateEmitter.options.fitBoundsOptions.maxZoom).toBe(15);
    });

    it('追従中はユーザーが選んだズームを最大ズームとして維持する', () => {
        const mapEmitter = createEmitter();
        const geolocateEmitter = createEmitter();
        geolocateEmitter.options = { fitBoundsOptions: { maxZoom: 15 } };
        const mapRef = {
            ...mapEmitter,
            getZoom: vi.fn(() => 9),
        };

        bindGeolocateTrackingZoom({ mapRef, geolocateControl: geolocateEmitter });

        geolocateEmitter.emit('trackuserlocationstart');
        mapEmitter.emit('zoomend', {});

        expect(geolocateEmitter.options.fitBoundsOptions.maxZoom).toBe(9);
    });

    it('位置情報由来のズーム変更では最大ズームを更新しない', () => {
        const mapEmitter = createEmitter();
        const geolocateEmitter = createEmitter();
        geolocateEmitter.options = { fitBoundsOptions: { maxZoom: 15 } };
        const mapRef = {
            ...mapEmitter,
            getZoom: vi.fn(() => 10),
        };

        bindGeolocateTrackingZoom({ mapRef, geolocateControl: geolocateEmitter });

        geolocateEmitter.emit('trackuserlocationstart');
        mapEmitter.emit('zoomend', { geolocateSource: true });

        expect(geolocateEmitter.options.fitBoundsOptions.maxZoom).toBe(15);
    });
});
