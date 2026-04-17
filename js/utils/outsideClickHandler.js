/**
 * 要素外のクリック/タップイベントを処理するユーティリティ
 * 複数の UI コンポーネント（ハンバーガーメニュー、詳細ドロワー、情報ウィンドウなど）
 * で共通の外側クリック検出ロジックを提供する
 */

/**
 * 要素外がクリック/タップされたときにコールバックを実行
 * @param {HTMLElement} element - 監視対象の要素
 * @param {Function} callback - 外側クリック時に実行する関数
 * @param {Object} options - オプション
 *        - { delay: 0 } デフォルトは即座にリスナー登録
 *        - { delay: 100 } クリック後 100ms 後にリスナー登録（即閉じ防止）
 * @returns {Function} - リスナー解除関数
 */
export function setupOutsideClickListener(element, callback, options = {}) {
    const { delay = 0 } = options;

    function handleOutsideClick(event) {
        if (!element || !element.contains(event.target)) {
            callback(event);
            // リスナー解除
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        }
    }

    // デリゲートで登録
    const scheduleListener = () => {
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    };

    if (delay > 0) {
        setTimeout(scheduleListener, delay);
    } else {
        scheduleListener();
    }

    // リスナー解除関数を返す
    return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('touchstart', handleOutsideClick);
    };
}
