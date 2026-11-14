/**
 * サイト情報モーダル（#info-window）
 */
import { useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useModalController, useModalElement } from './ModalContext';

export function InfoWindow({ buildNumber }: { buildNumber: string }) {
    const modals = useModalController();
    const { state, ref } = useModalElement('info');

    // Escape で閉じる（プライバシーポリシーが前面にある場合はそちらを優先）
    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && modals.isOpen('info') && !modals.isOpen('privacy')) {
                modals.close('info');
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, [modals]);

    const openPrivacyPolicy = (event: MouseEvent<HTMLButtonElement>) => {
        const trigger = event.currentTarget;
        modals.close('info', { restoreFocus: false });
        modals.open('privacy', { trigger, focusCloseButton: true });
    };

    return (
        <div id="info-window" className="text-xs" style={{ display: state.open ? 'block' : 'none' }} ref={ref}>
            <div className="modal-header">
                <button type="button" className="modal-close-btn" id="info-close-top-btn" aria-label="閉じる" onClick={() => modals.close('info')}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            <h2 className="heading-tag">サイト情報</h2>
            <div className="space-y-2 px-2 text-slate-600">
                <p>
                    このサイトは、公共交通による旅を愛する一人の開発者が、「もっと気軽に、直感的に航路情報を探せたら」という想いから生まれました。<br />
                    日本各地の航路を地図上に集約し、視覚的にわかりやすく表示することで、「地図から航路を探す」「航路から旅のヒントを得る」体験を提供します。
                </p>
                <p>
                    海に囲まれたこの国の旅を、もっと自由に、もっと身近に。次の旅のお供になれば幸いです。
                </p>
                <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">掲載データについて</h3>
                <p className="pl-3">
                    当サイトでは、船による人の移動を目的とした定期航路を主な掲載対象としています。以下に該当する航路は、原則として掲載対象外です。
                </p>
                <ul className="list-disc space-y-1 pl-7">
                    <li>発着地が同じ遊覧航路（途中の港で乗降できるものを除く）</li>
                    <li>不定期に運航される航路</li>
                    <li>旅客利用を目的としない業務用航路</li>
                    <li>長期間運休している航路（一部を除く）</li>
                </ul>
                <p className="pl-3">
                    航路データの追加・修正依頼や機能要望は、{' '}
                    <a href="https://forms.gle/xXyqvDkZKNwEXPv27" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">
                        <i className="fa-solid fa-pen-to-square"></i> 専用フォーム{' '}
                    </a>
                    からお送りください。
                </p>
                <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">GitHubリポジトリ</h3>
                <ul className="mt-1 space-y-1 pl-3">
                    <li>
                        <a href="https://github.com/yykuso/searoute/" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">
                            <i className="fa-brands fa-github"></i> searoute{' '}
                        </a>
                        <span className="text-slate-500">(<span id="site-build-number">{buildNumber}</span>)</span>
                    </li>
                    <li>
                        <a href="https://github.com/yykuso/searoute-pmtiles" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">
                            <i className="fa-brands fa-github"></i> searoute-pmtiles
                        </a>
                    </li>
                </ul>
                <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">プライバシーポリシー</h3>
                <p className="pl-3">
                    Cookieの利用、Googleアナリティクス、個人情報の取り扱いについては、以下のプライバシーポリシーをご確認ください。
                </p>
                <button type="button" id="info-privacy-policy-btn" className="pl-3 flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-bold text-sky-600 hover:underline" onClick={openPrivacyPolicy}>
                    <i className="fa-solid fa-lock"></i>
                    プライバシーポリシーを読む
                </button>
                <h3 className="mt-3 flex w-full border-l-4 border-sky-500 bg-slate-100 px-2 py-1 font-semibold text-slate-700">免責事項</h3>
                <div className="space-y-2 pl-3">
                    <p>
                        情報の正確性には努めていますが、内容の保証はできません。
                        詳細や最新情報は必ず公式サイト等でご確認ください。
                    </p>
                    <p>
                        なお、本サイトの情報利用による損害等について、運営者は一切責任を負いません。
                    </p>
                </div>
            </div>

            <h2 className="heading-tag">開発者について</h2>
            <div className="space-y-2 px-2 text-slate-600">
                <p>
                    当サイトは、<strong className="font-semibold text-slate-700">ゎぃゎぃ @yy_kuso</strong> が個人で開発・運営しています。
                </p>
                {/* 旧 HTML の <p><ul></ul></p> はパーサーにより「空の p・ul・空の p」に分解されていたため、同じ DOM を再現する */}
                <p></p>
                <ul className="space-y-1 ml-3">
                    <li>
                        <a href="https://x.com/yy_kuso" id="twitter-link" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">
                            <i className="fa-brands fa-twitter"></i> Twitter
                        </a>
                    </li>
                    <li>
                        <a href="https://lnk.yy-kuso.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">
                            <i className="fa-solid fa-link"></i> 開発者のサイト
                        </a>
                    </li>
                    <li>
                        <a href="https://www.amazon.co.jp/hz/wishlist/ls/KF9GONGN9M1K" id="wishlist-link" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-600 hover:underline">
                            <i className="fa-solid fa-gift"></i> 運営の励みになります（ほしいものリスト）
                        </a>
                    </li>
                </ul>
                <p></p>
            </div>

        </div>
    );
}
