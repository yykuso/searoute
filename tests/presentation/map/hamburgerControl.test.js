import { afterEach, describe, expect, it, vi } from 'vitest';
import hamburgerControl from '../../../js/presentation/map/hamburgerControl.js';
import { setupOutsideClickListener } from '../../../js/presentation/outsideClickHandler.js';

vi.mock('../../../js/presentation/outsideClickHandler.js', () => ({
    setupOutsideClickListener: vi.fn(),
}));

function createElement() {
    return {
        style: {},
        className: '',
        id: '',
        innerHTML: '',
        childNodes: [],
        appendChild(child) {
            this.childNodes.push(child);
            return child;
        },
        addEventListener: vi.fn(),
    };
}

describe('hamburgerControl', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('サイト情報表示時にハンバーガーパネルを閉じる', () => {
        let outsideCloseHandler;
        setupOutsideClickListener.mockImplementation((target, onClose) => {
            outsideCloseHandler = onClose;
            return vi.fn();
        });

        const control = new hamburgerControl();
        control.menuPanel = { style: { display: 'block' } };
        control.infoWindow = { style: { display: 'none' }, scrollTop: 240 };
        const event = { preventDefault: vi.fn() };

        control.showInfoWindow(event);

        expect(event.preventDefault).toHaveBeenCalledOnce();
        expect(control.menuPanel.style.display).toBe('none');
        expect(control.infoWindow.style.display).toBe('block');
        expect(control.infoWindow.scrollTop).toBe(0);

        outsideCloseHandler();

        expect(control.infoWindow.style.display).toBe('none');
        expect(control.menuPanel.style.display).toBe('none');
    });

    it('情報ウィンドウの閉じるボタンでメニュー状態も閉じる', () => {
        const closeButton = { onclick: null };
        const infoWindow = {
            style: { display: 'none' },
            querySelector: vi.fn(() => closeButton),
        };
        const documentRef = {
            createElement: vi.fn(() => createElement()),
            getElementById: vi.fn(() => infoWindow),
        };
        vi.stubGlobal('document', documentRef);

        const control = new hamburgerControl();
        control.addHamburgerControl();
        control.menuPanel.style.display = 'block';

        closeButton.onclick();

        expect(control.menuPanel.style.display).toBe('none');
        expect(control.infoWindow.style.display).toBe('none');
    });
});
