/**
 * プリレンダリング済み HTML の初回描画（FCP）が済んでから callback を実行する
 * React・MapLibre の評価やハイドレーションで初回描画（= LCP のテキスト）を遅らせないため、
 * Paint Timing の first-contentful-paint を待ってから次のタスクで実行する
 * （未対応ブラウザは requestAnimationFrame → setTimeout で 1 フレーム待つ）。
 * 非表示タブでは描画が起きないため即時に、FCP が来ない場合も一定時間後に実行する
 */
const FALLBACK_DELAY_MS = 1000;
const FCP_ENTRY_NAME = 'first-contentful-paint';

export interface AfterFirstPaintEnvironment {
    windowRef?: Pick<Window, 'requestAnimationFrame' | 'setTimeout'> & { PerformanceObserver?: typeof PerformanceObserver };
    documentRef?: Pick<Document, 'visibilityState'>;
    performanceRef?: Pick<Performance, 'getEntriesByName'>;
}

export function afterFirstPaint(callback: () => void, {
    windowRef = window,
    documentRef = document,
    performanceRef = performance,
}: AfterFirstPaintEnvironment = {}): void {
    let done = false;
    const run = () => {
        if (done) return;
        done = true;
        callback();
    };
    const runNextTask = () => { windowRef.setTimeout(run, 0); };

    if (documentRef.visibilityState === 'hidden') {
        runNextTask();
        return;
    }

    const Observer = windowRef.PerformanceObserver;
    if (Observer?.supportedEntryTypes?.includes('paint')) {
        if (performanceRef.getEntriesByName(FCP_ENTRY_NAME).length > 0) {
            runNextTask();
            return;
        }
        const observer = new Observer((list) => {
            if (list.getEntriesByName(FCP_ENTRY_NAME).length > 0) {
                observer.disconnect();
                runNextTask();
            }
        });
        observer.observe({ type: 'paint', buffered: true });
    } else if (typeof windowRef.requestAnimationFrame === 'function') {
        windowRef.requestAnimationFrame(runNextTask);
    } else {
        runNextTask();
        return;
    }
    windowRef.setTimeout(run, FALLBACK_DELAY_MS);
}
