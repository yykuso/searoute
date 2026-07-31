import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../js/adapters/persistence/cookieControl.js', () => ({ setCookie: vi.fn() }));

import { setCookie } from '../../../js/adapters/persistence/cookieControl.js';
import { setMap } from '../../../js/adapters/map/mapRegistry.js';
import {
    bindMapMoveEndPersistence,
    bindMapResizeGuards,
    scheduleMapResizeBurst,
    watchMapContainerResize,
} from '../../../js/presentation/map/mapViewportGuard.js';

function createFakeMap() {
    return {
        resize: vi.fn(),
        getCenter: vi.fn(() => ({ lng: 139.1, lat: 35.2 })),
        getZoom: vi.fn(() => 8),
        on: vi.fn(),
    };
}

describe('mapViewportGuard', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        setMap(null);
    });

    it('scheduleMapResizeBurst は複数回の遅延でmap.resizeを呼ぶ', () => {
        const fakeMap = createFakeMap();
        setMap(fakeMap);
        vi.stubGlobal('requestAnimationFrame', (cb) => cb());

        scheduleMapResizeBurst();
        vi.runAllTimers();

        expect(fakeMap.resize).toHaveBeenCalledTimes(3);
    });

    it('scheduleMapResizeBurst を再度呼ぶと前回のタイマーをキャンセルする', () => {
        const fakeMap = createFakeMap();
        setMap(fakeMap);
        vi.stubGlobal('requestAnimationFrame', (cb) => cb());

        scheduleMapResizeBurst();
        scheduleMapResizeBurst();
        vi.runAllTimers();

        // 最初の呼び出しの3つのタイマーはキャンセルされ、2回目の3つだけが実行される
        expect(fakeMap.resize).toHaveBeenCalledTimes(3);
    });

    it('watchMapContainerResize はコンテナが存在する場合にResizeObserverを登録する', () => {
        const mapContainer = {};
        const documentStub = { getElementById: vi.fn(() => mapContainer) };
        vi.stubGlobal('document', documentStub);

        const observe = vi.fn();
        const ResizeObserverStub = vi.fn(function (callback) {
            this.observe = observe;
            this._callback = callback;
        });
        vi.stubGlobal('ResizeObserver', ResizeObserverStub);

        watchMapContainerResize();

        expect(documentStub.getElementById).toHaveBeenCalledWith('map');
        expect(observe).toHaveBeenCalledWith(mapContainer);

        vi.unstubAllGlobals();
    });

    it('bindMapResizeGuards はwindow/documentにリスナーを登録する', () => {
        const windowAddEventListener = vi.fn();
        const documentAddEventListener = vi.fn();
        vi.stubGlobal('window', { addEventListener: windowAddEventListener, visualViewport: null });
        vi.stubGlobal('document', { addEventListener: documentAddEventListener });

        bindMapResizeGuards();

        expect(windowAddEventListener).toHaveBeenCalledWith('load', expect.any(Function));
        expect(windowAddEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
        expect(windowAddEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function));
        expect(windowAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });
        expect(documentAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

        vi.unstubAllGlobals();
    });

    it('bindMapMoveEndPersistence はmoveend時に中心座標とズームをCookieへ保存する', () => {
        const fakeMap = createFakeMap();
        setMap(fakeMap);

        bindMapMoveEndPersistence();

        expect(fakeMap.on).toHaveBeenCalledWith('moveend', expect.any(Function));
        const moveEndHandler = fakeMap.on.mock.calls[0][1];
        moveEndHandler();

        expect(setCookie).toHaveBeenCalledWith('mapCenter', JSON.stringify([139.1, 35.2]), 30);
        expect(setCookie).toHaveBeenCalledWith('mapZoom', 8, 30);
    });
});
