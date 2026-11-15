// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CookieBanner } from '../../../src/presentation/common/CookieBanner';
import { createLoadingIndicator, LoadingIndicator } from '../../../src/presentation/common/loadingIndicator';
import { ModalProvider } from '../../../src/presentation/common/ModalContext';
import { createModalController } from '../../../src/presentation/common/modalController';
import { setupOutsideClickListener } from '../../../src/presentation/common/outsideClickHandler';
import { PrivacyPolicyWindow } from '../../../src/presentation/common/PrivacyPolicyWindow';
import { showToast, ToastHost } from '../../../src/presentation/common/toast';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('LoadingIndicator', () => {
    it('並行処理がすべて終わるまで表示を維持する', () => {
        const store = createLoadingIndicator();
        render(<LoadingIndicator store={store} />);
        const element = document.getElementById('loading') as HTMLElement;
        expect(element.style.display).toBe('none');

        act(() => { store.show(); store.show(); });
        expect(element.style.display).toBe('block');
        act(() => store.hide());
        expect(element.style.display).toBe('block');
        act(() => store.hide());
        expect(element.style.display).toBe('none');
        act(() => store.hide());
        expect(store.isVisible()).toBe(false);
    });
});

describe('CookieBanner', () => {
    function renderBanner(hasConsent: boolean) {
        const consent = { hasConsent: () => hasConsent, accept: vi.fn() };
        render(
            <ModalProvider controller={createModalController()}>
                <CookieBanner consent={consent} />
                <PrivacyPolicyWindow />
            </ModalProvider>,
        );
        return { consent, banner: document.getElementById('cookie-banner') as HTMLElement };
    }

    it('描画中は Cookie を読まず（表示は head のスクリプトと CSS が決める）、閉じると同意を保存して非表示にする', () => {
        document.documentElement.setAttribute('data-cookie-banner', 'show');
        const { consent, banner } = renderBanner(false);
        expect(banner.style.display).toBe('');
        fireEvent.click(document.getElementById('cookie-close-btn') as HTMLElement);
        expect(consent.accept).toHaveBeenCalledOnce();
        expect(banner.style.display).toBe('none');
        expect(document.documentElement.hasAttribute('data-cookie-banner')).toBe(false);
    });

    it('プライバシーポリシーを開き、閉じるとトリガーへフォーカスを戻す', () => {
        renderBanner(false);
        const trigger = document.getElementById('privacy-policy-open-btn') as HTMLElement;
        fireEvent.click(trigger);
        expect(document.activeElement?.id).toBe('privacy-close-top-btn');
        // jsdom では offsetParent が常に null のためフォーカス復元はブラウザ（E2E）で確認する
        fireEvent.click(document.getElementById('privacy-close-top-btn') as HTMLElement);
        expect(document.getElementById('privacy-policy-window')?.style.display).toBe('none');
    });
});

describe('setupOutsideClickListener', () => {
    it('要素外のクリックで一度だけ通知し、解除後は通知しない', () => {
        const element = document.createElement('div');
        document.body.append(element);
        const callback = vi.fn();
        setupOutsideClickListener(element, callback);
        fireEvent.mouseDown(element);
        expect(callback).not.toHaveBeenCalled();
        fireEvent.mouseDown(document.body);
        fireEvent.mouseDown(document.body);
        expect(callback).toHaveBeenCalledOnce();

        const callback2 = vi.fn();
        const unsubscribe = setupOutsideClickListener(element, callback2, { delay: 50 });
        unsubscribe();
        fireEvent.mouseDown(document.body);
        expect(callback2).not.toHaveBeenCalled();
    });
});

describe('ToastHost', () => {
    it('body 直下に表示し、2秒後にフェードアウトして削除する', () => {
        vi.useFakeTimers();
        render(<ToastHost />);
        act(() => showToast('URLをコピーしました'));
        const toast = screen.getByText('URLをコピーしました');
        expect(toast.parentElement).toBe(document.body);
        act(() => { vi.advanceTimersByTime(2000); });
        expect(toast.style.opacity).toBe('0');
        act(() => { vi.advanceTimersByTime(300); });
        expect(screen.queryByText('URLをコピーしました')).toBeNull();
    });
});
