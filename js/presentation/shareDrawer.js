/**
 * ドロワーのシェア機能
 * - 現在表示中のドロワーコンテキストを保持
 * - シェアボタンクリック時にURLクエリをクリップボードにコピー
 * - ページ読み込み時にURLクエリからドロワーを復元
 */

import {
    buildShareUrl,
    getShareTargetLayerId,
    parseShareContext,
} from '../domain/shareContext.js';
import { drawerViewModel } from './drawerViewModel.js';

export { getShareTargetLayerId };

/**
 * ドロワーコンテキストを設定する
 * @param {Object} context
 *   route: { type: 'route', routeId, sourceId, lat?, lng?, zoom? }
 *   port:  { type: 'port', lat, lng, name }
 *   coord: { type: 'coord', lat, lng }
 */
export function setDrawerContext(context) {
    drawerViewModel.setContext(context);
}

export function getDrawerState() {
    return drawerViewModel.getState();
}

/**
 * 現在の URL クエリから共有コンテキストを取得する
 * @returns {Object|null}
 */
export function getShareQueryContext() {
    return parseShareContext(location.search);
}

/**
 * ドロワーのシェアURLを生成してクリップボードにコピーする
 */
export async function copyShareUrl() {
    const { context } = drawerViewModel.getState();
    if (!context) return;

    const url = buildShareUrl(context, location.href);

    try {
        await navigator.clipboard.writeText(url.toString());
        showCopyFeedback();
    } catch {
        // フォールバック
        prompt('以下のURLをコピーしてください', url.toString());
    }
}

/**
 * シェアボタンに一時的なフィードバックを表示
 */
function showCopyFeedback() {
    const btn = document.getElementById('detail-drawer-share-btn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-share-nodes');
            icon.classList.add('fa-check');
        }
        setTimeout(() => {
            if (icon) {
                icon.classList.remove('fa-check');
                icon.classList.add('fa-share-nodes');
            }
        }, 1500);
    }

    // トースト通知
    const toast = document.createElement('div');
    toast.textContent = 'URLをコピーしました';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-[9999] opacity-0 transition-opacity duration-300';
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * URLクエリパラメータを読み取り、対応するドロワーを自動表示する
 * @param {Object} handlers
 * @param {Function} handlers.route - (routeId, sourceId) を処理する関数
 * @param {Function} handlers.port - (lat, lng, name) を処理する関数
 * @param {Function} handlers.coord - (lat, lng) を処理する関数
 */
export async function restoreDrawerFromUrl(handlers) {
    const shareContext = getShareQueryContext();
    if (!shareContext) return;

    const handlerMap = new Map();
    for (const type of ['route', 'port', 'coord']) {
        if (Object.hasOwn(handlers ?? {}, type) && typeof handlers[type] === 'function') {
            handlerMap.set(type, handlers[type]);
        }
    }

    let restored = false;
    if (handlerMap.has(shareContext.type)) {
        const handler = handlerMap.get(shareContext.type);
        if (typeof handler === 'function') {
            const { type, ...payload } = shareContext;
            const result = await handler(...Object.values(payload));
            restored = result !== false;
        }
    }

    // 復元成功時のみURLクエリを削除
    if (restored) {
        history.replaceState(null, '', location.pathname);
    }
}
