import { describe, expect, it } from 'vitest';
import { calculateFitBoundsPadding } from '../../../js/presentation/map/fitBoundsPadding.js';

const DEFAULT = { top: 50, left: 50, right: 50, bottom: 50 };

describe('calculateFitBoundsPadding', () => {
    it('ドロワーが非表示の場合はデフォルトパディングを返す', () => {
        const drawer = { classList: { contains: () => true } };
        const documentRef = { getElementById: () => drawer };
        const result = calculateFitBoundsPadding({ documentRef });
        expect(result).toEqual(DEFAULT);
    });

    it('PC幅でドロワーが表示されている場合は left をドロワー幅+30 にする', () => {
        const drawer = { classList: { contains: () => false } };
        const documentRef = { getElementById: () => drawer };
        const windowRef = { innerWidth: 1024 };
        const result = calculateFitBoundsPadding({ documentRef, windowRef, drawerWidth: 320 });
        expect(result.left).toBe(350);
        expect(result.bottom).toBe(50);
    });

    it('モバイル幅でドロワーが表示されている場合は bottom をドロワー高さ+30 にする', () => {
        const drawer = { classList: { contains: () => false } };
        const documentRef = { getElementById: () => drawer };
        const windowRef = { innerWidth: 375 };
        const result = calculateFitBoundsPadding({ documentRef, windowRef, drawerHeight: 200 });
        expect(result.bottom).toBe(230);
        expect(result.left).toBe(50);
    });

    it('ドロワー要素が存在しない場合はデフォルトパディングを返す', () => {
        const documentRef = { getElementById: () => null };
        const result = calculateFitBoundsPadding({ documentRef });
        expect(result).toEqual(DEFAULT);
    });
});
