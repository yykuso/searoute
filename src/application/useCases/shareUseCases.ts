/**
 * 共有URLのユースケース
 * - URLクエリからの共有コンテキスト取得・ドロワー復元
 * - 表示中ドロワーの共有URLコピー
 * - 共有対象レイヤーの事前有効化
 */
import { buildShareUrl, getShareTargetLayerId, parseShareContext } from '../../domain/shareContext';
import type { ShareContext, ShareType } from '../../domain/shareContext';
import type { ClipboardPort, LayerPort, NavigationPort } from '../ports';
import type { DrawerViewModel } from '../viewModels/drawerViewModel';

export { getShareTargetLayerId };

/** 共有種別ごとの復元ハンドラ（引数は共有パラメータを宣言順に展開したもの） */
export type ShareRestoreHandlers = Partial<Record<ShareType, (...args: never[]) => Promise<boolean | void> | boolean | void>>;

export function getShareQueryContext(navigation: Pick<NavigationPort, 'getSearch'>): ShareContext | null {
    return parseShareContext(navigation.getSearch());
}

/**
 * URLクエリパラメータを読み取り、対応するドロワーを自動表示する
 * 復元成功時のみURLクエリを削除する
 */
export async function restoreDrawerFromUrl(
    handlers: ShareRestoreHandlers | null | undefined,
    navigation: NavigationPort,
): Promise<void> {
    const shareContext = getShareQueryContext(navigation);
    if (!shareContext) return;

    const handlerMap = new Map<ShareType, (...args: unknown[]) => unknown>();
    for (const type of ['route', 'port', 'coord'] as const) {
        const handler = (handlers ?? {})[type];
        if (Object.hasOwn(handlers ?? {}, type) && typeof handler === 'function') {
            handlerMap.set(type, handler as (...args: unknown[]) => unknown);
        }
    }

    let restored = false;
    if (handlerMap.has(shareContext.type)) {
        const handler = handlerMap.get(shareContext.type);
        if (typeof handler === 'function') {
            const { type: _type, ...payload } = shareContext;
            const result = await handler(...Object.values(payload));
            restored = result !== false;
        }
    }

    if (restored) {
        navigation.replaceState(navigation.getPathname());
    }
}

/**
 * ドロワーのシェアURLを生成してクリップボードにコピーする
 * 失敗時は onFallback（従来は prompt）に URL を渡す
 */
export async function copyShareUrl({
    drawerViewModel,
    navigation,
    clipboard,
    onCopied,
    onFallback,
}: {
    drawerViewModel: Pick<DrawerViewModel, 'getState'>;
    navigation: Pick<NavigationPort, 'getHref'>;
    clipboard: ClipboardPort;
    onCopied: () => void;
    onFallback: (url: string) => void;
}): Promise<void> {
    const { context } = drawerViewModel.getState();
    if (!context) return;

    const url = buildShareUrl(context, navigation.getHref());

    try {
        await clipboard.writeText(url.toString());
        onCopied();
    } catch {
        onFallback(url.toString());
    }
}

/**
 * 共有 URL の対象レイヤーを事前に有効化する
 * onLayerEnabled でレイヤーコントロールのチェック状態を同期する
 */
export async function ensureSharedLayerEnabled({
    navigation,
    layers,
    onLayerEnabled,
}: {
    navigation: Pick<NavigationPort, 'getSearch'>;
    layers: Pick<LayerPort, 'addOverLayer' | 'isLayerActive'>;
    onLayerEnabled: (layerId: string) => void;
}): Promise<void> {
    const shareContext = getShareQueryContext(navigation);
    if (!shareContext) {
        return;
    }

    const targetLayerId = getShareTargetLayerId(shareContext);

    if (!targetLayerId) {
        return;
    }

    if (layers.isLayerActive(targetLayerId)) {
        onLayerEnabled(targetLayerId);
        return;
    }

    await layers.addOverLayer(targetLayerId);
    onLayerEnabled(targetLayerId);
}
