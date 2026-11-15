// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextMenu } from '../../../src/presentation/map/ContextMenu';
import type { ContextMenuRequest } from '../../../src/presentation/map/ContextMenu';

afterEach(cleanup);

function renderMenu(request: ContextMenuRequest | null, overrides: Record<string, unknown> = {}) {
    const unsubscribe = vi.fn();
    const props = {
        request,
        onClose: vi.fn(),
        windowRef: { innerWidth: 1024, innerHeight: 768, open: vi.fn() } as unknown as Window,
        clipboard: { writeText: vi.fn(() => Promise.resolve()) },
        notify: vi.fn(),
        setupOutsideClick: vi.fn(() => unsubscribe),
        ...overrides,
    };
    const view = render(<ContextMenu {...props} />);
    return { ...view, props, unsubscribe };
}

describe('ContextMenu', () => {
    it('非表示のときは display:none で描画する', () => {
        renderMenu(null);
        expect(document.getElementById('context-menu')?.style.display).toBe('none');
        expect(screen.getByRole('button', { name: '座標', hidden: true })).toBeTruthy();
    });

    it('クリック位置に表示して座標をコピーし、完了を通知して閉じる', async () => {
        const { props } = renderMenu({ x: 20, y: 30, lat: 35, lng: 136 });
        const menu = document.getElementById('context-menu') as HTMLElement;

        expect(menu.style).toMatchObject({ left: '20px', top: '30px', display: 'block', position: 'fixed' });
        const copyButton = document.getElementById('context-copy-btn') as HTMLElement;
        expect(copyButton.textContent).toBe('35.00000,136.00000');
        expect(props.setupOutsideClick).toHaveBeenCalledWith(menu, props.onClose, { delay: 50 });

        fireEvent.click(copyButton);
        await vi.waitFor(() => {
            expect(props.clipboard.writeText).toHaveBeenCalledWith('35.00000,136.00000');
            expect(props.notify).toHaveBeenCalledWith('座標をコピーしました');
        });
        expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('コピー失敗時は失敗を通知する', async () => {
        const { props } = renderMenu({ x: 0, y: 0, lat: 1, lng: 2 }, {
            clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
        });
        fireEvent.click(document.getElementById('context-copy-btn') as HTMLElement);
        await vi.waitFor(() => expect(props.notify).toHaveBeenCalledWith('座標のコピーに失敗しました'));
    });

    it('Googleマップを新しいタブで開く', () => {
        const { props } = renderMenu({ x: 0, y: 0, lat: 35.1, lng: 136.2 });
        fireEvent.click(screen.getByRole('button', { name: 'Googleマップで開く' }));
        expect((props.windowRef as unknown as { open: ReturnType<typeof vi.fn> }).open)
            .toHaveBeenCalledWith('https://www.google.com/maps?q=35.1,136.2', '_blank', 'noopener,noreferrer');
        expect(props.onClose).toHaveBeenCalledOnce();
    });

    it('画面外にはみ出す場合は内側へ補正する', () => {
        const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            width: 80, height: 40, top: 0, left: 0, right: 80, bottom: 40, x: 0, y: 0, toJSON: () => ({}),
        });
        renderMenu({ x: 1000, y: 760, lat: 1, lng: 2 });
        const menu = document.getElementById('context-menu') as HTMLElement;
        expect(menu.style.left).toBe(`${1024 - 80 - 8}px`);
        expect(menu.style.top).toBe(`${768 - 40 - 8}px`);
        rectSpy.mockRestore();
    });

    it('閉じると外側クリック検出を解除する', () => {
        const { rerender, props, unsubscribe } = renderMenu({ x: 0, y: 0, lat: 1, lng: 2 });
        act(() => rerender(<ContextMenu {...props} request={null} />));
        expect(unsubscribe).toHaveBeenCalledOnce();
        expect(document.getElementById('context-menu')?.style.display).toBe('none');
    });
});
