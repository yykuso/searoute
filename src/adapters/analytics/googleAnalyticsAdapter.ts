import type { AnalyticsPort } from '../../application/ports';

type Gtag = (command: string, eventName: string, params: Record<string, unknown>) => void;

declare global {
    // index.html / routeList.html のインラインスクリプトが定義する
    var gtag: Gtag | undefined;
}

export function trackEvent(eventName: string, category: string, label: unknown, value: number = 1): void {
    if (typeof gtag === 'function') {
        gtag('event', eventName, {
            event_category: category,
            event_label: label,
            value,
        });
    }
}

export const googleAnalytics: AnalyticsPort = { trackEvent };
