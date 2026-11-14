import type { ClipboardPort, NavigationPort } from '../../application/ports';

/** window.location / history を使うナビゲーション */
export const browserNavigation: NavigationPort = {
    getSearch: () => location.search,
    getPathname: () => location.pathname,
    getHref: () => location.href,
    replaceState: (path) => history.replaceState(null, '', path),
};

export const browserClipboard: ClipboardPort = {
    writeText: (text) => navigator.clipboard.writeText(text),
};
