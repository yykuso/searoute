import { createContext, useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ModalController, ModalId, ModalState } from './modalController';

const ModalContext = createContext<ModalController | null>(null);

export function ModalProvider({ controller, children }: { controller: ModalController; children: ReactNode }) {
    return <ModalContext.Provider value={controller}>{children}</ModalContext.Provider>;
}

export function useModalController(): ModalController {
    const controller = useContext(ModalContext);
    if (!controller) {
        throw new Error('ModalProvider が見つかりません');
    }
    return controller;
}

export function useModalState(id: ModalId): ModalState {
    const controller = useModalController();
    const getSnapshot = useCallback(() => controller.getState(id), [controller, id]);
    return useSyncExternalStore(controller.subscribe, getSnapshot, getSnapshot);
}

/**
 * モーダル要素の表示に合わせてスクロール位置を先頭へ戻し、必要なら閉じるボタンへフォーカスする
 */
export function useModalElement(id: ModalId): { state: ModalState; ref: RefObject<HTMLDivElement | null> } {
    const state = useModalState(id);
    const ref = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!state.open || !element) return;
        element.scrollTop = 0;
        if (state.focusCloseButton) {
            element.querySelector<HTMLElement>('.modal-close-btn')?.focus();
        }
    }, [state.open, state.version, state.focusCloseButton]);

    return { state, ref };
}
