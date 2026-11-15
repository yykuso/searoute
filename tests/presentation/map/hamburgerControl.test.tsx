// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfoWindow } from '../../../src/presentation/common/InfoWindow';
import { ModalProvider } from '../../../src/presentation/common/ModalContext';
import { createModalController } from '../../../src/presentation/common/modalController';
import { PrivacyPolicyWindow } from '../../../src/presentation/common/PrivacyPolicyWindow';
import { HamburgerMenu } from '../../../src/presentation/map/HamburgerMenu';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function renderMenu() {
    const container = document.createElement('div');
    container.id = 'hamburger-control';
    document.body.append(container);
    const modals = createModalController();
    const view = render(
        <ModalProvider controller={modals}>
            <InfoWindow buildNumber="abc1234" />
            <PrivacyPolicyWindow />
            <HamburgerMenu container={container} />
        </ModalProvider>,
    );
    const panel = container.querySelector('.maplibregl-ctrl-hamburger-list') as HTMLElement;
    const infoWindow = document.getElementById('info-window') as HTMLElement;
    return { ...view, container, panel, infoWindow, modals };
}

describe('HamburgerMenu', () => {
    it('サイト情報表示時にハンバーガーパネルを閉じ、スクロール位置を先頭へ戻す', () => {
        const { container, panel, infoWindow } = renderMenu();
        fireEvent.mouseOver(container);
        expect(panel.style.display).toBe('block');
        infoWindow.scrollTop = 240;

        fireEvent.click(screen.getByRole('link', { name: 'サイト情報', hidden: true }));

        expect(panel.style.display).toBe('none');
        expect(infoWindow.style.display).toBe('block');
        expect(infoWindow.scrollTop).toBe(0);
        expect(screen.getByRole('link', { name: '航路一覧', hidden: true }).getAttribute('href')).toBe('./routeList.html');
    });

    it('情報ウィンドウ外のクリックで閉じる（開いた直後は 100ms 待つ）', () => {
        vi.useFakeTimers();
        const { infoWindow } = renderMenu();
        fireEvent.click(screen.getByRole('link', { name: 'サイト情報', hidden: true }));

        fireEvent.mouseDown(document.body);
        expect(infoWindow.style.display).toBe('block');

        act(() => { vi.advanceTimersByTime(100); });
        fireEvent.mouseDown(infoWindow);
        expect(infoWindow.style.display).toBe('block');
        fireEvent.mouseDown(document.body);
        expect(infoWindow.style.display).toBe('none');
    });

    it('閉じるボタン・Escape で閉じ、ビルド番号を表示する', () => {
        const { infoWindow } = renderMenu();
        expect(document.getElementById('site-build-number')?.textContent).toBe('abc1234');

        fireEvent.click(screen.getByRole('link', { name: 'サイト情報', hidden: true }));
        fireEvent.click(document.getElementById('info-close-top-btn') as HTMLElement);
        expect(infoWindow.style.display).toBe('none');

        fireEvent.click(screen.getByRole('link', { name: 'サイト情報', hidden: true }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(infoWindow.style.display).toBe('none');
    });

    it('サイト情報からプライバシーポリシーへ切り替え、閉じるボタンへフォーカスし Escape で閉じる', () => {
        const { infoWindow } = renderMenu();
        fireEvent.click(screen.getByRole('link', { name: 'サイト情報', hidden: true }));
        fireEvent.click(screen.getByRole('button', { name: 'プライバシーポリシーを読む' }));

        const privacy = screen.getByRole('dialog', { name: 'プライバシーポリシー' });
        expect(infoWindow.style.display).toBe('none');
        expect(privacy.style.display).toBe('block');
        expect(document.activeElement?.id).toBe('privacy-close-top-btn');

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(privacy.style.display).toBe('none');
    });
});
