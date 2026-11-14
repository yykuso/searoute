/**
 * トースト通知（画面下部に2秒間表示）
 * showToast() はどこからでも呼べるよう外部ストアに積み、<ToastHost /> が body 直下へ描画する
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface ToastItem {
    id: number;
    message: string;
}

const TOAST_VISIBLE_MS = 2000;
const TOAST_FADE_MS = 300;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function showToast(message: string): void {
    toasts = [...toasts, { id: nextId++, message }];
    emit();
}

function removeToast(id: number): void {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function getSnapshot(): ToastItem[] {
    return toasts;
}

function Toast({ item }: { item: ToastItem }) {
    const [opacity, setOpacity] = useState<string | undefined>(undefined);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setOpacity('1'));
        const fadeTimer = setTimeout(() => {
            setOpacity('0');
        }, TOAST_VISIBLE_MS);
        const removeTimer = setTimeout(() => removeToast(item.id), TOAST_VISIBLE_MS + TOAST_FADE_MS);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, [item.id]);

    return (
        <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-[9999] opacity-0 transition-opacity duration-300"
            style={opacity === undefined ? undefined : { opacity }}
            role="status"
        >
            {item.message}
        </div>
    );
}

const EMPTY: ToastItem[] = [];
const getServerSnapshot = () => EMPTY;

export function ToastHost({ container }: { container?: Element }) {
    const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    // プリレンダリング・ハイドレーション中は描画しない（document.body を参照しない）
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(items.map((item) => <Toast key={item.id} item={item} />), container ?? document.body);
}
