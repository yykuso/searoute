import { describe, expect, it, vi } from 'vitest';
import { afterFirstPaint } from '../../src/entrypoints/afterFirstPaint';

type PaintCallback = (list: { getEntriesByName(name: string): unknown[] }) => void;

function createEnvironment({ visibilityState = 'visible', supportsPaint = true, fcpRecorded = false } = {}) {
    const timers: Array<{ callback: () => void; delay: number }> = [];
    const frames: Array<() => void> = [];
    const observers: Array<{ callback: PaintCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    class FakeObserver {
        static supportedEntryTypes = supportsPaint ? ['paint'] : [];
        disconnect = vi.fn();
        constructor(callback: PaintCallback) {
            observers.push({ callback, disconnect: this.disconnect });
        }
        observe() {}
    }
    const windowRef = {
        setTimeout: (callback: () => void, delay = 0) => { timers.push({ callback, delay }); return timers.length; },
        requestAnimationFrame: (callback: () => void) => { frames.push(callback); return frames.length; },
        PerformanceObserver: FakeObserver as unknown as typeof PerformanceObserver,
    } as never;
    const env = {
        windowRef,
        documentRef: { visibilityState } as Pick<Document, 'visibilityState'>,
        performanceRef: { getEntriesByName: () => (fcpRecorded ? [{}] : []) } as unknown as Pick<Performance, 'getEntriesByName'>,
    };
    const flushTimers = (maxDelay: number) => {
        for (const timer of timers.splice(0).filter((t) => t.delay <= maxDelay)) timer.callback();
    };
    return { env, timers, frames, observers, flushTimers };
}

describe('afterFirstPaint', () => {
    it('first-contentful-paint を観測してから次のタスクで 1 回だけ実行する', () => {
        const { env, observers, flushTimers } = createEnvironment();
        const callback = vi.fn();
        afterFirstPaint(callback, env);
        flushTimers(0);
        expect(callback).not.toHaveBeenCalled();

        observers[0].callback({ getEntriesByName: () => [{}] });
        expect(observers[0].disconnect).toHaveBeenCalled();
        flushTimers(0);
        expect(callback).toHaveBeenCalledTimes(1);

        flushTimers(Infinity);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('FCP 済みなら次のタスクで実行する', () => {
        const { env, flushTimers } = createEnvironment({ fcpRecorded: true });
        const callback = vi.fn();
        afterFirstPaint(callback, env);
        flushTimers(0);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('FCP が来なくても一定時間後に実行する', () => {
        const { env, timers } = createEnvironment();
        const callback = vi.fn();
        afterFirstPaint(callback, env);
        timers.find((t) => t.delay > 0)?.callback();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('Paint Timing 未対応なら requestAnimationFrame の後のタスクで実行する', () => {
        const { env, frames, flushTimers } = createEnvironment({ supportsPaint: false });
        const callback = vi.fn();
        afterFirstPaint(callback, env);
        flushTimers(0);
        expect(callback).not.toHaveBeenCalled();
        frames[0]();
        flushTimers(0);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('非表示タブでは描画を待たずに実行する', () => {
        const { env, observers, flushTimers } = createEnvironment({ visibilityState: 'hidden' });
        const callback = vi.fn();
        afterFirstPaint(callback, env);
        expect(observers).toHaveLength(0);
        flushTimers(0);
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
