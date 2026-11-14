/**
 * 詳細ドロワーの開閉アニメーション・スナップ・ドラッグ制御
 * - PC（幅768px以上）: 左からスライドイン
 * - モバイル: 下部シート。グリップ/本文のドラッグで 最小（タイトルのみ）/30%/80% にスナップ
 * DOM のクラス・インラインスタイルを直接操作する（React は殻のみ描画し、これらの属性は管理しない）
 */
import { executeDrawerCloseHandlers } from '../../application/viewModels/drawerViewModel';

export const SIDEBAR_SNAP = {
    minHeight: 72,      // タイトルのみ（px）
    midRatio: 0.3,      // 30%スナップ
    maxRatio: 0.8,      // 80%スナップ
    midThreshold: 0.18, // 30%スナップにする閾値
    maxThreshold: 0.55, // 80%スナップにする閾値
};

const DESKTOP_MIN_WIDTH = 768;
const MID_HEIGHT = `calc(${SIDEBAR_SNAP.midRatio * 100}dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;
const MIN_HEIGHT = `calc(${SIDEBAR_SNAP.minHeight}px + env(safe-area-inset-bottom))`;

type WindowLike = Pick<Window, 'innerWidth' | 'innerHeight' | 'addEventListener' | 'removeEventListener' | 'requestAnimationFrame'>;

export interface DetailDrawerElements {
    drawer: HTMLElement;
    content: HTMLElement | null;
    grip: HTMLElement | null;
}

export interface DetailDrawerController {
    show(): void;
    hide(): void;
    minimize(): void;
    dispose(): void;
}

export function createDetailDrawerController(
    { drawer, content, grip }: DetailDrawerElements,
    {
        windowRef = window,
        documentRef = document,
        getComputedStyleImpl = (element: Element) => getComputedStyle(element),
        onClose = executeDrawerCloseHandlers,
    }: {
        windowRef?: WindowLike;
        documentRef?: Document;
        getComputedStyleImpl?: (element: Element) => Pick<CSSStyleDeclaration, 'getPropertyValue'>;
        onClose?: () => void;
    } = {},
): DetailDrawerController {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    // 一度も表示していない初期状態は hidden クラスが無いため、表示中かどうかを別に持つ
    // （初回表示前の resize・タップで画面外のドロワーの寸法が変わり、共有URL復元時の fitBounds の余白が揺れるのを防ぐ）
    let shown = false;

    const isDesktop = () => windowRef.innerWidth >= DESKTOP_MIN_WIDTH;
    const isHidden = () => !shown || drawer.classList.contains('hidden');
    const getSafeBottom = () => parseInt(getComputedStyleImpl(documentRef.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
    const isAtMax = () => Math.abs(drawer.offsetHeight - SIDEBAR_SNAP.maxRatio * windowRef.innerHeight) < 16;
    const isInContent = (target: EventTarget | null) => Boolean(content && (target === content || content.contains(target as Node)));

    function setHeight(px: number): void {
        drawer.style.maxHeight = px + 'px';
        drawer.style.height = px + 'px';
    }

    function applyDesktopLayout(): void {
        drawer.classList.remove('translate-y-full', 'max-h-[30vh]', 'max-h-1/2');
        drawer.style.transition = '';
        drawer.style.maxHeight = '';
        drawer.style.height = '';
        drawer.style.padding = '';
        drawer.style.overflowY = '';

        if (content) {
            content.style.overflowY = '';
            content.style.maxHeight = '';
            content.style.paddingLeft = '';
            content.style.paddingRight = '';
            content.style.paddingTop = '';
            content.style.paddingBottom = '';
        }
    }

    function applyMobileLayout(): void {
        drawer.classList.remove('md:-translate-x-full', 'max-h-1/2');
        drawer.classList.add('max-h-[30vh]');
        drawer.style.transition = 'max-height 0.3s, height 0.3s, padding 0.3s';
        drawer.style.maxHeight = MID_HEIGHT;
        drawer.style.height = MID_HEIGHT;
        drawer.style.padding = '0';
        drawer.style.overflowY = 'hidden';

        if (content) {
            content.style.overflowY = 'hidden';
            content.style.maxHeight = '100%';
            content.style.paddingLeft = '1rem';
            content.style.paddingRight = '1rem';
            content.style.paddingTop = '0';
            content.style.paddingBottom = '0.5rem';
        }
    }

    function show(): void {
        shown = true;
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        if (content) content.scrollTop = 0;

        if (isDesktop()) {
            drawer.classList.remove('hidden');
            applyDesktopLayout();
            drawer.classList.add('md:-translate-x-full');
            drawer.style.pointerEvents = 'auto';
            drawer.style.zIndex = '1000';
            drawer.getBoundingClientRect();
            windowRef.requestAnimationFrame(() => {
                drawer.classList.remove('md:-translate-x-full');
            });
        } else {
            drawer.classList.remove('translate-y-full', 'hidden');
            drawer.style.transition = 'max-height 0.3s, height 0.3s, padding 0.3s';
            drawer.style.maxHeight = '0px';
            drawer.style.height = '0px';
            drawer.style.padding = '0px';
            drawer.style.zIndex = '1000';
            drawer.getBoundingClientRect();
            windowRef.requestAnimationFrame(() => {
                applyMobileLayout();
                drawer.style.pointerEvents = 'auto';
            });
        }
    }

    function hide(): void {
        shown = false;
        if (isDesktop()) {
            drawer.classList.add('md:-translate-x-full');
            hideTimer = setTimeout(() => {
                drawer.classList.add('hidden');
                hideTimer = null;
            }, 300);
            drawer.style.padding = '';
        } else {
            drawer.style.transition = 'max-height 0.3s, height 0.3s, padding 0.3s';
            drawer.style.maxHeight = '0px';
            drawer.style.height = '0px';
            drawer.style.padding = '0px';
            hideTimer = setTimeout(() => {
                drawer.classList.add('hidden');
                drawer.style.padding = '1rem';
                hideTimer = null;
            }, 300);
        }
        onClose();
    }

    function minimize(): void {
        drawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
        drawer.style.transition = 'max-height 0.3s, height 0.3s';
        drawer.style.maxHeight = MIN_HEIGHT;
        drawer.style.height = MIN_HEIGHT;
        drawer.style.overflowY = 'hidden';
        if (content) {
            content.style.overflowY = 'hidden';
            content.style.maxHeight = '100%';
        }
    }

    function beginDrag(): void {
        drawer.style.transition = 'none';
        drawer.style.overflowY = 'hidden';
        drawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
        drawer.style.pointerEvents = 'auto';
    }

    function dragTo(startY: number, startHeight: number, clientY: number): void {
        // セーフエリア下部を考慮
        const maxHeight = SIDEBAR_SNAP.maxRatio * windowRef.innerHeight - getSafeBottom();
        const dy = startY - clientY;
        setHeight(Math.min(maxHeight, Math.max(SIDEBAR_SNAP.minHeight, startHeight + dy)));
    }

    /** ドラッグ終了時のスナップ位置判定 */
    function snap(): void {
        drawer.style.transition = 'max-height 0.3s, height 0.3s';
        const vh = windowRef.innerHeight;
        const h = drawer.offsetHeight;
        const safeBottom = getSafeBottom();
        if (h > vh * SIDEBAR_SNAP.maxThreshold) {
            // 80%スナップ
            drawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
            const maxHeightPx = SIDEBAR_SNAP.maxRatio * vh - safeBottom;
            drawer.style.maxHeight = maxHeightPx + 'px';
            drawer.style.height = maxHeightPx + 'px';
            drawer.style.overflowY = 'hidden';
            if (content) {
                content.style.overflowY = 'auto';
                content.style.maxHeight = 'calc(100% - 56px - env(safe-area-inset-top) - env(safe-area-inset-bottom))';
            }
        } else if (h > vh * SIDEBAR_SNAP.midRatio) {
            // 30%スナップ
            drawer.classList.add('max-h-[30vh]');
            drawer.classList.remove('max-h-1/2');
            drawer.style.maxHeight = MID_HEIGHT;
            drawer.style.height = MID_HEIGHT;
            drawer.style.overflowY = 'hidden';
            if (content) {
                content.style.overflowY = 'hidden';
                content.style.maxHeight = '100%';
            }
        } else {
            // 最小化
            drawer.classList.remove('max-h-[30vh]', 'max-h-1/2');
            drawer.style.maxHeight = MIN_HEIGHT;
            drawer.style.height = MIN_HEIGHT;
            drawer.style.overflowY = 'hidden';
            if (content) {
                content.style.overflowY = 'hidden';
                content.style.maxHeight = '100%';
            }
        }
    }

    // --- 外側操作でモバイルは最小化 ---
    function handleOutsidePointer(event: Event): void {
        if (!isHidden() && !drawer.contains(event.target as Node | null)) {
            if (!isDesktop()) minimize();
        }
    }

    function handleWindowResize(): void {
        if (!isHidden()) {
            if (isDesktop()) {
                applyDesktopLayout();
            } else {
                applyMobileLayout();
            }
        }
    }

    // --- 本文・ドロワー上のタッチドラッグ ---
    let startY = 0;
    let startHeight = 0;
    let isDragging = false;
    let isMaybeDragFromScrollTop = false;

    function handleDrawerTouchStart(event: TouchEvent): void {
        if (isDesktop()) return;
        if (event.touches.length !== 1) return;

        if (isAtMax() && isInContent(event.target)) {
            // content上で80%スナップ時、スクロールが一番上なら下方向スワイプでドラッグ開始できる
            isMaybeDragFromScrollTop = (content as HTMLElement).scrollTop <= 0;
            isDragging = false;
            startY = event.touches[0].clientY;
            startHeight = drawer.offsetHeight;
            return;
        }
        // 通常のドラッグ開始
        isDragging = true;
        isMaybeDragFromScrollTop = false;
        startY = event.touches[0].clientY;
        startHeight = drawer.offsetHeight;
        beginDrag();
    }

    function handleDrawerTouchMove(event: TouchEvent): void {
        if (isAtMax() && isInContent(event.target)) {
            const scrollTop = (content as HTMLElement).scrollTop;
            const dy = event.touches[0].clientY - startY;
            if (!isDragging && isMaybeDragFromScrollTop && scrollTop <= 0 && dy > 8) {
                // 下方向スワイプでドラッグ開始
                isDragging = true;
                startY = event.touches[0].clientY;
                startHeight = drawer.offsetHeight;
                beginDrag();
            } else if (!isDragging) {
                // 通常のスクロール
                return;
            }
        }
        if (!isDragging) return;
        event.preventDefault();
        dragTo(startY, startHeight, event.touches[0].clientY);
    }

    function handleDrawerTouchEnd(): void {
        if (!isDragging) return;
        isDragging = false;
        snap();
    }

    // --- グリップのドラッグ（タッチ・マウス） ---
    let gripDragging = false;
    let gripStartY = 0;
    let gripStartHeight = 0;

    function gripDragStart(event: TouchEvent | MouseEvent): void {
        if (isDesktop()) return;
        gripDragging = true;
        if (event.type === 'touchstart') {
            gripStartY = (event as TouchEvent).touches[0].clientY;
            documentRef.addEventListener('touchmove', gripDragMove, { passive: false });
            documentRef.addEventListener('touchend', gripDragEnd, { passive: false });
        } else {
            gripStartY = (event as MouseEvent).clientY;
            documentRef.addEventListener('mousemove', gripDragMove, false);
            documentRef.addEventListener('mouseup', gripDragEnd, false);
        }
        gripStartHeight = drawer.offsetHeight;
        beginDrag();
        event.preventDefault();
    }

    function gripDragMove(event: TouchEvent | MouseEvent): void {
        if (!gripDragging) return;
        const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
        dragTo(gripStartY, gripStartHeight, clientY);
        event.preventDefault();
    }

    function removeGripDocumentListeners(): void {
        documentRef.removeEventListener('mousemove', gripDragMove, false);
        documentRef.removeEventListener('mouseup', gripDragEnd, false);
        documentRef.removeEventListener('touchmove', gripDragMove);
        documentRef.removeEventListener('touchend', gripDragEnd);
    }

    function gripDragEnd(): void {
        if (!gripDragging) return;
        gripDragging = false;
        snap();
        removeGripDocumentListeners();
    }

    windowRef.addEventListener('mousedown', handleOutsidePointer);
    windowRef.addEventListener('touchstart', handleOutsidePointer, { passive: true });
    windowRef.addEventListener('resize', handleWindowResize);

    drawer.addEventListener('touchstart', handleDrawerTouchStart, { passive: false });
    drawer.addEventListener('touchmove', handleDrawerTouchMove, { passive: false });
    drawer.addEventListener('touchend', handleDrawerTouchEnd, { passive: false });

    if (grip) {
        grip.addEventListener('touchstart', gripDragStart, { passive: false });
        grip.addEventListener('mousedown', gripDragStart, false);
    }

    function dispose(): void {
        windowRef.removeEventListener('mousedown', handleOutsidePointer);
        windowRef.removeEventListener('touchstart', handleOutsidePointer);
        windowRef.removeEventListener('resize', handleWindowResize);
        drawer.removeEventListener('touchstart', handleDrawerTouchStart);
        drawer.removeEventListener('touchmove', handleDrawerTouchMove);
        drawer.removeEventListener('touchend', handleDrawerTouchEnd);
        if (grip) {
            grip.removeEventListener('touchstart', gripDragStart);
            grip.removeEventListener('mousedown', gripDragStart);
        }
        removeGripDocumentListeners();
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
    }

    return { show, hide, minimize, dispose };
}
