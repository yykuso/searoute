// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    createDrawerViewModel,
    registerDrawerAction,
    registerDrawerCloseHandler,
    showDrawer,
} from '../../../src/application/viewModels/drawerViewModel';
import { drawerViewModel } from '../../../src/application/viewModels/drawerViewModel';
import { DetailDrawer } from '../../../src/presentation/map/DetailDrawer';
import { createDetailDrawerController } from '../../../src/presentation/map/detailDrawerController';
import { SeaRouteDrawerBody } from '../../../src/presentation/map/DrawerBody';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function createWindowStub(innerWidth = 1024, innerHeight = 800) {
    const frames: Array<() => void> = [];
    const target = new EventTarget();
    return {
        frames,
        innerWidth,
        innerHeight,
        addEventListener: vi.fn(target.addEventListener.bind(target)),
        removeEventListener: vi.fn(target.removeEventListener.bind(target)),
        dispatch: (type: string) => target.dispatchEvent(new Event(type)),
        requestAnimationFrame: vi.fn((callback: () => void) => { frames.push(callback); return frames.length; }),
    };
}

function createElements() {
    const drawer = document.createElement('div');
    drawer.className = 'max-h-[30vh] md:-translate-x-full';
    const content = document.createElement('div');
    const grip = document.createElement('div');
    drawer.append(grip, content);
    document.body.append(drawer);
    return { drawer, content, grip };
}

describe('detailDrawerController', () => {
    it('ウィンドウ・ドロワー・グリップのイベントを登録し、破棄で解除する', () => {
        const elements = createElements();
        const windowRef = createWindowStub();
        const drawerAdd = vi.spyOn(elements.drawer, 'addEventListener');
        const gripAdd = vi.spyOn(elements.grip, 'addEventListener');

        const controller = createDetailDrawerController(elements, { windowRef: windowRef as unknown as Window });
        expect(drawerAdd).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
        expect(gripAdd).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
        expect(windowRef.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));

        controller.dispose();
        expect(windowRef.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });

    it('PCで再表示すると閉位置を描画してから開き、古い非表示タイマーを取り消す', () => {
        vi.useFakeTimers();
        const elements = createElements();
        elements.drawer.classList.add('hidden');
        const windowRef = createWindowStub(1024);
        const onClose = vi.fn();
        const rect = vi.spyOn(elements.drawer, 'getBoundingClientRect');
        const controller = createDetailDrawerController(elements, { windowRef: windowRef as unknown as Window, onClose });

        controller.show();
        expect(elements.drawer.classList.contains('hidden')).toBe(false);
        expect(elements.drawer.classList.contains('md:-translate-x-full')).toBe(true);
        expect(rect).toHaveBeenCalledOnce();
        windowRef.frames.shift()?.();
        expect(elements.drawer.classList.contains('md:-translate-x-full')).toBe(false);

        controller.hide();
        expect(onClose).toHaveBeenCalledOnce();
        controller.show();
        windowRef.frames.shift()?.();
        vi.advanceTimersByTime(300);
        expect(elements.drawer.classList.contains('hidden')).toBe(false);
        controller.dispose();
    });

    it('表示中の画面幅変更でPC・モバイル用レイアウトを切り替える', () => {
        const elements = createElements();
        Object.assign(elements.drawer.style, { transition: 'max-height 0.3s', maxHeight: '30dvh', height: '30dvh', padding: '0', overflowY: 'hidden' });
        elements.content.style.paddingLeft = '1rem';
        const windowRef = createWindowStub(1024);
        const controller = createDetailDrawerController(elements, { windowRef: windowRef as unknown as Window });
        controller.show();

        windowRef.dispatch('resize');
        expect(elements.drawer.classList.contains('max-h-[30vh]')).toBe(false);
        expect(elements.drawer.style.maxHeight).toBe('');
        expect(elements.drawer.style.padding).toBe('');
        expect(elements.content.style.paddingLeft).toBe('');

        windowRef.innerWidth = 767;
        windowRef.dispatch('resize');
        expect(elements.drawer.classList.contains('max-h-[30vh]')).toBe(true);
        expect(elements.drawer.style.padding).toBe('0px');
        expect(elements.content.style.paddingLeft).toBe('1rem');
        expect(elements.content.style.paddingBottom).toBe('0.5rem');
        controller.dispose();
    });

    it('モバイルでドロワー外を押すと最小化する', () => {
        const elements = createElements();
        const widthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
        const controller = createDetailDrawerController(elements);
        fireEvent.mouseDown(document.body);
        expect(elements.drawer.style.height).toBe('');
        controller.show();
        elements.drawer.style.height = '';
        fireEvent.mouseDown(elements.drawer);
        expect(elements.drawer.style.height).toBe('');
        fireEvent.mouseDown(document.body);
        expect(elements.drawer.style.height).toBe('calc(72px + env(safe-area-inset-bottom))');
        controller.dispose();
        widthSpy.mockRestore();
    });

    it('一度も表示していないドロワーは画面幅変更でレイアウトを変えない', () => {
        const elements = createElements();
        const windowRef = createWindowStub(390);
        const controller = createDetailDrawerController(elements, { windowRef: windowRef as unknown as Window });
        windowRef.dispatch('resize');
        expect(elements.drawer.getAttribute('style')).toBeNull();
        controller.hide();
        windowRef.dispatch('resize');
        expect(elements.drawer.style.height).toBe('0px');
        controller.dispose();
    });

    it('リンク上からの下方向スワイプでもドロワーを下げる', () => {
        const elements = createElements();
        Object.defineProperty(elements.drawer, 'offsetHeight', { value: 240, configurable: true });
        const link = document.createElement('a');
        elements.content.append(link);
        const windowRef = createWindowStub(390, 800);
        const controller = createDetailDrawerController(elements, {
            windowRef: windowRef as unknown as Window,
            getComputedStyleImpl: () => ({ getPropertyValue: () => '0' }),
        });

        const touchEvent = (type: string, clientY: number) => {
            const event = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'touches', { value: [{ clientY }] });
            link.dispatchEvent(event);
            return event;
        };
        touchEvent('touchstart', 300);
        const move = touchEvent('touchmove', 350);
        expect(move.defaultPrevented).toBe(true);
        expect(elements.drawer.style.height).toBe('190px');
        controller.dispose();
    });
});

describe('DetailDrawer', () => {
    it('地図の準備前は非表示にし、準備後に表示可能にする', () => {
        const viewModel = createDrawerViewModel();
        const { rerender } = render(<DetailDrawer viewModel={viewModel} ready={false} copyShareUrl={vi.fn()} />);
        expect(document.getElementById('detail-drawer')?.style.display).toBe('none');
        rerender(<DetailDrawer viewModel={viewModel} ready copyShareUrl={vi.fn()} />);
        expect(document.getElementById('detail-drawer')?.style.display).toBe('');
        expect(document.getElementById('detail-drawer-title')?.textContent).toBe('詳細情報');
    });

    it('showDrawer で本文・タイトル・サブタイトルを描画し、閉じるボタンで閉じる処理を実行する', () => {
        const controller = { show: vi.fn(), hide: vi.fn(), minimize: vi.fn(), dispose: vi.fn() };
        render(<DetailDrawer viewModel={drawerViewModel} ready copyShareUrl={vi.fn()} createController={() => controller} />);

        act(() => {
            showDrawer({ kind: 'coord', lat: '35.00000', lng: '136.00000', address: '取得中...' }, '35.00000, 136.00000', '座標情報');
        });
        expect(controller.show).toHaveBeenCalledOnce();
        expect(screen.getByText('座標情報').className).toContain('text-slate-500');
        expect(document.getElementById('reverse-geocode-address')?.textContent).toBe('取得中...');
        expect(screen.getByRole('link', { name: 'ここをGoogleマップで開く' }).getAttribute('href')).toBe('https://maps.google.com/?q=35.00000,136.00000');

        fireEvent.click(screen.getByRole('button', { name: '詳細情報を閉じる' }));
        expect(controller.hide).toHaveBeenCalledOnce();
        expect(drawerViewModel.getState().drawer.isOpen).toBe(false);
    });

    it('共有ボタンでURLをコピーし、アイコンを一時的にチェックへ変える', async () => {
        const copyShareUrl = vi.fn(async (onCopied: () => void) => { onCopied(); });
        render(<DetailDrawer viewModel={createDrawerViewModel()} ready copyShareUrl={copyShareUrl} />);
        fireEvent.click(screen.getByRole('button', { name: 'URLをコピーして共有' }));
        await vi.waitFor(() => expect(document.querySelector('#detail-drawer-share-btn i')?.className).toContain('fa-check'));
    });
});

describe('SeaRouteDrawerBody', () => {
    it('航路ズーム操作をデータ属性付きボタンとして描画し、クリックで登録済みアクションを実行する', () => {
        const zoomRoute = vi.fn();
        const zoomSection = vi.fn();
        const unregister = [registerDrawerAction('zoom-route', zoomRoute), registerDrawerAction('zoom-route-section', zoomSection)];
        render(
            <SeaRouteDrawerBody
                properties={{ routeId: 'route-1', lineId: 'line-2', routeName: '本線', portName1: '出発港', portName2: '到着港', car: '1', bike: '1', bicycle: '0' }}
                details={{ url: 'https://example.com/timetable', shipName: 'A丸, B丸' }}
                sourceId="geojson_sea_route"
            />,
        );

        const routeButton = document.querySelector('[data-drawer-action="zoom-route"]') as HTMLElement;
        const sectionButton = document.querySelector('[data-drawer-action="zoom-route-section"]') as HTMLElement;
        expect(routeButton.dataset).toMatchObject({ routeId: 'route-1', sourceId: 'geojson_sea_route' });
        expect(sectionButton.dataset).toMatchObject({ routeId: 'route-1', lineId: 'line-2', sourceId: 'geojson_sea_route' });
        expect(sectionButton.textContent).toBe('出発港～到着港');
        expect(document.querySelectorAll('.text-left')).toHaveLength(2);
        expect(screen.getByText('運行スケジュール - example.com')).toBeTruthy();
        expect(screen.getByText('・A丸')).toBeTruthy();
        expect(screen.getByText('自動車').parentElement?.textContent).toBe('自動車・バイク');

        fireEvent.click(routeButton);
        fireEvent.click(sectionButton);
        expect(zoomRoute).toHaveBeenCalledWith({ routeId: 'route-1', sourceId: 'geojson_sea_route' });
        expect(zoomSection).toHaveBeenCalledWith({ routeId: 'route-1', lineId: 'line-2', sourceId: 'geojson_sea_route' });
        unregister.forEach((dispose) => dispose());
    });

    it('HTML風の文字列を要素化しない', () => {
        render(<SeaRouteDrawerBody properties={{ routeName: '<img src=x onerror=alert(1)>' }} />);
        expect(document.querySelector('img')).toBeNull();
        expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    });
});

describe('drawer close handlers', () => {
    it('コントローラーの hide は登録済みの閉じる処理を実行する', () => {
        const handler = vi.fn();
        const unregister = registerDrawerCloseHandler(handler);
        const elements = createElements();
        const controller = createDetailDrawerController(elements, { windowRef: createWindowStub() as unknown as Window });
        controller.hide();
        expect(handler).toHaveBeenCalledOnce();
        controller.dispose();
        unregister();
    });
});
