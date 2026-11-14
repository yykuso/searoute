/**
 * 詳細情報ドロワー（#detail-drawer）
 * - 殻（クラス・インラインスタイル）は detailDrawerController が命令的に制御する
 * - タイトル・本文は drawerViewModel の content から描画する
 */
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { configureDrawerPresenter, hideDrawer } from '../../application/viewModels/drawerViewModel';
import type { DrawerState } from '../../application/viewModels/drawerViewModel';
import { showToast } from '../common/toast';
import { useViewModelState } from '../hooks/useViewModelState';
import type { SubscribableViewModel } from '../hooks/useViewModelState';
import { DrawerBodyView } from './DrawerBody';
import { createDetailDrawerController } from './detailDrawerController';
import type { DetailDrawerController } from './detailDrawerController';

const DRAWER_CLASS = 'fixed z-50 bg-white shadow-xl border-slate-200 border transition-transform duration-300 ease-in-out w-full max-h-[30vh] left-0 bottom-0 rounded-t-2xl p-4 md:top-0 md:left-0 md:bottom-0 md:w-96 md:max-h-full md:rounded-none md:rounded-r-2xl md:p-6 translate-y-full md:translate-y-0 md:-translate-x-full overflow-y-auto touch-pan-y';
const COPY_FEEDBACK_MS = 1500;

export interface DetailDrawerProps {
    viewModel: SubscribableViewModel<DrawerState>;
    /** 地図の初期スタイル読み込みが終わるまでは非表示（display:none） */
    ready: boolean;
    copyShareUrl: (onCopied: () => void, onFallback: (url: string) => void) => Promise<void>;
    /** テスト用に差し替え可能なコントローラー生成 */
    createController?: typeof createDetailDrawerController;
}

function DrawerTitle({ viewModel }: { viewModel: SubscribableViewModel<DrawerState> }) {
    const { content } = useViewModelState(viewModel);
    if (!content) {
        return <>詳細情報</>;
    }
    const title = content.title ?? '詳細情報';
    if (content.subtitle) {
        return (
            <div>
                <span>{title}</span>
                <span className="block text-xs text-slate-500 font-normal leading-tight mt-0.5">{content.subtitle}</span>
            </div>
        );
    }
    return <>{title}</>;
}

function DrawerContent({ viewModel }: { viewModel: SubscribableViewModel<DrawerState> }) {
    const { content } = useViewModelState(viewModel);
    return content ? <DrawerBodyView body={content.body} /> : null;
}

function ShareButton({ copyShareUrl }: Pick<DetailDrawerProps, 'copyShareUrl'>) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;
        const timerId = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        return () => clearTimeout(timerId);
    }, [copied]);

    const share = () => {
        void copyShareUrl(
            () => {
                setCopied(true);
                showToast('URLをコピーしました');
            },
            (url) => {
                // フォールバック
                window.prompt('以下のURLをコピーしてください', url);
            },
        );
    };

    return (
        <button id="detail-drawer-share-btn" aria-label="URLをコピーして共有" className="self-start text-slate-400 hover:text-slate-700 text-2xl font-bold focus:outline-none" onClick={share}>
            <span className="bg-slate-200 hover:bg-slate-300 w-8 h-8 flex items-center justify-center rounded-full p-0 transition-colors">
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-share-nodes'} text-base cursor-pointer`}></i>
            </span>
        </button>
    );
}

export const DetailDrawer = memo(function DetailDrawer({ viewModel, ready, copyShareUrl, createController = createDetailDrawerController }: DetailDrawerProps) {
    const drawerRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const gripRef = useRef<HTMLDivElement | null>(null);
    const controllerRef = useRef<DetailDrawerController | null>(null);

    // 地図生成前（iOS で初回タップを取りこぼさないよう load 前）に表示処理を登録する
    useLayoutEffect(() => {
        const drawer = drawerRef.current;
        if (!drawer) return undefined;
        const controller = createController({ drawer, content: contentRef.current, grip: gripRef.current });
        controllerRef.current = controller;
        configureDrawerPresenter({
            show: () => { controller.show(); return true; },
            hide: () => { controller.hide(); return true; },
        });
        return () => {
            configureDrawerPresenter({});
            controller.dispose();
            controllerRef.current = null;
        };
    }, [createController]);

    return (
        <div id="detail-drawer" className={DRAWER_CLASS} style={{ display: ready ? undefined : 'none' }} ref={drawerRef}>
            <div id="sidebar-grip" className="mx-auto mt-2 mb-1 h-1 w-12 rounded-full bg-slate-300 md:hidden cursor-ns-resize" ref={gripRef}></div>
            <div className="flex items-center justify-between mx-4 mb-2">
                <h2 id="detail-drawer-title" className="text-lg font-bold text-sky-700 wrap-break-word max-w-[calc(100%-5rem)] leading-tight">
                    <DrawerTitle viewModel={viewModel} />
                </h2>
                <div className="flex items-center gap-2">
                    <ShareButton copyShareUrl={copyShareUrl} />
                    <button id="detail-drawer-close-btn" aria-label="詳細情報を閉じる" className="self-start text-slate-400 hover:text-slate-700 text-2xl font-bold focus:outline-none" onClick={() => hideDrawer()}>
                        <span className="bg-slate-200 hover:bg-slate-300 w-8 h-8 flex items-center justify-center rounded-full p-0 transition-colors">
                            <i className="fa-solid fa-xmark cursor-pointer"></i>
                        </span>
                    </button>
                </div>
            </div>
            <div id="detail-drawer-content" className="text-sm text-slate-700 space-y-2" style={{ overscrollBehavior: 'none' }} ref={contentRef}>
                <DrawerContent viewModel={viewModel} />
            </div>
        </div>
    );
});
