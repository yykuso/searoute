// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMapRouteFilterViewModel } from '../../../src/application/viewModels/routeFilterViewModel';
import { RouteFilterControl } from '../../../src/presentation/map/RouteFilterControl';

afterEach(cleanup);

function setup(cookies: Record<string, string> = {}) {
    const container = document.createElement('div');
    container.id = 'route-filter-control';
    document.body.append(container);
    const settings = { get: vi.fn((name: string) => cookies[name] ?? null), set: vi.fn() };
    const applyToMap = vi.fn();
    const viewModel = createMapRouteFilterViewModel({ settings, applyToMap });
    render(<RouteFilterControl container={container} viewModel={viewModel} />);
    const input = (key: string) => container.querySelector(`[data-route-filter-key="${key}"]`) as HTMLInputElement;
    return { container, settings, applyToMap, input };
}

describe('RouteFilterControl', () => {
    it('既定値で初期化して地図へ適用・保存し、トグルは強調しない', () => {
        const { settings, applyToMap, input } = setup();
        expect(input('active').checked).toBe(true);
        expect(input('season').checked).toBe(true);
        expect(input('suspend').checked).toBe(false);
        expect(applyToMap).toHaveBeenCalled();
        expect(settings.set).toHaveBeenCalledWith('routeFilters', expect.any(String), 365);
        expect(screen.getByRole('button', { name: '航路フィルタ' }).classList.contains('route-filter-active')).toBe(false);
    });

    it('変更を地図・Cookie に反映し、既定値以外ならトグルを強調する', () => {
        const { settings, input } = setup();
        fireEvent.click(input('suspend'));
        expect(input('suspend').checked).toBe(true);
        expect(settings.set).toHaveBeenLastCalledWith('showSuspendedRoutes', 'true', 365);
        const saved = settings.set.mock.calls.filter(([name]) => name === 'routeFilters').pop()?.[1] as string;
        expect(JSON.parse(decodeURIComponent(saved))).toEqual({
            status: { active: true, season: true, suspend: true },
            carriage: { car: false, bike: false, bicycle: false },
        });
        expect(screen.getByRole('button', { name: '航路フィルタ' }).classList.contains('route-filter-active')).toBe(true);
    });

    it('Cookie（旧キー routeFilterMode を含む）から状態を復元する', () => {
        const { input } = setup({ routeFilterMode: 'car' });
        expect(input('car').checked).toBe(true);
    });

    it('ラベルのクリックでも切り替わる', () => {
        const { input } = setup();
        fireEvent.click(screen.getByText('自転車'));
        expect(input('bicycle').checked).toBe(true);
    });
});
