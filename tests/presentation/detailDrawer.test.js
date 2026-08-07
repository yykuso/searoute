import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    disposeDetailDrawer,
    hideDetailDrawer,
    initDetailDrawer,
    showDetailDrawer,
} from '../../js/presentation/map/detailDrawerView.js';

function createElement() {
    return {
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) },
        style: {},
        dataset: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        contains: vi.fn(() => false),
    };
}

function createWindowStub() {
    return {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        requestAnimationFrame: vi.fn((callback) => callback()),
        innerWidth: 1024,
    };
}

describe('detailDrawerの初期化・破棄ライフサイクル', () => {
    afterEach(() => disposeDetailDrawer());

    it('必須要素が揃っていれば一度だけ初期化される', () => {
        const elements = {
            'detail-drawer': createElement(),
            'detail-drawer-content': createElement(),
            'detail-drawer-title': createElement(),
            'detail-drawer-close-btn': createElement(),
            'detail-drawer-share-btn': createElement(),
            'sidebar-grip': createElement(),
        };
        const documentRef = { getElementById: (id) => elements[id] };
        const windowRef = createWindowStub();

        expect(initDetailDrawer({ documentRef, windowRef })).toBe(true);
        expect(initDetailDrawer({ documentRef, windowRef })).toBe(false);
        expect(elements['detail-drawer-close-btn'].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        expect(elements['detail-drawer'].addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
        expect(elements['sidebar-grip'].addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
        expect(windowRef.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    it('detail-drawer要素がなければ初期化しない', () => {
        const documentRef = { getElementById: () => null };

        expect(initDetailDrawer({ documentRef, windowRef: createWindowStub() })).toBe(false);
    });

    it('破棄後に再初期化できる', () => {
        const elements = {
            'detail-drawer': createElement(),
            'detail-drawer-content': createElement(),
            'detail-drawer-title': createElement(),
            'detail-drawer-close-btn': createElement(),
            'detail-drawer-share-btn': createElement(),
            'sidebar-grip': createElement(),
        };
        const documentRef = { getElementById: (id) => elements[id] };
        const windowRef = createWindowStub();

        expect(initDetailDrawer({ documentRef, windowRef })).toBe(true);
        expect(disposeDetailDrawer()).toBe(true);
        expect(elements['detail-drawer-close-btn'].removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        expect(windowRef.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
        expect(initDetailDrawer({ documentRef, windowRef })).toBe(true);
    });

    it('PCで再表示すると閉位置を描画してから開き、古い非表示タイマーを取り消す', () => {
        vi.useFakeTimers();
        const classes = new Set(['hidden', 'md:-translate-x-full']);
        const drawer = createElement();
        drawer.classList = {
            add: vi.fn((...names) => names.forEach((name) => classes.add(name))),
            remove: vi.fn((...names) => names.forEach((name) => classes.delete(name))),
            contains: vi.fn((name) => classes.has(name)),
        };
        drawer.getBoundingClientRect = vi.fn(() => ({}));
        const content = createElement();
        content.querySelectorAll = vi.fn(() => []);
        const elements = {
            'detail-drawer': drawer,
            'detail-drawer-content': content,
            'detail-drawer-title': createElement(),
            'detail-drawer-close-btn': createElement(),
            'detail-drawer-share-btn': createElement(),
            'sidebar-grip': createElement(),
        };
        const documentRef = { getElementById: (id) => elements[id] };
        const animationFrames = [];
        const windowRef = createWindowStub();
        windowRef.requestAnimationFrame = vi.fn((callback) => animationFrames.push(callback));

        initDetailDrawer({ documentRef, windowRef });
        showDetailDrawer('content');

        expect(classes.has('hidden')).toBe(false);
        expect(classes.has('md:-translate-x-full')).toBe(true);
        expect(drawer.getBoundingClientRect).toHaveBeenCalledOnce();
        animationFrames.shift()();
        expect(classes.has('md:-translate-x-full')).toBe(false);

        hideDetailDrawer();
        showDetailDrawer('content');
        animationFrames.shift()();
        vi.advanceTimersByTime(300);

        expect(classes.has('hidden')).toBe(false);
        vi.useRealTimers();
    });

    it('表示中の画面幅変更でPC・モバイル用レイアウトを切り替える', () => {
        const classes = new Set(['max-h-[30vh]']);
        const drawer = createElement();
        drawer.classList = {
            add: vi.fn((...names) => names.forEach((name) => classes.add(name))),
            remove: vi.fn((...names) => names.forEach((name) => classes.delete(name))),
            contains: vi.fn((name) => classes.has(name)),
        };
        Object.assign(drawer.style, {
            transition: 'max-height 0.3s, height 0.3s, padding 0.3s',
            maxHeight: '30dvh',
            height: '30dvh',
            padding: '0',
            overflowY: 'hidden',
        });
        const content = createElement();
        Object.assign(content.style, {
            overflowY: 'hidden',
            maxHeight: '100%',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0',
            paddingBottom: '0.5rem',
        });
        const elements = {
            'detail-drawer': drawer,
            'detail-drawer-content': content,
            'detail-drawer-title': createElement(),
            'detail-drawer-close-btn': createElement(),
            'detail-drawer-share-btn': createElement(),
            'sidebar-grip': createElement(),
        };
        const documentRef = { getElementById: (id) => elements[id] };
        const windowRef = createWindowStub();

        initDetailDrawer({ documentRef, windowRef });
        const resizeHandler = windowRef.addEventListener.mock.calls.find(([eventName]) => eventName === 'resize')[1];
        resizeHandler();

        expect(classes.has('max-h-[30vh]')).toBe(false);
        expect(drawer.style).toMatchObject({
            transition: '',
            maxHeight: '',
            height: '',
            padding: '',
            overflowY: '',
        });
        expect(content.style.paddingLeft).toBe('');

        windowRef.innerWidth = 767;
        resizeHandler();

        expect(classes.has('max-h-[30vh]')).toBe(true);
        expect(drawer.style.maxHeight).toContain('30dvh');
        expect(drawer.style.height).toContain('30dvh');
        expect(drawer.style.padding).toBe('0');
        expect(content.style.paddingLeft).toBe('1rem');
        expect(content.style.paddingBottom).toBe('0.5rem');
    });
});
