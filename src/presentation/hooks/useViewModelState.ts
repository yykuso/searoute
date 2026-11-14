import { useCallback, useRef, useSyncExternalStore } from 'react';

/** subscribe 時に現在値を即時通知する ViewModel（application 層の各 ViewModel が該当） */
export interface SubscribableViewModel<S> {
    getState(): S;
    subscribe(listener: (state: S) => void): () => unknown;
}

/**
 * フレームワーク非依存の ViewModel を React から購読する
 * getState() は毎回新しいスナップショットを返すため、通知されたスナップショットをキャッシュして返す
 */
export function useViewModelState<S>(viewModel: SubscribableViewModel<S>): S {
    const cache = useRef<{ viewModel: SubscribableViewModel<S>; state: S } | null>(null);

    const subscribe = useCallback((onStoreChange: () => void) => {
        const unsubscribe = viewModel.subscribe((state) => {
            cache.current = { viewModel, state };
            onStoreChange();
        });
        return () => { unsubscribe(); };
    }, [viewModel]);

    const getSnapshot = useCallback((): S => {
        if (!cache.current || cache.current.viewModel !== viewModel) {
            cache.current = { viewModel, state: viewModel.getState() };
        }
        return cache.current.state;
    }, [viewModel]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
