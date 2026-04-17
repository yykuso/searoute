import { setupOutsideClickListener } from './utils/outsideClickHandler.js';

// キャッシュ用の要素参照
const menu = document.getElementById('context-menu');
const copyBtn = document.getElementById('context-copy-btn');
const gmapBtn = document.getElementById('context-gmap-btn');

// アウトサイドクリック用のアンサブスクライバー
let outsideClickUnsubscriber = null;

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
    if (rect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    // 外側クリック検出を登録
    if (outsideClickUnsubscriber) {
        outsideClickUnsubscriber();
    }
    outsideClickUnsubscriber = setupOutsideClickListener(menu, hideContextMenu, { delay: 50 });
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
            navigator.clipboard.writeText(`${lat.toFixed(5)},${lng.toFixed(5)}`)
                .then(() => alert('座標がコピーされました'))
                .catch(() => alert('座標のコピーに失敗しました'));
        }
        hideContextMenu();
    };

    // Googleマップボタンの設定
    gmapBtn.onclick = (e) => {
        e.stopPropagation();
        if (lat != null && lng != null) {
            const url = `https://www.google.com/maps?q=${lat},${lng}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        hideContextMenu();
    };
}
