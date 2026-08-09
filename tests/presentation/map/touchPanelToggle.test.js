import { describe, expect, it, vi } from 'vitest';
import { bindTouchPanelToggle } from '../../../js/presentation/map/touchPanelToggle.js';

describe('bindTouchPanelToggle', () => {
    it('1本指のタッチを消費してパネルを開閉する', () => {
        const listeners = new Map();
        const toggleElement = {
            addEventListener: vi.fn((eventName, handler) => listeners.set(eventName, handler)),
            removeEventListener: vi.fn(),
            contains: vi.fn(() => false),
        };
        const panelElement = { style: { display: 'none' } };
        panelElement.contains = vi.fn(() => false);
        const documentRef = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();

        const unbind = bindTouchPanelToggle(toggleElement, panelElement, { documentRef });
        const handleTouchStart = listeners.get('touchstart');
        const event = { touches: [{}], preventDefault, stopPropagation };

        handleTouchStart(event);
        expect(panelElement.style.display).toBe('block');
        expect(preventDefault).toHaveBeenCalledOnce();
        expect(stopPropagation).toHaveBeenCalledOnce();
        expect(toggleElement.addEventListener).toHaveBeenCalledWith(
            'touchstart',
            handleTouchStart,
            { passive: false },
        );
        expect(documentRef.addEventListener).toHaveBeenCalledWith(
            'touchstart',
            expect.any(Function),
            { passive: true },
        );

        handleTouchStart(event);
        expect(panelElement.style.display).toBe('none');

        unbind();
        expect(toggleElement.removeEventListener).toHaveBeenCalledWith('touchstart', handleTouchStart);
    });

    it('パネル外の次のタッチで閉じる', () => {
        let handleTouchStart;
        let handleOutsideTouch;
        const toggleElement = {
            addEventListener: vi.fn((eventName, handler) => { handleTouchStart = handler; }),
            removeEventListener: vi.fn(),
            contains: vi.fn(() => false),
        };
        const panelElement = {
            style: { display: 'none' },
            contains: vi.fn(() => false),
        };
        const documentRef = {
            addEventListener: vi.fn((eventName, handler) => { handleOutsideTouch = handler; }),
            removeEventListener: vi.fn(),
        };

        bindTouchPanelToggle(toggleElement, panelElement, { documentRef });
        handleTouchStart({
            touches: [{}],
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        });
        handleOutsideTouch({ target: {} });

        expect(panelElement.style.display).toBe('none');
        expect(documentRef.removeEventListener).toHaveBeenCalledWith('touchstart', handleOutsideTouch);
    });

    it('別のパネルを開くと先に開いていたパネルを閉じる', () => {
        const handlers = [];
        const createToggle = () => ({
            addEventListener: vi.fn((eventName, handler) => handlers.push(handler)),
            removeEventListener: vi.fn(),
            contains: vi.fn(() => false),
        });
        const firstToggle = createToggle();
        const secondToggle = createToggle();
        const firstPanel = { style: { display: 'none' }, contains: vi.fn(() => false) };
        const secondPanel = { style: { display: 'none' }, contains: vi.fn(() => false) };
        const documentRef = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        const touchEvent = {
            touches: [{}],
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        };

        const unbindFirst = bindTouchPanelToggle(firstToggle, firstPanel, { documentRef });
        const unbindSecond = bindTouchPanelToggle(secondToggle, secondPanel, { documentRef });
        handlers[0](touchEvent);
        handlers[1](touchEvent);

        expect(firstPanel.style.display).toBe('none');
        expect(secondPanel.style.display).toBe('block');

        unbindFirst();
        unbindSecond();
    });

    it('複数指のタッチは地図操作のために消費しない', () => {
        let handleTouchStart;
        const toggleElement = {
            addEventListener: vi.fn((eventName, handler) => { handleTouchStart = handler; }),
            removeEventListener: vi.fn(),
            contains: vi.fn(() => false),
        };
        const panelElement = { style: { display: 'none' }, contains: vi.fn(() => false) };
        const documentRef = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
        const event = {
            touches: [{}, {}],
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        };

        bindTouchPanelToggle(toggleElement, panelElement, { documentRef });
        handleTouchStart(event);

        expect(panelElement.style.display).toBe('none');
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(event.stopPropagation).not.toHaveBeenCalled();
    });
});