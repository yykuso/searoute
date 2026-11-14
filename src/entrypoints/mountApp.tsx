/**
 * プリレンダリング済みの HTML があればハイドレーションし、無ければ（開発サーバー）新規に描画する
 */
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

export function mountApp(container: HTMLElement, app: ReactNode): void {
    if (container.firstElementChild) {
        hydrateRoot(container, app);
    } else {
        createRoot(container).render(app);
    }
}
