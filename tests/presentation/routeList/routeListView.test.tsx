// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRouteListViewModel } from '../../../src/application/viewModels/routeListViewModel';
import type { RouteRow } from '../../../src/domain/route';
import { buildRouteMapUrl, RouteListPage } from '../../../src/presentation/routeList/RouteListPage';

afterEach(cleanup);

const locationRef = { href: 'https://searoute.info/routeList.html' };

async function renderPage(rowsByPath: Record<string, RouteRow[]>) {
    const viewModel = createRouteListViewModel({
        tables: [
            { dataPath: 'domestic', selector: '.sea-route-table tbody', sourceId: 'geojson_sea_route' },
            { dataPath: 'international', selector: '.international-sea-route-table tbody', sourceId: 'geojson_international_sea_route' },
        ],
        repository: { loadRouteRows: async (path) => rowsByPath[path] ?? [] },
    });
    render(<RouteListPage viewModel={viewModel} locationRef={locationRef} />);
    await act(() => viewModel.initialize());
    return viewModel;
}

const domesticRows = () => Array.from(document.querySelectorAll<HTMLTableRowElement>('.sea-route-table tbody tr'));

describe('buildRouteMapUrl', () => {
    it('共有パラメータ付きの index.html URL を生成する', () => {
        expect(buildRouteMapUrl('2', 'geojson_sea_route', { locationRef })).toBe('https://searoute.info/index.html?share=route&routeId=2&sourceId=geojson_sea_route');
    });
});

describe('RouteListPage', () => {
    it('可視列のみのセルを描画し、季節運航行にクラスを付け、空の列見出しを隠す', async () => {
        await renderPage({ domestic: [{ routeId: '2', businessName: 'A', routeName: 'Route A', note: 'season', url: 'https://example.com' }] });

        const [row] = domesticRows();
        expect(row.classList.contains('season-row')).toBe(true);
        expect(row.querySelectorAll('td')).toHaveLength(4);
        expect(screen.getByRole('link', { name: 'Route A' }).getAttribute('href')).toBe('https://searoute.info/index.html?share=route&routeId=2&sourceId=geojson_sea_route');
        expect(screen.getByRole('link', { name: 'リンク' }).getAttribute('target')).toBe('_blank');
        const table = document.querySelector('.sea-route-table') as HTMLElement;
        expect((table.querySelector('th.ship-name') as HTMLElement).style.display).toBe('none');
        expect((table.querySelector('th.route-id') as HTMLElement).style.display).toBe('');
        expect((document.querySelector('.international-sea-route-table th.information') as HTMLElement).style.display).toBe('none');
    });

    it('一致しない行を非表示にしてマッチ箇所をハイライトする', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }, { routeId: '2', routeName: 'Island Line' }] });

        fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'ocean' } });
        fireEvent.click(screen.getByRole('button', { name: '検索' }));

        const [matchRow, noMatchRow] = domesticRows();
        expect(matchRow.querySelector('.route-search-highlight')?.textContent).toBe('Ocean');
        expect(matchRow.querySelector('a .route-search-highlight')).not.toBeNull();
        expect(matchRow.style.display).toBe('');
        expect(noMatchRow.style.display).toBe('none');
        expect(document.getElementById('search-message')?.textContent).toBe('');
    });

    it('一致する行がない場合はメッセージを表示する', async () => {
        await renderPage({ domestic: [{ routeId: '2', routeName: 'Island Line' }] });
        fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'Ocean' } });
        fireEvent.click(screen.getByRole('button', { name: '検索' }));
        expect(document.getElementById('search-message')?.textContent).toBe('見つかりませんでした。');
    });

    it('HTML風の文字列を要素化せず、リンク構造を維持する', async () => {
        await renderPage({ domestic: [{ routeId: '2', routeName: '<img src=x onerror=alert(1)> Ocean' }] });
        fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'img' } });
        fireEvent.click(screen.getByRole('button', { name: '検索' }));

        const cell = domesticRows()[0].querySelectorAll('td')[2];
        expect(cell.querySelector('img')).toBeNull();
        expect(cell.querySelector('a')).not.toBeNull();
        expect(cell.querySelector('.route-search-highlight')?.textContent).toBe('img');
    });

    it('リセットで検索ボックス・ハイライト・非表示行をすべて元に戻す', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }, { routeId: '2', routeName: 'Island Line' }] });
        const searchBox = screen.getByPlaceholderText('検索キーワードを入力') as HTMLInputElement;
        fireEvent.change(searchBox, { target: { value: 'zzz' } });
        fireEvent.click(screen.getByRole('button', { name: '検索' }));
        fireEvent.click(screen.getByRole('button', { name: 'リセット' }));

        expect(searchBox.value).toBe('');
        expect(domesticRows().every((row) => row.style.display === '')).toBe(true);
        expect(document.querySelector('.route-search-highlight')).toBeNull();
        expect(domesticRows()[0].textContent).toContain('Ocean Route');
        expect(document.getElementById('search-message')?.textContent).toBe('');
    });
});
