// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../../../src/presentation/common/Icon';

afterEach(() => cleanup());

describe('Icon', () => {
    it('旧版と同じ class の <i> に、グリフ幅を指定した SVG を描画する', () => {
        const { container } = render(<Icon className="fa-solid fa-xmark fa-lg" />);
        const icon = container.querySelector('i');
        expect(icon?.className).toBe('fa-solid fa-xmark fa-lg');
        expect(icon?.style.getPropertyValue('--fa-w')).toBe('0.75em');
        const svg = icon?.querySelector('svg');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 384 512');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.querySelector('path')?.getAttribute('d')).toMatch(/^M/);
    });

    it('旧名の別名（fa-info-circle 等）とブランドアイコンを解決する', () => {
        const { container } = render(<><Icon className="fas fa-info-circle fa-fw" /><Icon className="fa-brands fa-github" /></>);
        const [info, github] = container.querySelectorAll('svg');
        expect(info.getAttribute('viewBox')).toBe('0 0 512 512');
        expect(github.getAttribute('viewBox')).toBe('0 0 512 512');
    });

    it('未登録のアイコンは警告して空の <i> を描画する（画面は落とさない）', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { container } = render(<Icon className="fa-solid fa-unknown" />);
        expect(container.querySelector('i')?.className).toBe('fa-solid fa-unknown');
        expect(container.querySelector('svg')).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('未登録のアイコン'));
        warn.mockRestore();
    });
});
