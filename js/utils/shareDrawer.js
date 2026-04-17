/**
 * ドロワーのシェア機能
 * - 現在表示中のドロワーコンテキストを保持
 * - シェアボタンクリック時にURLクエリをクリップボードにコピー
 * - ページ読み込み時にURLクエリからドロワーを復元
 */

// 現在のドロワーコンテキスト
let currentDrawerContext = null;

/**
 * ドロワーコンテキストを設定する
 * @param {Object} context
 *   route: { type: 'route', routeId, sourceId }
 *   port:  { type: 'port', lat, lng, name }
 *   coord: { type: 'coord', lat, lng }
 */
export function setDrawerContext(context) {
    currentDrawerContext = context;
}

/**
 * 現在の URL クエリから共有コンテキストを取得する
 * @returns {Object|null}
 */
export function getShareQueryContext() {
    const params = new URLSearchParams(location.search);
    const share = params.get('share');

    if (share === 'route') {
        const routeId = params.get('routeId');
        const sourceId = params.get('sourceId');
        if (routeId && sourceId) {
            return { type: 'route', routeId, sourceId };
        }
    }

    if (share === 'port') {
        const lat = parseFloat(params.get('lat'));
        const lng = parseFloat(params.get('lng'));
        const name = params.get('name');
        if (!isNaN(lat) && !isNaN(lng) && name) {
            return { type: 'port', lat, lng, name };
        }
    }

    if (share === 'coord') {
        const lat = parseFloat(params.get('lat'));
        const lng = parseFloat(params.get('lng'));
        if (!isNaN(lat) && !isNaN(lng)) {
            return { type: 'coord', lat, lng };
        }
    }

    return null;
}

/**
 * ドロワーのシェアURLを生成してクリップボードにコピーする
 */
export async function copyShareUrl() {
    if (!currentDrawerContext) return;

    const url = new URL(location.href);
    // 既存クエリをリセット
    url.search = '';

    const ctx = currentDrawerContext;
    if (ctx.type === 'route') {
        url.searchParams.set('share', 'route');
        url.searchParams.set('routeId', ctx.routeId);
        url.searchParams.set('sourceId', ctx.sourceId);
    } else if (ctx.type === 'port') {
        url.searchParams.set('share', 'port');
        url.searchParams.set('lat', ctx.lat);
        url.searchParams.set('lng', ctx.lng);
        url.searchParams.set('name', ctx.name);
    } else if (ctx.type === 'coord') {
        url.searchParams.set('share', 'coord');
        url.searchParams.set('lat', ctx.lat);
        url.searchParams.set('lng', ctx.lng);
    }

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
 * map の 'idle' イベント後に呼ぶこと
 * @param {Function} openRouteFn - (routeId, sourceId) を処理する関数
 * @param {Function} openPortFn  - (lat, lng, name) を処理する関数
 * @param {Function} openCoordFn - (lat, lng) を処理する関数
 */
export async function restoreDrawerFromUrl(openRouteFn, openPortFn, openCoordFn) {
    const shareContext = getShareQueryContext();
    if (!shareContext) return;

    if (shareContext.type === 'route') {
        const { routeId, sourceId } = shareContext;
        await openRouteFn(routeId, sourceId);
    } else if (shareContext.type === 'port') {
        const { lat, lng, name } = shareContext;
        await openPortFn(lat, lng, name);
    } else if (shareContext.type === 'coord') {
        const { lat, lng } = shareContext;
        if (openCoordFn) {
            await openCoordFn(lat, lng);
        }
    }

    // 復元完了後にURLクエリを削除
    history.replaceState(null, '', location.pathname);
}
