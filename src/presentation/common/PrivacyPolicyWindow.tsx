/**
 * プライバシーポリシーモーダル（#privacy-policy-window）
 */
import { useEffect } from 'react';
import { useModalController, useModalElement } from './ModalContext';

export function PrivacyPolicyWindow() {
    const modals = useModalController();
    const { state, ref } = useModalElement('privacy');

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && modals.isOpen('privacy')) {
                modals.close('privacy');
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, [modals]);

    return (
        <div id="privacy-policy-window" className="text-xs" style={{ display: state.open ? 'block' : 'none' }} role="dialog" aria-modal="true" aria-labelledby="privacy-policy-title" tabIndex={-1} ref={ref}>
            <div className="modal-header">
                <button type="button" className="modal-close-btn" id="privacy-close-top-btn" aria-label="閉じる" onClick={() => modals.close('privacy')}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            <h2 id="privacy-policy-title" className="heading-tag">プライバシーポリシー</h2>
            <div className="space-y-2 px-2 text-slate-600">
                <section className="space-y-2">
                    <h3 className="flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">Cookieの利用について</h3>
                    <p className="pl-3">当サイトでは、以下の目的でCookieを使用しています。</p>
                    <ul className="list-disc list-inside space-y-1 pl-3">
                        <li>地図の表示位置・ズームレベルの記憶</li>
                        <li>各種表示設定の保存</li>
                        <li>Googleアナリティクスによるアクセス解析</li>
                    </ul>
                    <p className="pl-3">Cookieの利用を希望されない場合は、ブラウザの設定によりCookieを無効にすることができます。ただし、一部機能が正常に動作しない場合があります。</p>
                </section>
                <section className="space-y-2">
                    <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">Googleアナリティクス</h3>
                    <p className="pl-3">
                        当サイトはGoogleが提供するアクセス解析ツール「Googleアナリティクス」を利用しています。Googleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このデータは匿名で収集されており、個人を特定するものではありません。
                    </p>
                    <p className="pl-3">
                        Googleアナリティクスの利用規約・プライバシーポリシーについては、{' '}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">Googleのプライバシーポリシー</a>をご確認ください。
                    </p>
                </section>
                <section className="space-y-2">
                    <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">地図・外部サービス</h3>
                    <p className="pl-3">地図表示にMapLibre GLおよびOpenStreetMapのタイルを使用しています。これらサービスのプライバシーポリシーについては各サービスのサイトをご確認ください。</p>
                </section>
                <section className="space-y-2">
                    <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">個人情報の取り扱い</h3>
                    <p className="pl-3">お問い合わせ時に送信された情報は、内容の確認と回答のためにのみ利用します。法令に基づく場合を除き、ご本人の同意なく第三者へ提供しません。</p>
                </section>
            </div>
        </div>
    );
}
