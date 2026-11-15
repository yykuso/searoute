// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindMapPointerInteractions, isMapControlTarget, LONG_PRESS_MS } from '../../../src/presentation/map/mapPointerInteractions';

afterEach(() => vi.useRealTimers());

function matchMedia(coarse: boolean) {
    return { matchMedia: () => ({ matches: coarse }) } as unknown as Window;
}

function touchEvent(type: string, x: number, y: number, target: Element) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'touches', { value: [{ clientX: x, clientY: y }] });
    target.dispatchEvent(event);
}

describe('isMapControlTarget', () => {
    it('MapLibreコントロール配下の要素を除外する', () => {
        const control = document.createElement('div');
        control.className = 'maplibregl-ctrl';
        const button = document.createElement('button');
        control.append(button);
        expect(isMapControlTarget(button)).toBe(true);
    });

    it('地図上の要素は除外しない', () => {
        expect(isMapControlTarget(document.createElement('canvas'))).toBe(false);
        expect(isMapControlTarget(null)).toBe(false);
    });
});

describe('bindMapPointerInteractions', () => {
    it('PC の右クリックでコンテキストメニューを開き、既定メニューを抑止する', () => {
        const map = document.createElement('div');
        const handlers = { onContextMenu: vi.fn(), onLongPress: vi.fn() };
        bindMapPointerInteractions(map, handlers, { windowRef: matchMedia(false) });
        const event = new MouseEvent('contextmenu', { clientX: 10, clientY: 20, bubbles: true, cancelable: true });
        map.dispatchEvent(event);
        expect(handlers.onContextMenu).toHaveBeenCalledWith(10, 20);
        expect(event.defaultPrevented).toBe(true);
    });

    it('コントロール上の右クリックは無視する', () => {
        const map = document.createElement('div');
        const control = document.createElement('div');
        control.className = 'maplibregl-ctrl';
        map.append(control);
        const handlers = { onContextMenu: vi.fn(), onLongPress: vi.fn() };
        bindMapPointerInteractions(map, handlers, { windowRef: matchMedia(false) });
        control.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        expect(handlers.onContextMenu).not.toHaveBeenCalled();
    });

    it('タッチ端末で 700ms 長押しすると開始位置で通知し、ドラッグすると取り消す', () => {
        vi.useFakeTimers();
        const map = document.createElement('div');
        const handlers = { onContextMenu: vi.fn(), onLongPress: vi.fn() };
        const unbind = bindMapPointerInteractions(map, handlers, { windowRef: matchMedia(true) });

        touchEvent('touchstart', 50, 60, map);
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(handlers.onLongPress).toHaveBeenCalledWith(50, 60);

        touchEvent('touchstart', 50, 60, map);
        touchEvent('touchmove', 80, 60, map);
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(handlers.onLongPress).toHaveBeenCalledOnce();

        touchEvent('touchstart', 50, 60, map);
        map.dispatchEvent(new Event('touchend'));
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(handlers.onLongPress).toHaveBeenCalledOnce();
        unbind();
    });
});
