/**
 * Google アナリティクス（gtag.js）の読み込みと Cookie 同意
 * 旧 index.html / routeList.html のインラインスクリプトを移植
 */
export const GA_ID = 'G-03DRMSWKPW';
export const CONSENT_KEY = 'cookieConsent';
const CONSENT_DAYS = 365;

declare global {
    interface Window {
        dataLayer?: unknown[];
    }
}

let gaLoaded = false;

function getCookie(name: string, documentRef: Document): string | null {
    const cookies = documentRef.cookie.split('; ');
    for (const cookie of cookies) {
        const parts = cookie.split('=');
        if (parts[0] === name) return decodeURIComponent(parts[1]);
    }
    return null;
}

function setCookie(name: string, value: string, days: number, documentRef: Document): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    documentRef.cookie = name + '=' + value + ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax';
}

export function loadGoogleAnalytics(documentRef: Document = document, windowRef: Window = window): void {
    if (gaLoaded) return;
    gaLoaded = true;
    windowRef.dataLayer = windowRef.dataLayer || [];
    const dataLayer = windowRef.dataLayer;
    // gtag.js は arguments オブジェクトを積む前提のため function で定義する
    function gtag(..._args: unknown[]): void {
        // eslint-disable-next-line prefer-rest-params
        dataLayer.push(arguments);
    }
    globalThis.gtag = gtag as typeof globalThis.gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
    const script = documentRef.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    documentRef.head.appendChild(script);
}

/** 初期表示への影響を抑えるため、アイドル時またはロード後に遅延読み込みする */
export function scheduleGoogleAnalyticsLoad(documentRef: Document = document, windowRef: Window = window): void {
    const load = () => loadGoogleAnalytics(documentRef, windowRef);
    if (typeof windowRef.requestIdleCallback === 'function') {
        windowRef.requestIdleCallback(load, { timeout: 2000 });
        return;
    }
    if (documentRef.readyState === 'complete') {
        setTimeout(load, 0);
        return;
    }
    windowRef.addEventListener('load', () => {
        setTimeout(load, 0);
    }, { once: true });
}

/** Cookie 同意（バナーを閉じたら同意とみなし、アクセス解析を読み込む） */
export function createCookieConsent(documentRef: Document = document, windowRef: Window = window) {
    return {
        hasConsent: () => getCookie(CONSENT_KEY, documentRef) !== null,
        accept: () => {
            setCookie(CONSENT_KEY, 'closed', CONSENT_DAYS, documentRef);
            scheduleGoogleAnalyticsLoad(documentRef, windowRef);
        },
    };
}
