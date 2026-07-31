import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    disposeDetailDrawer,
    initDetailDrawer,
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
    return { addEventListener: vi.fn(), removeEventListener: vi.fn(), innerWidth: 1024 };
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
});
