/**
 * 地図コントロールのパネル開閉（ホバー・タッチ）
 * - PC: コントロールにマウスが乗っている間だけパネルを表示
 * - タッチ: 1本指タップで開閉（最初のタップで地図を操作しない）。他のパネルは閉じ、パネル外のタッチで閉じる
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface PanelVisibility {
    isOpen(): boolean;
    setOpen(open: boolean): void;
}

let activePanelCloser: (() => void) | null = null;

export function bindTouchPanelToggle(
    toggleElement: HTMLElement,
    panelElement: HTMLElement,
    panel: PanelVisibility,
    { documentRef = document }: { documentRef?: Pick<Document, 'addEventListener' | 'removeEventListener'> } = {},
): () => void {
    const closePanel = () => {
        panel.setOpen(false);
        documentRef.removeEventListener('touchstart', handleOutsideTouch);
        if (activePanelCloser === closePanel) {
            activePanelCloser = null;
        }
    };

    const handleOutsideTouch = (event: Event) => {
        const target = event.target as Node | null;
        if (toggleElement.contains(target) || panelElement.contains(target)) return;
        closePanel();
    };

    const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;

        event.preventDefault();
        event.stopPropagation();
        if (panel.isOpen()) {
            closePanel();
            return;
        }

        activePanelCloser?.();
        panel.setOpen(true);
        activePanelCloser = closePanel;
        documentRef.addEventListener('touchstart', handleOutsideTouch, { passive: true });
    };

    toggleElement.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
        closePanel();
        toggleElement.removeEventListener('touchstart', handleTouchStart);
    };
}

/**
 * コントロールのパネル表示状態（ホバーで開閉・タッチで切り替え）
 * @param container MapLibre コントロールのコンテナ（mouseover/mouseout を監視）
 */
export function usePanelToggle(
    container: HTMLElement | null,
    toggleRef: RefObject<HTMLElement | null>,
    panelRef: RefObject<HTMLElement | null>,
): [boolean, (open: boolean) => void] {
    const [open, setOpenState] = useState(false);
    const openRef = useRef(false);

    const setOpen = useCallback((nextOpen: boolean) => {
        openRef.current = nextOpen;
        setOpenState(nextOpen);
    }, []);

    useEffect(() => {
        const toggleElement = toggleRef.current;
        const panelElement = panelRef.current;
        if (!container || !toggleElement || !panelElement) return undefined;

        const handleOver = () => setOpen(true);
        const handleOut = () => setOpen(false);
        container.addEventListener('mouseover', handleOver);
        container.addEventListener('mouseout', handleOut);
        const unbindTouch = bindTouchPanelToggle(toggleElement, panelElement, {
            isOpen: () => openRef.current,
            setOpen,
        });

        return () => {
            container.removeEventListener('mouseover', handleOver);
            container.removeEventListener('mouseout', handleOut);
            unbindTouch();
        };
    }, [container, toggleRef, panelRef, setOpen]);

    return [open, setOpen];
}
