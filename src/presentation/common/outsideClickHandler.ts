/**
 * 要素外のクリック/タップを検出するユーティリティ
 * ハンバーガーメニューの情報ウィンドウ・コンテキストメニューで共通利用する
 */
export interface OutsideClickOptions {
    /** リスナー登録までの遅延（開いた直後のクリックで即閉じしないため） */
    delay?: number;
    documentRef?: Document;
}

/**
 * 要素外がクリック/タップされたときにコールバックを一度だけ実行する
 * @returns リスナー解除関数
 */
export function setupOutsideClickListener(
    element: Element | null,
    callback: (event: Event) => void,
    { delay = 0, documentRef = document }: OutsideClickOptions = {},
): () => void {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    function handleOutsideClick(event: Event): void {
        if (!element || !element.contains(event.target as Node | null)) {
            callback(event);
            unsubscribe();
        }
    }

    function scheduleListener(): void {
        timerId = null;
        documentRef.addEventListener('mousedown', handleOutsideClick);
        documentRef.addEventListener('touchstart', handleOutsideClick, { passive: true });
    }

    function unsubscribe(): void {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
        documentRef.removeEventListener('mousedown', handleOutsideClick);
        documentRef.removeEventListener('touchstart', handleOutsideClick);
    }

    if (delay > 0) {
        timerId = setTimeout(scheduleListener, delay);
    } else {
        scheduleListener();
    }

    return unsubscribe;
}
