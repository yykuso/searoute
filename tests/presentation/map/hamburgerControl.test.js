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

    it('情報ウィンドウの初期化時に閉じるボタンの責務を持たない', () => {
        const infoWindow = {
            style: { display: 'none' },
            addEventListener: vi.fn(),
        };
        const documentRef = {
            createElement: vi.fn(() => createElement()),
            getElementById: vi.fn(() => infoWindow),
        };
        vi.stubGlobal('document', documentRef);

        const control = new hamburgerControl();
        control.addHamburgerControl();

        expect(control.infoWindow).toBe(infoWindow);
        expect(infoWindow.addEventListener).toHaveBeenCalledWith('modalclose', expect.any(Function));
    });
});
