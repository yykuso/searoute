/**
 * Cookie 通知バナー（#cookie-banner）
 *
 * 表示判定は描画中に Cookie を読まない（プリレンダリング結果とハイドレーションを一致させるため）。
 * index.html の head のインラインスクリプトが同意 Cookie の有無を調べて
 * <html data-cookie-banner="show"> を付け、CSS で HTML 解析中から表示する（旧版と同じタイミング）。
 * React は閉じた後の非表示だけを管理する。
 */
import { useState } from 'react';
import { useModalController } from './ModalContext';

export interface CookieConsentPort {
    hasConsent(): boolean;
    /** 同意を保存してアクセス解析を読み込む */
    accept(): void;
}

export const COOKIE_BANNER_ATTRIBUTE = 'data-cookie-banner';

export function CookieBanner({ consent }: { consent: CookieConsentPort }) {
    const modals = useModalController();
    const [closed, setClosed] = useState(false);

    const close = () => {
        consent.accept();
        setClosed(true);
        document.documentElement.removeAttribute(COOKIE_BANNER_ATTRIBUTE);
    };

    return (
        <div id="cookie-banner" className="cookie-banner" style={closed ? { display: 'none' } : undefined} role="note" aria-label="Cookieの利用について">
            <div className="cookie-banner__body">
                <p className="cookie-banner__text">
                    当サイトはCookieを使用しております。Cookieの設定はいつでもご利用のブラウザの設定によりご変更いただけます。このサイトを利用することにより、Cookieの利用について同意いただいたものとみなします。
                    当サイトの使用するCookieについては、<button type="button" id="privacy-policy-open-btn" className="cookie-banner__link-btn" onClick={(event) => modals.open('privacy', { trigger: event.currentTarget, focusCloseButton: true })}>プライバシーポリシー</button>をご確認ください。
                </p>
                <button id="cookie-close-btn" className="cookie-banner__close" aria-label="閉じる" onClick={close}>&times;</button>
            </div>
        </div>
    );
}
