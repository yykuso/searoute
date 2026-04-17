/**
 * ドロワーのシェア機能
 * - 現在表示中のドロワーコンテキストを保持
 * - シェアボタンクリック時にURLクエリをクリップボードにコピー
 * - ページ読み込み時にURLクエリからドロワーを復元
 */

// 現在のドロワーコンテキスト
let currentDrawerContext = null;

const SHARE_CONTEXT_CONFIG = {
    route: {
        buildParams: (context) => ({
            routeId: context.routeId,
            sourceId: context.sourceId,
        }),
        parseParams: (params) => {
            const routeId = params.get('routeId');
            const sourceId = params.get('sourceId');
            return routeId && sourceId ? { routeId, sourceId } : null;
        },
        getLayerId: (context) => context.sourceId,
    },
    port: {
        buildParams: (context) => ({
            lat: context.lat,
            lng: context.lng,
            name: context.name,
        }),
        parseParams: (params) => {
            const lat = parseFloat(params.get('lat'));
            const lng = parseFloat(params.get('lng'));
            const name = params.get('name');
            return !isNaN(lat) && !isNaN(lng) && name ? { lat, lng, name } : null;
        },
        getLayerId: () => 'geojson_port',
    },
    coord: {
        buildParams: (context) => ({
            lat: context.lat,
            lng: context.lng,
        }),
        parseParams: (params) => {
            const lat = parseFloat(params.get('lat'));
            const lng = parseFloat(params.get('lng'));
            return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
        },
        getLayerId: () => 'geojson_port',
    },
};

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

    const config = SHARE_CONTEXT_CONFIG[share];
    if (!config) {
        return null;
    }

    const parsed = config.parseParams(params);
    return parsed ? { type: share, ...parsed } : null;
}

/**
 * 共有対象コンテキストから URL を構築する
 * @param {Object} context
 * @returns {URL}
 */
function buildShareUrl(context) {
    const config = SHARE_CONTEXT_CONFIG[context.type];
    const url = new URL(location.href);
    url.search = '';

    if (!config) {
        return url;
    }

    url.searchParams.set('share', context.type);
    const queryParams = config.buildParams(context);
    Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    return url;
}

/**
 * 共有コンテキストが必要とするレイヤー ID を返す
 * @param {Object|null} context
 * @returns {string|null}
 */
export function getShareTargetLayerId(context) {
    if (!context) {
        return null;
    }

    const config = SHARE_CONTEXT_CONFIG[context.type];
    return config?.getLayerId?.(context) ?? null;
}

/**
 * ドロワーのシェアURLを生成してクリップボードにコピーする
 */
export async function copyShareUrl() {
    if (!currentDrawerContext) return;

    const url = buildShareUrl(currentDrawerContext);

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

    const handler = handlers?.[shareContext.type];
    if (handler) {
        const { type, ...payload } = shareContext;
        await handler(...Object.values(payload));
    }

    // 復元完了後にURLクエリを削除
    history.replaceState(null, '', location.pathname);
}
