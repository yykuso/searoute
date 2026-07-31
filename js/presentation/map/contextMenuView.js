/**
 * 右クリックコンテキストメニューモジュール
 *
 * 責務:
 * - 地図上で右クリック時のメニュー表示
 * - 座標コピー・Google Maps リンク生成
 * - メニューの表示・非表示制御
 */

import { setupOutsideClickListener } from '../outsideClickHandler.js';

let menu = null;
let copyBtn = null;
let gmapBtn = null;
let windowRef = null;
let navigatorRef = null;
let alertFn = null;
let outsideClickSetup = setupOutsideClickListener;

// アウトサイドクリック用のアンサブスクライバー
let outsideClickUnsubscriber = null;

export function initContextMenu({
    documentRef = document,
    windowImpl = window,
    navigatorImpl = navigator,
    alertImpl = alert,
    setupOutsideClick = setupOutsideClickListener,
} = {}) {
    menu = documentRef.getElementById('context-menu');
    copyBtn = documentRef.getElementById('context-copy-btn');
    gmapBtn = documentRef.getElementById('context-gmap-btn');
    windowRef = windowImpl;
    navigatorRef = navigatorImpl;
    alertFn = alertImpl;
    outsideClickSetup = setupOutsideClick;
    return Boolean(menu && copyBtn && gmapBtn);
}

export function disposeContextMenu() {
    hideContextMenu();
    menu = null;
    copyBtn = null;
    gmapBtn = null;
    windowRef = null;
    navigatorRef = null;
    alertFn = null;
}

/**
 * コンテキストメニューを表示
 * @param {number} x - クリック X 座標
 * @param {number} y - クリック Y 座標
 * @param {Object} map - MapLibre GL map オブジェクト
 */
export function showContextMenu(x, y, map) {
    if (!menu) return;

    // 座標取得
    let lat = null, lng = null;
    if (map && typeof map.unproject === 'function') {
        const point = map.unproject([x, y]);
        lat = point.lat;
        lng = point.lng;
    }

    // メニュー位置を更新
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';

    // ボタンアクションを設定
    setupContextMenuActions(lat, lng);

    // 画面外に出ないように調整
    const rect = menu.getBoundingClientRect();
    if (rect.right > windowRef.innerWidth) {
        menu.style.left = (windowRef.innerWidth - rect.width - 8) + 'px';
    }
    if (rect.bottom > windowRef.innerHeight) {
        menu.style.top = (windowRef.innerHeight - rect.height - 8) + 'px';
    }

    // 外側クリック検出を登録
    if (outsideClickUnsubscriber) {
        outsideClickUnsubscriber();
    }
    outsideClickUnsubscriber = outsideClickSetup(menu, hideContextMenu, { delay: 50 });
}

/**
 * コンテキストメニューを非表示
 */
export function hideContextMenu() {
    if (menu) {
        menu.style.display = 'none';
    }
    if (outsideClickUnsubscriber) {
        outsideClickUnsubscriber();
        outsideClickUnsubscriber = null;
    }
}

/**
 * コンテキストメニューのアクションを設定
 */
function setupContextMenuActions(lat, lng) {
    // 座標コピーボタンの設定
    copyBtn.textContent = (lat && lng) ? `${lat.toFixed(5)},${lng.toFixed(5)}` : '座標';
    copyBtn.style.whiteSpace = 'nowrap';
    copyBtn.onclick = (e) => {
        e.stopPropagation();
        if (lat && lng) {
            navigatorRef.clipboard.writeText(`${lat.toFixed(5)},${lng.toFixed(5)}`)
                .then(() => alertFn('座標がコピーされました'))
                .catch(() => alertFn('座標のコピーに失敗しました'));
        }
        hideContextMenu();
    };

    // Googleマップボタンの設定
    gmapBtn.onclick = (e) => {
        e.stopPropagation();
        if (lat != null && lng != null) {
            const url = `https://www.google.com/maps?q=${lat},${lng}`;
            windowRef.open(url, '_blank', 'noopener,noreferrer');
        }
        hideContextMenu();
    };
}
