import { describe, expect, it } from 'vitest';
import { createLoadingIndicator } from '../../js/presentation/loadingIndicator.js';

describe('loadingIndicator', () => {
    it('並行処理がすべて終わるまで表示を維持する', () => {
        const element = { style: { display: 'none' } };
        const indicator = createLoadingIndicator({
            documentRef: { getElementById: () => element },
        });

        indicator.show();
        indicator.show();
        expect(element.style.display).toBe('block');

        indicator.hide();
        expect(element.style.display).toBe('block');

        indicator.hide();
        expect(element.style.display).toBe('none');
    });

    it('表示要素が存在しなくてもエラーにしない', () => {
        const indicator = createLoadingIndicator({
            documentRef: { getElementById: () => null },
        });

        expect(() => {
            indicator.show();
            indicator.hide();
        }).not.toThrow();
    });
});