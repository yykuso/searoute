import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    disposeContextMenu,
    hideContextMenu,
    initContextMenu,
    showContextMenu,
} from '../../js/presentation/map/contextMenuView.js';

function createElement(rect = {}) {
    return {
        style: {},
        getBoundingClientRect: () => ({
            right: 100,
            bottom: 100,
            width: 80,
            height: 40,
            ...rect,
        }),
    };
}

describe('contextMenu', () => {
    afterEach(() => disposeContextMenu());

    it('明示初期化後にメニューを表示して外側クリックを解除する', () => {
        const menu = createElement();
        const copyButton = createElement();
        const googleMapsButton = createElement();
        const elements = {
            'context-menu': menu,
            'context-copy-btn': copyButton,
            'context-gmap-btn': googleMapsButton,
        };
        const unsubscribe = vi.fn();
        const setupOutsideClick = vi.fn(() => unsubscribe);

        expect(initContextMenu({
            documentRef: { getElementById: id => elements[id] },
            windowImpl: { innerWidth: 1024, innerHeight: 768, open: vi.fn() },
            navigatorImpl: { clipboard: { writeText: vi.fn() } },
            alertImpl: vi.fn(),
            setupOutsideClick,
        })).toBe(true);

        showContextMenu(20, 30, { unproject: () => ({ lat: 35, lng: 136 }) });
        expect(menu.style).toMatchObject({ left: '20px', top: '30px', display: 'block' });
        expect(copyButton.textContent).toBe('35.00000,136.00000');
        expect(setupOutsideClick).toHaveBeenCalledWith(menu, hideContextMenu, { delay: 50 });

        hideContextMenu();
        expect(menu.style.display).toBe('none');
        expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it('必要な要素がなければ初期化に失敗する', () => {
        expect(initContextMenu({
            documentRef: { getElementById: () => null },
            windowImpl: {},
            navigatorImpl: {},
            alertImpl: vi.fn(),
        })).toBe(false);
        expect(showContextMenu(0, 0, null)).toBeUndefined();
    });
});