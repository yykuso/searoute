// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindTouchPanelToggle, usePanelToggle } from '../../../src/presentation/map/touchPanelToggle';

afterEach(cleanup);

function Panel({ id }: { id: string }) {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const toggleRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open] = usePanelToggle(container, toggleRef, panelRef);
    return (
        <div data-testid={`${id}-container`} ref={setContainer}>
            <div data-testid={`${id}-toggle`} ref={toggleRef}>toggle</div>
            <div data-testid={`${id}-panel`} ref={panelRef} style={{ display: open ? 'block' : 'none' }}>panel</div>
        </div>
    );
}

function touch(element: Element, touches = 1) {
    const event = new Event('touchstart', { bubbles: true, cancelable: true }) as Event & { touches: unknown[] };
    Object.defineProperty(event, 'touches', { value: Array.from({ length: touches }, () => ({})) });
    const stopPropagation = vi.spyOn(event, 'stopPropagation');
    act(() => { element.dispatchEvent(event); });
    return { event, stopPropagation };
}

describe('usePanelToggle', () => {
    it('1本指のタッチを消費してパネルを開閉する', () => {
        const { getByTestId } = render(<Panel id="a" />);
        const { event, stopPropagation } = touch(getByTestId('a-toggle'));
        expect(getByTestId('a-panel').style.display).toBe('block');
        expect(event.defaultPrevented).toBe(true);
        expect(stopPropagation).toHaveBeenCalledOnce();

        touch(getByTestId('a-toggle'));
        expect(getByTestId('a-panel').style.display).toBe('none');
    });

    it('パネル外の次のタッチで閉じ、パネル内のタッチでは閉じない', () => {
        const { getByTestId } = render(<><Panel id="a" /><div data-testid="outside" /></>);
        touch(getByTestId('a-toggle'));
        touch(getByTestId('a-panel'));
        expect(getByTestId('a-panel').style.display).toBe('block');
        touch(getByTestId('outside'));
        expect(getByTestId('a-panel').style.display).toBe('none');
    });

    it('別のパネルを開くと先に開いていたパネルを閉じる', () => {
        const { getByTestId } = render(<><Panel id="a" /><Panel id="b" /></>);
        touch(getByTestId('a-toggle'));
        touch(getByTestId('b-toggle'));
        expect(getByTestId('a-panel').style.display).toBe('none');
        expect(getByTestId('b-panel').style.display).toBe('block');
    });

    it('複数指のタッチは地図操作のために消費しない', () => {
        const { getByTestId } = render(<Panel id="a" />);
        const { event } = touch(getByTestId('a-toggle'), 2);
        expect(getByTestId('a-panel').style.display).toBe('none');
        expect(event.defaultPrevented).toBe(false);
    });

    it('マウスが乗っている間だけ表示する', () => {
        const { getByTestId } = render(<Panel id="a" />);
        fireEvent.mouseOver(getByTestId('a-toggle'));
        expect(getByTestId('a-panel').style.display).toBe('block');
        fireEvent.mouseOut(getByTestId('a-container'));
        expect(getByTestId('a-panel').style.display).toBe('none');
    });
});

describe('bindTouchPanelToggle', () => {
    it('touchstart を passive:false で登録し、解除できる', () => {
        const toggle = document.createElement('div');
        const panel = document.createElement('div');
        const add = vi.spyOn(toggle, 'addEventListener');
        const remove = vi.spyOn(toggle, 'removeEventListener');
        const unbind = bindTouchPanelToggle(toggle, panel, { isOpen: () => false, setOpen: vi.fn() });
        expect(add).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
        unbind();
        expect(remove).toHaveBeenCalledWith('touchstart', add.mock.calls[0][1]);
    });
});
