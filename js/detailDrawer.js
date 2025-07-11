// detailDrawer.js
// Detail Drawer（詳細ドロワー）制御モジュール

// --- DOM要素取得 ---
export const detailDrawer = document.getElementById('detail-drawer');
export const detailDrawerContent = document.getElementById('detail-drawer-content');
export const detailDrawerTitle = document.getElementById('detail-drawer-title');
export const detailDrawerCloseBtn = document.getElementById('detail-drawer-close-btn');

// --- スナップポイント定数 ---
export const SIDEBAR_SNAP = {
    minHeight: 72,      // タイトルのみ（px）
    midRatio: 0.3,      // 30%スナップ
    maxRatio: 0.8,      // 80%スナップ
    midThreshold: 0.18, // 30%スナップにする閾値
    maxThreshold: 0.55, // 80%スナップにする閾値
};

// --- ドロワー表示 ---
export function showDetailDrawer(html, title = '詳細情報', subtitle = '') {
    detailDrawerContent.innerHTML = html;
    detailDrawerContent.scrollTop = 0;
    if (subtitle) {
        detailDrawerTitle.innerHTML = `<div><span>${title}</span><span class="block text-xs text-slate-500 font-normal leading-tight mt-0.5">${subtitle}</span></div>`;
    } else {
        detailDrawerTitle.textContent = title;
    }
    if (window.innerWidth >= 768) {
        // PC表示
        detailDrawer.classList.remove('md:-translate-x-full', 'hidden', 'translate-y-full');
        detailDrawer.style.padding = '';
        detailDrawer.style.pointerEvents = 'auto';
        detailDrawer.style.zIndex = 1000;
        detailDrawer.getBoundingClientRect();
    } else {
        // モバイル表示
        detailDrawer.classList.remove('translate-y-full', 'hidden');
        detailDrawer.style.transition = 'max-height 0.3s, height 0.3s, padding 0.3s';
        detailDrawer.style.maxHeight = '0px';
        detailDrawer.style.height = '0px';
        detailDrawer.style.padding = '0px';
        detailDrawer.style.zIndex = 1000;
        detailDrawer.getBoundingClientRect();
        requestAnimationFrame(() => {
            detailDrawer.classList.add('max-h-[30vh]');
            detailDrawer.classList.remove('max-h-1/2');
            detailDrawer.style.maxHeight = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
            detailDrawer.style.height = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
            detailDrawer.style.overflowY = 'hidden';
            detailDrawer.style.padding = '0';
            detailDrawer.style.pointerEvents = 'auto';
            if (detailDrawerContent) {
                detailDrawerContent.style.overflowY = 'hidden';
                detailDrawerContent.style.maxHeight = '100%';
                detailDrawerContent.style.paddingLeft = '1rem';
                detailDrawerContent.style.paddingRight = '1rem';
                detailDrawerContent.style.paddingTop = '0';
                detailDrawerContent.style.paddingBottom = '0.5rem';
            }
        });
    }
}

// --- ドロワー非表示 ---
export function hideDetailDrawer() {
    if (window.innerWidth >= 768) {
        detailDrawer.classList.add('md:-translate-x-full');
        setTimeout(() => detailDrawer.classList.add('hidden'), 300);
        detailDrawer.style.padding = '';
    } else {
        detailDrawer.style.transition = 'max-height 0.3s, height 0.3s, padding 0.3s';
        detailDrawer.style.maxHeight = '0px';
        detailDrawer.style.height = '0px';
        detailDrawer.style.padding = '0px';
        setTimeout(() => {
            detailDrawer.classList.add('hidden');
            detailDrawer.style.padding = '1rem';
        }, 300);
    }
    // --- Drawerを閉じたらピンも消す ---
    if (window.removeLongPressMarker) window.removeLongPressMarker();
    // --- Drawerを閉じたらハイライトも消す ---
    if (window.removeRouteHighlight) window.removeRouteHighlight();
}

// --- ドロワー最小化（タイトルのみ） ---
export function minimizeDetailDrawer() {
    detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
    detailDrawer.style.transition = 'max-height 0.3s, height 0.3s';
    detailDrawer.style.maxHeight = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;
    detailDrawer.style.height = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;
    detailDrawer.style.overflowY = 'hidden';
    if (detailDrawerContent) {
        detailDrawerContent.style.overflowY = 'hidden';
        detailDrawerContent.style.maxHeight = '100%';
    }
}

// --- 高さ制御 ---
export function setDetailDrawerHeight(px) {
    detailDrawer.style.maxHeight = px + 'px';
    detailDrawer.style.height = px + 'px';
}
export function resetDetailDrawerHeight() {
    detailDrawer.style.maxHeight = '';
    detailDrawer.style.height = '';
}

// --- イベントリスナー登録 ---
if (detailDrawerCloseBtn) {
    detailDrawerCloseBtn.addEventListener('click', hideDetailDrawer);
}

// --- 外側クリック・リサイズ対応 ---
window.addEventListener('mousedown', (e) => {
    if (!detailDrawer.classList.contains('hidden') && !detailDrawer.contains(e.target)) {
        if (window.innerWidth < 768) minimizeDetailDrawer();
    }
});
window.addEventListener('touchstart', (e) => {
    if (!detailDrawer.classList.contains('hidden') && !detailDrawer.contains(e.target)) {
        if (window.innerWidth < 768) minimizeDetailDrawer();
    }
}, { passive: true });
window.addEventListener('resize', () => {
    if (!detailDrawer.classList.contains('hidden')) {
        if (window.innerWidth >= 768) {
            detailDrawer.classList.remove('translate-y-full');
        } else {
            detailDrawer.classList.remove('md:-translate-x-full');
        }
    }
});

// --- ドラッグ・スワイプ用変数 ---
let startY = 0;
let startHeight = 0;
let isDragging = false;
let isMaybeDragFromScrollTop = false;

// --- タッチ操作によるドラッグ・スナップ ---
detailDrawer.addEventListener('touchstart', (e) => {
    if (window.innerWidth >= 768) return;
    if (e.touches.length !== 1) return;
    const vh = window.innerHeight;
    const h = detailDrawer.offsetHeight;
    const detailDrawerContent = document.getElementById('detail-drawer-content');
    const isAtMax = Math.abs(h - SIDEBAR_SNAP.maxRatio * vh) < 16;
    if (
        isAtMax &&
        detailDrawerContent && (e.target === detailDrawerContent || detailDrawerContent.contains(e.target))
    ) {
        // content上で80%スナップ時、スクロールが一番上なら上方向スワイプでドラッグ開始できる
        const scrollTop = detailDrawerContent.scrollTop;
        isMaybeDragFromScrollTop = (scrollTop <= 0);
        isDragging = false;
        startY = e.touches[0].clientY;
        startHeight = detailDrawer.offsetHeight;
        return;
    }
    // 通常のドラッグ開始
    isDragging = true;
    isMaybeDragFromScrollTop = false;
    startY = e.touches[0].clientY;
    startHeight = detailDrawer.offsetHeight;
    detailDrawer.style.transition = 'none';
    detailDrawer.style.overflowY = 'hidden';
    detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
    detailDrawer.style.pointerEvents = 'auto';
}, { passive: false });

detailDrawer.addEventListener('touchmove', (e) => {
    const vh = window.innerHeight;
    const h = detailDrawer.offsetHeight;
    const detailDrawerContent = document.getElementById('detail-drawer-content');
    const isAtMax = Math.abs(h - SIDEBAR_SNAP.maxRatio * vh) < 16;
    // content上で80%スナップ時、スクロールトップで下方向スワイプならドラッグ開始
    if (
        isAtMax &&
        detailDrawerContent && (e.target === detailDrawerContent || detailDrawerContent.contains(e.target))
    ) {
        const scrollTop = detailDrawerContent.scrollTop;
        const dy = e.touches[0].clientY - startY;
        if (!isDragging && isMaybeDragFromScrollTop && scrollTop <= 0 && dy > 8) {
            // 下方向スワイプでドラッグ開始
            isDragging = true;
            startY = e.touches[0].clientY;
            startHeight = detailDrawer.offsetHeight;
            detailDrawer.style.transition = 'none';
            detailDrawer.style.overflowY = 'hidden';
            detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
            detailDrawer.style.pointerEvents = 'auto';
        } else if (!isDragging) {
            // 通常のスクロール
            return;
        }
    }
    if (!isDragging) return;
    e.preventDefault();
    // セーフエリア下部を考慮
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
    let maxHeight = SIDEBAR_SNAP.maxRatio * window.innerHeight - safeBottom;
    const dy = startY - e.touches[0].clientY;
    let newHeight = Math.min(maxHeight, Math.max(SIDEBAR_SNAP.minHeight, startHeight + dy));
    setDetailDrawerHeight(newHeight);
}, { passive: false });

detailDrawer.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    detailDrawer.style.transition = 'max-height 0.3s, height 0.3s';
    const vh = window.innerHeight;
    const h = detailDrawer.offsetHeight;
    const detailDrawerContent = document.getElementById('detail-drawer-content');
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
    // スナップ位置判定
    if (h > vh * SIDEBAR_SNAP.maxThreshold) {
        // 80%スナップ
        detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
        const maxHeightPx = SIDEBAR_SNAP.maxRatio * vh - safeBottom;
        detailDrawer.style.maxHeight = maxHeightPx + 'px';
        detailDrawer.style.height = maxHeightPx + 'px';
        detailDrawer.style.overflowY = 'hidden';
        if (detailDrawerContent) {
            detailDrawerContent.style.overflowY = 'auto';
            detailDrawerContent.style.maxHeight = 'calc(100% - 56px - env(safe-area-inset-top) - env(safe-area-inset-bottom))';
        }
    } else if (h > vh * SIDEBAR_SNAP.midRatio) {
        // 30%スナップ
        detailDrawer.classList.add('max-h-[30vh]');
        detailDrawer.classList.remove('max-h-1/2');
        detailDrawer.style.maxHeight = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
        detailDrawer.style.height = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
        detailDrawer.style.overflowY = 'hidden';
        if (detailDrawerContent) {
            detailDrawerContent.style.overflowY = 'hidden';
            detailDrawerContent.style.maxHeight = '100%';
        }
    } else {
        // 最小化
        detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
        detailDrawer.style.maxHeight = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;
        detailDrawer.style.height = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;
        detailDrawer.style.overflowY = 'hidden';
        if (detailDrawerContent) {
            detailDrawerContent.style.overflowY = 'hidden';
            detailDrawerContent.style.maxHeight = '100%';
        }
    }
}, { passive: false });

// --- sidebar-grip（グリップ）でのドラッグ ---
const sidebarGrip = document.getElementById('sidebar-grip');
if (sidebarGrip) {
    // タッチ操作
    sidebarGrip.addEventListener('touchstart', gripDragStart, { passive: false });
    // マウス操作
    sidebarGrip.addEventListener('mousedown', gripDragStart, false);
}

let gripDragging = false;
let gripStartY = 0;
let gripStartHeight = 0;

function gripDragStart(e) {
    if (window.innerWidth >= 768) return;
    gripDragging = true;
    if (e.type === 'touchstart') {
        gripStartY = e.touches[0].clientY;
        document.addEventListener('touchmove', gripDragMove, { passive: false });
        document.addEventListener('touchend', gripDragEnd, { passive: false });
    } else {
        gripStartY = e.clientY;
        document.addEventListener('mousemove', gripDragMove, false);
        document.addEventListener('mouseup', gripDragEnd, false);
    }
    gripStartHeight = detailDrawer.offsetHeight;
    detailDrawer.style.transition = 'none';
    detailDrawer.style.overflowY = 'hidden';
    detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
    detailDrawer.style.pointerEvents = 'auto';
    e.preventDefault();
}

function gripDragMove(e) {
    if (!gripDragging) return;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // セーフエリア下部を考慮
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
    let maxHeight = SIDEBAR_SNAP.maxRatio * window.innerHeight - safeBottom;
    let dy = gripStartY - clientY;
    let newHeight = Math.min(maxHeight, Math.max(SIDEBAR_SNAP.minHeight, gripStartHeight + dy));
    setDetailDrawerHeight(newHeight);
    e.preventDefault();
}

function gripDragEnd(e) {
    if (!gripDragging) return;
    gripDragging = false;
    detailDrawer.style.transition = 'max-height 0.3s, height 0.3s';
    const vh = window.innerHeight;
    const h = detailDrawer.offsetHeight;
    const detailDrawerContent = document.getElementById('detail-drawer-content');
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
    // スナップ位置判定
    if (h > vh * SIDEBAR_SNAP.maxThreshold) {
        // 80%スナップ
        detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
        const maxHeightPx = SIDEBAR_SNAP.maxRatio * vh - safeBottom;
        detailDrawer.style.maxHeight = maxHeightPx + 'px';
        detailDrawer.style.height = maxHeightPx + 'px';
        detailDrawer.style.overflowY = 'hidden';
        if (detailDrawerContent) {
            detailDrawerContent.style.overflowY = 'auto';
            detailDrawerContent.style.maxHeight = 'calc(100% - 56px - env(safe-area-inset-top) - env(safe-area-inset-bottom))';
        }
    } else if (h > vh * SIDEBAR_SNAP.midRatio) {
        // 30%スナップ
        detailDrawer.classList.add('max-h-[30vh]');
        detailDrawer.classList.remove('max-h-1/2');
        detailDrawer.style.maxHeight = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
        detailDrawer.style.height = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
        detailDrawer.style.overflowY = 'hidden';
        if (detailDrawerContent) {
            detailDrawerContent.style.overflowY = 'hidden';
            detailDrawerContent.style.maxHeight = '100%';
        }
    } else {
        // 最小化
        detailDrawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
        detailDrawer.style.maxHeight = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;
        detailDrawer.style.height = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;
        detailDrawer.style.overflowY = 'hidden';
        if (detailDrawerContent) {
            detailDrawerContent.style.overflowY = 'hidden';
            detailDrawerContent.style.maxHeight = '100%';
        }
    }
    // イベント解除
    document.removeEventListener('mousemove', gripDragMove, false);
    document.removeEventListener('mouseup', gripDragEnd, false);
    document.removeEventListener('touchmove', gripDragMove, { passive: false });
    document.removeEventListener('touchend', gripDragEnd, { passive: false });
}
