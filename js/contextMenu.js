// contextMenu.js
// コンテキストメニューの表示・非表示・内容更新・イベントバインドを担当

export function showContextMenu(x, y, map) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    // 座標取得
    let lat = null, lng = null;
    if (map && typeof map.unproject === 'function') {
        const point = map.unproject([x, y]);
        lat = point.lat;
        lng = point.lng;
    }
    // 位置・内容を更新
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
    // ボタンテキスト更新
    const copyBtn = document.getElementById('context-copy-btn');
    copyBtn.textContent = (lat && lng) ? `${lat.toFixed(5)},${lng.toFixed(5)}` : '座標';
    copyBtn.style.whiteSpace = 'nowrap';
    // 既存イベントを一旦解除
    copyBtn.replaceWith(copyBtn.cloneNode(true));
    const newCopyBtn = document.getElementById('context-copy-btn');
    newCopyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (lat && lng) {
            navigator.clipboard.writeText(`${lat.toFixed(5)},${lng.toFixed(5)}`)
                .then(() => alert('座標がコピーされました'))
                .catch(() => {
                    alert('座標のコピーに失敗しました');
                });
        }
        hideContextMenu();
    });
    // Googleマップボタン
    const gmapBtn = document.getElementById('context-gmap-btn');
    gmapBtn.replaceWith(gmapBtn.cloneNode(true));
    const newGmapBtn = document.getElementById('context-gmap-btn');
    newGmapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (lat != null && lng != null) {
            const url = `https://www.google.com/maps?q=${lat},${lng}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        hideContextMenu();
    });
    // 画面外に出ないように調整
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    // 外側クリック・タップで閉じる
    setTimeout(() => {
        function outsideClickHandler(e) {
            const menuEl = document.getElementById('context-menu');
            if (!menuEl) return;
            if (!menuEl.contains(e.target)) {
                hideContextMenu();
                document.removeEventListener('mousedown', outsideClickHandler);
                document.removeEventListener('touchstart', outsideClickHandler);
            }
        }
        document.addEventListener('mousedown', outsideClickHandler);
        document.addEventListener('touchstart', outsideClickHandler);
    }, 0);
}

export function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) menu.style.display = 'none';
}
