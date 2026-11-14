/**
 * ハンバーガーメニュー（#hamburger-control）
 * サイト情報モーダルと航路一覧ページへのリンク
 */
import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { setupOutsideClickListener } from '../common/outsideClickHandler';
import { useModalController } from '../common/ModalContext';
import { usePanelToggle } from './touchPanelToggle';

export function HamburgerMenu({ container }: { container: HTMLElement }) {
    const modals = useModalController();
    const toggleRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const outsideClickUnsubscriber = useRef<(() => void) | null>(null);
    const [open, setOpen] = usePanelToggle(container, toggleRef, panelRef);

    // サイト情報が閉じられたら外側クリック検出を解除してパネルも閉じる
    useEffect(() => modals.onClose('info', () => {
        outsideClickUnsubscriber.current?.();
        outsideClickUnsubscriber.current = null;
        setOpen(false);
    }), [modals, setOpen]);

    useEffect(() => () => outsideClickUnsubscriber.current?.(), []);

    const showInfoWindow = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setOpen(false);
        modals.open('info', { trigger: event.currentTarget });

        outsideClickUnsubscriber.current?.();
        // 外側クリック検出を登録（100ms遅延で即閉じ防止）
        outsideClickUnsubscriber.current = setupOutsideClickListener(
            document.getElementById('info-window'),
            () => {
                modals.close('info', { restoreFocus: false });
                setOpen(false);
            },
            { delay: 100 },
        );
    };

    return createPortal(
        <>
            <div className="maplibregl-ctrl-hamburger-toggle" ref={toggleRef}>
                <i className="fa-solid fa-bars fa-lg"></i>
            </div>
            <div className="maplibregl-ctrl-hamburger-list" style={{ display: open ? 'block' : 'none' }} ref={panelRef}>
                <div>
                    <a href="#info-window" onClick={showInfoWindow}><i className="fa-solid fa-circle-info"></i> サイト情報</a>
                </div>
                <div>
                    <a href="./routeList.html"><i className="fa-solid fa-ship"></i> 航路一覧</a>
                </div>
            </div>
        </>,
        container,
    );
}
