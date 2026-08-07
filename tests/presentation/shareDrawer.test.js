import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreDrawerFromUrl } from '../../js/presentation/shareDrawer.js';

describe('restoreDrawerFromUrl', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('共有種別に対応する自身のハンドラを実行する', async () => {
        const route = vi.fn(async () => true);
        const replaceState = vi.fn();
        vi.stubGlobal('location', {
            search: '?share=route&routeId=42&sourceId=geojson_sea_route',
            pathname: '/index.html',
        });
        vi.stubGlobal('history', { replaceState });

        await restoreDrawerFromUrl({ route });

        expect(route).toHaveBeenCalledWith('42', 'geojson_sea_route');
        expect(replaceState).toHaveBeenCalledWith(null, '', '/index.html');
    });

    it('継承したハンドラは実行しない', async () => {
        const inheritedRoute = vi.fn(async () => true);
        const handlers = Object.create({ route: inheritedRoute });
        const replaceState = vi.fn();
        vi.stubGlobal('location', {
            search: '?share=route&routeId=42&sourceId=geojson_sea_route',
            pathname: '/index.html',
        });
        vi.stubGlobal('history', { replaceState });

        await restoreDrawerFromUrl(handlers);

        expect(inheritedRoute).not.toHaveBeenCalled();
        expect(replaceState).not.toHaveBeenCalled();
    });

    it('自身のプロパティでも関数でなければ実行しない', async () => {
        const replaceState = vi.fn();
        vi.stubGlobal('location', {
            search: '?share=route&routeId=42&sourceId=geojson_sea_route',
            pathname: '/index.html',
        });
        vi.stubGlobal('history', { replaceState });

        await expect(restoreDrawerFromUrl({ route: 'invalid' })).resolves.toBeUndefined();

        expect(replaceState).not.toHaveBeenCalled();
    });
});