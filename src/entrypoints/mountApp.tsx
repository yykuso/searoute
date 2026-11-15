/**
 * プリレンダリング済みの HTML があればハイドレーションし、無ければ（開発サーバー）新規に描画する
 * ハイドレーションは startTransition で低優先度にし、React が処理を細切れにしてメインスレッドを譲れるようにする
 */
import { startTransition } from 'react';
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

export function mountApp(container: HTMLElement, app: ReactNode): void {
    if (container.firstElementChild) {
        startTransition(() => {
            hydrateRoot(container, app);
        });
    } else {
        createRoot(container).render(app);
    }
}
