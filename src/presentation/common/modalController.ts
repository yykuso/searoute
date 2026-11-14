/**
 * モーダル（サイト情報・プライバシーポリシー）の開閉状態
 * - 開いた要素（トリガー）を記録し、閉じたらフォーカスを戻す
 * - 閉じたことを購読できる（旧 modalclose イベント相当）
 */
export type ModalId = 'info' | 'privacy';

export interface ModalState {
    open: boolean;
    /** 開くたびに増える（スクロール位置・フォーカスの再適用に使う） */
    version: number;
    focusCloseButton: boolean;
}

export interface OpenModalOptions {
    trigger?: HTMLElement | null;
    focusCloseButton?: boolean;
}

export interface CloseModalOptions {
    restoreFocus?: boolean;
}

export interface ModalController {
    open(id: ModalId, options?: OpenModalOptions): void;
    close(id: ModalId, options?: CloseModalOptions): void;
    isOpen(id: ModalId): boolean;
    getState(id: ModalId): ModalState;
    subscribe(listener: () => void): () => void;
    onClose(id: ModalId, listener: () => void): () => void;
}

const INITIAL_STATE: ModalState = { open: false, version: 0, focusCloseButton: false };

export function createModalController({ documentRef = globalThis.document }: { documentRef?: Document } = {}): ModalController {
    const states: Record<ModalId, ModalState> = { info: INITIAL_STATE, privacy: INITIAL_STATE };
    const triggers = new Map<ModalId, Element | null>();
    const listeners = new Set<() => void>();
    const closeListeners: Record<ModalId, Set<() => void>> = { info: new Set(), privacy: new Set() };

    function emit(): void {
        listeners.forEach((listener) => listener());
    }

    return {
        open(id, { trigger = null, focusCloseButton = false } = {}) {
            triggers.set(id, trigger || documentRef?.activeElement || null);
            states[id] = { open: true, version: states[id].version + 1, focusCloseButton };
            emit();
        },
        close(id, { restoreFocus = true } = {}) {
            states[id] = { ...states[id], open: false };
            emit();
            closeListeners[id].forEach((listener) => listener());
            const trigger = triggers.get(id) as HTMLElement | null | undefined;
            if (restoreFocus && trigger?.offsetParent !== null && typeof trigger?.focus === 'function') {
                trigger.focus();
            }
        },
        isOpen: (id) => states[id].open,
        getState: (id) => states[id],
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        onClose(id, listener) {
            closeListeners[id].add(listener);
            return () => { closeListeners[id].delete(listener); };
        },
    };
}
