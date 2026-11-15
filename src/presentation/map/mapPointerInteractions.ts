/**
 * 地図上の右クリック（PC）・長押し（タッチ）
 *
 * iOS Safari の制約:
 * - TouchEvent はイベントプールで再利用されるため、コールバック内で
 *   e.touches[0] を参照できない → touchstart 時点で座標を退避する
 * - 長押しすると iOS が touchcancel を発火してコールアウトを表示しようとする
 *   → CSS で `-webkit-touch-callout: none` を #map に付与して抑制する
 * - map の load 以降に登録すると読み込み直後のタップに間に合わない
 *   → 地図生成直後に即時登録する
 */
export const LONG_PRESS_MS = 700;
export const DRAG_THRESHOLD_PX = 10;

export function isMapControlTarget(target: unknown): boolean {
    return Boolean((target as Element | null)?.closest?.('.maplibregl-ctrl'));
}

export interface MapPointerHandlers {
    /** 右クリック位置（画面座標） */
    onContextMenu(x: number, y: number): void;
    /** 長押し位置（画面座標） */
    onLongPress(x: number, y: number): void;
}

export function bindMapPointerInteractions(
    mapElement: HTMLElement,
    handlers: MapPointerHandlers,
    { windowRef = window }: { windowRef?: Pick<Window, 'matchMedia'> } = {},
): () => void {
    const isCoarsePointer = () => windowRef.matchMedia('(pointer: coarse)').matches;

    // PC: 右クリックでコンテキストメニュー
    const handleContextMenu = (event: MouseEvent) => {
        if (isCoarsePointer()) return;
        if (isMapControlTarget(event.target)) return;
        event.preventDefault();
        handlers.onContextMenu(event.clientX, event.clientY);
    };

    // モバイル: 長押し（700ms）で座標ドロワーを表示
    let touchTimeout: ReturnType<typeof setTimeout> | undefined;
    let isDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (event: TouchEvent) => {
        if (!isCoarsePointer()) return;
        if (event.touches.length !== 1) return;
        if (isMapControlTarget(event.target)) return;
        isDragging = false;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchTimeout = setTimeout(() => {
            if (!isDragging) {
                handlers.onLongPress(touchStartX, touchStartY);
            }
        }, LONG_PRESS_MS);
    };

    const handleTouchMove = (event: TouchEvent) => {
        if (isDragging) return;
        const dx = event.touches[0].clientX - touchStartX;
        const dy = event.touches[0].clientY - touchStartY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
            isDragging = true;
            clearTimeout(touchTimeout);
        }
    };

    const cancelLongPress = () => clearTimeout(touchTimeout);

    mapElement.addEventListener('contextmenu', handleContextMenu);
    mapElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    mapElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    mapElement.addEventListener('touchend', cancelLongPress, { passive: true });
    mapElement.addEventListener('touchcancel', cancelLongPress, { passive: true });

    return () => {
        cancelLongPress();
        mapElement.removeEventListener('contextmenu', handleContextMenu);
        mapElement.removeEventListener('touchstart', handleTouchStart);
        mapElement.removeEventListener('touchmove', handleTouchMove);
        mapElement.removeEventListener('touchend', cancelLongPress);
        mapElement.removeEventListener('touchcancel', cancelLongPress);
    };
}
