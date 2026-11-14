/**
 * 右クリックのコンテキストメニュー（#context-menu）
 * - 座標のコピー・Googleマップで開く
 * - 画面外にはみ出さないよう位置を補正し、メニュー外のクリックで閉じる
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { setupOutsideClickListener } from '../common/outsideClickHandler';
import { showToast } from '../common/toast';

export interface ContextMenuRequest {
    x: number;
    y: number;
    lat: number | null;
    lng: number | null;
}

export interface ContextMenuProps {
    request: ContextMenuRequest | null;
    onClose: () => void;
    windowRef?: Pick<Window, 'innerWidth' | 'innerHeight' | 'open'>;
    clipboard?: Pick<Clipboard, 'writeText'>;
    notify?: (message: string) => void;
    setupOutsideClick?: typeof setupOutsideClickListener;
}

const MENU_MARGIN = 8;

export function ContextMenu({
    request,
    onClose,
    windowRef: windowOverride,
    clipboard: clipboardOverride,
    notify = showToast,
    setupOutsideClick = setupOutsideClickListener,
}: ContextMenuProps) {
    // 描画中は window / navigator を参照しない（プリレンダリング対応）。操作時に解決する
    const getWindow = () => windowOverride ?? window;
    const getClipboard = () => clipboardOverride ?? navigator.clipboard;
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<{ left: number; top: number; request: ContextMenuRequest } | null>(null);

    // 表示位置を補正し、外側クリック検出を登録する
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!request || !menu) return undefined;

        const windowRef = windowOverride ?? window;
        const rect = menu.getBoundingClientRect();
        let left = request.x;
        let top = request.y;
        if (request.x + rect.width > windowRef.innerWidth) {
            left = windowRef.innerWidth - rect.width - MENU_MARGIN;
        }
        if (request.y + rect.height > windowRef.innerHeight) {
            top = windowRef.innerHeight - rect.height - MENU_MARGIN;
        }
        setPosition({ left, top, request });

        return setupOutsideClick(menu, onClose, { delay: 50 });
    }, [request, onClose, windowOverride, setupOutsideClick]);

    const hasCoordinate = request?.lat != null && request?.lng != null;
    const coordinateText = hasCoordinate ? `${(request.lat as number).toFixed(5)},${(request.lng as number).toFixed(5)}` : '座標';
    const adjusted = position && position.request === request ? position : null;

    const copyCoordinate = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (hasCoordinate) {
            getClipboard().writeText(coordinateText)
                .then(() => notify('座標をコピーしました'))
                .catch(() => notify('座標のコピーに失敗しました'));
        }
        onClose();
    };

    const openGoogleMaps = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (hasCoordinate) {
            getWindow().open(`https://www.google.com/maps?q=${request.lat},${request.lng}`, '_blank', 'noopener,noreferrer');
        }
        onClose();
    };

    return (
        <div
            id="context-menu"
            className="bg-white border border-slate-300 rounded shadow-lg py-2 text-sm"
            style={{
                display: request ? 'block' : 'none',
                position: 'fixed',
                zIndex: 9999,
                pointerEvents: 'auto',
                ...(request ? { left: `${adjusted?.left ?? request.x}px`, top: `${adjusted?.top ?? request.y}px` } : {}),
            }}
            ref={menuRef}
        >
            <button id="context-copy-btn" className="block w-full text-left px-2 py-1 hover:bg-slate-100" style={{ pointerEvents: 'auto', whiteSpace: 'nowrap' }} onClick={copyCoordinate}>{coordinateText}</button>
            <button id="context-gmap-btn" className="block w-full text-left px-2 py-1 hover:bg-slate-100" type="button" onClick={openGoogleMaps}>Googleマップで開く</button>
        </div>
    );
}
