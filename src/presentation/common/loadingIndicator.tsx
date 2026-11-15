/**
 * ローディング表示（LoadingPort の実装）
 * 並行処理がすべて終わるまで #loading を表示し続ける
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { LoadingPort } from '../../application/ports';

export interface LoadingIndicatorStore extends LoadingPort {
    isVisible(): boolean;
    subscribe(listener: () => void): () => void;
}

export function createLoadingIndicator(): LoadingIndicatorStore {
    let activeCount = 0;
    const listeners = new Set<() => void>();

    function emit(): void {
        listeners.forEach((listener) => listener());
    }

    return {
        show() {
            activeCount++;
            emit();
        },
        hide() {
            activeCount = Math.max(0, activeCount - 1);
            emit();
        },
        isVisible: () => activeCount > 0,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}

export function LoadingIndicator({ store }: { store: LoadingIndicatorStore }) {
    const getSnapshot = useCallback(() => store.isVisible(), [store]);
    const visible = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
    return <div id="loading" style={{ display: visible ? 'block' : 'none' }}></div>;
}
