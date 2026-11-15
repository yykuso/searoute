/**
 * Service Worker の登録（index.html のみ）
 * 待機中の新しい Service Worker があれば即時に切り替える
 */
export function registerServiceWorker(
    { navigatorRef = navigator, windowRef = window, documentRef = document }: {
        navigatorRef?: Navigator;
        windowRef?: Window;
        documentRef?: Document;
    } = {},
): void {
    if (!('serviceWorker' in navigatorRef)) {
        return;
    }

    const register = () => {
        navigatorRef.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                registration.addEventListener('updatefound', () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) {
                        return;
                    }

                    installingWorker.addEventListener('statechange', () => {
                        if (installingWorker.state === 'installed' && navigatorRef.serviceWorker.controller) {
                            installingWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });

                console.log('ServiceWorker registration successful');
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    };

    if (documentRef.readyState === 'complete') {
        register();
    } else {
        windowRef.addEventListener('load', register, { once: true });
    }
}
