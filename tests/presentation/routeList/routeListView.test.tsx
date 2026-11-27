// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRouteListViewModel } from '../../../src/application/viewModels/routeListViewModel';
import type { RouteRow } from '../../../src/domain/route';
import { RouteListPage } from '../../../src/presentation/routeList/RouteListPage';

afterEach(cleanup);

async function renderPage(rowsByPath: Record<string, RouteRow[]>) {
    const viewModel = createRouteListViewModel({
        tables: [
            { dataPath: 'domestic', selector: '.sea-route-table tbody', sourceId: 'geojson_sea_route' },
            { dataPath: 'international', selector: '.international-sea-route-table tbody', sourceId: 'geojson_international_sea_route' },
        ],
        repository: { loadRouteRows: async (path) => rowsByPath[path] ?? [] },
    });
    render(<RouteListPage viewModel={viewModel} />);
    await act(() => viewModel.initialize());
    return viewModel;
}

const domesticRows = () => Array.from(document.querySelectorAll<HTMLTableRowElement>('.sea-route-table tbody tr'));

describe('RouteListPage', () => {
    it('可視列のみのセルを描画し、季節運航行にクラスを付け、空の列見出しを隠す', async () => {
        await renderPage({ domestic: [{ routeId: '2', businessName: 'A', routeName: 'Route A', note: 'season', url: 'https://example.com' }] });

        const [row] = domesticRows();
        expect(row.classList.contains('season-row')).toBe(true);
        expect(row.querySelectorAll('td')).toHaveLength(4);
        const routeLink = screen.getByRole('link', { name: 'Route A' });
        expect(routeLink.getAttribute('href')).toBe('/route/2/');
        expect(routeLink.getAttribute('target')).toBeNull();
        expect(screen.getByRole('link', { name: 'リンク' }).getAttribute('target')).toBe('_blank');
        const table = document.querySelector('.sea-route-table') as HTMLElement;
        expect((table.querySelector('th.ship-name') as HTMLElement).style.display).toBe('none');
        expect((table.querySelector('th.route-id') as HTMLElement).style.display).toBe('');
        expect((document.querySelector('.international-sea-route-table th.information') as HTMLElement).style.display).toBe('none');
    });

    it('一致しない行を非表示にしてマッチ箇所をハイライトする', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }, { routeId: '2', routeName: 'Island Line' }] });

        fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'ocean' } });

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
        expect(document.getElementById('search-message')?.textContent).toBe('見つかりませんでした。');
    });

    it('HTML風の文字列を要素化せず、リンク構造を維持する', async () => {
        await renderPage({ domestic: [{ routeId: '2', routeName: '<img src=x onerror=alert(1)> Ocean' }] });
        fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'img' } });

        const cell = domesticRows()[0].querySelectorAll('td')[2];
        expect(cell.querySelector('img')).toBeNull();
        expect(cell.querySelector('a')).not.toBeNull();
        expect(cell.querySelector('.route-search-highlight')?.textContent).toBe('img');
    });

    it('入力するたびに絞り込み、件数を表示する', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }, { routeId: '2', routeName: 'Island Line' }] });
        fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'ocean' } });
        const [matchRow, noMatchRow] = domesticRows();
        expect(matchRow.style.display).toBe('');
        expect(noMatchRow.style.display).toBe('none');
        expect(screen.getByText('1件')).toBeTruthy();
    });

    it('日本語入力の変換中は絞り込まず、確定時に絞り込む', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: '大阪航路' }, { routeId: '2', routeName: '別府航路' }] });
        const box = screen.getByPlaceholderText('検索キーワードを入力');
        fireEvent.compositionStart(box);
        fireEvent.change(box, { target: { value: 'おおさか' } });
        expect(domesticRows().every((row) => row.style.display === '')).toBe(true);
        fireEvent.change(box, { target: { value: '大阪' } });
        fireEvent.compositionEnd(box);
        expect(domesticRows()[1].style.display).toBe('none');
    });

    it('✕で検索語・ハイライト・非表示行を元に戻す', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }, { routeId: '2', routeName: 'Island Line' }] });
        const searchBox = screen.getByPlaceholderText('検索キーワードを入力') as HTMLInputElement;
        fireEvent.change(searchBox, { target: { value: 'zzz' } });
        fireEvent.click(screen.getByRole('button', { name: '検索語を消去' }));

        expect(searchBox.value).toBe('');
        expect(domesticRows().every((row) => row.style.display === '')).toBe(true);
        expect(document.querySelector('.route-search-highlight')).toBeNull();
        expect(domesticRows()[0].textContent).toContain('Ocean Route');
        expect(document.getElementById('search-message')?.textContent).toBe('');
    });

    it('✕で消去したあと検索欄にフォーカスが戻る', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }] });
        const searchBox = screen.getByPlaceholderText('検索キーワードを入力');
        fireEvent.change(searchBox, { target: { value: 'zzz' } });
        fireEvent.click(screen.getByRole('button', { name: '検索語を消去' }));
        expect(document.activeElement).toBe(searchBox);
    });

    it('検索語が空のとき✕ボタンを出さない', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }] });
        expect(screen.queryByRole('button', { name: '検索語を消去' })).toBeNull();
    });

    it('Enterでフォーム送信しない', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }] });
        const form = screen.getByPlaceholderText('検索キーワードを入力').closest('form') as HTMLFormElement;
        expect(fireEvent.submit(form)).toBe(false);
    });

    it('データのある表だけジャンプ用チップを件数付きで出す', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'A' }, { routeId: '2', routeName: 'B' }] });
        const nav = screen.getByRole('navigation', { name: '航路の種類' });
        const link = within(nav).getByRole('link', { name: /国内/ });
        expect(link.getAttribute('href')).toBe('#domestic');
        expect(link.textContent).toContain('2');
        expect(within(nav).queryByRole('link', { name: /国際/ })).toBeNull();
        expect(document.getElementById('domestic')?.tagName).toBe('H2');
    });

    it('データが無いときはジャンプ用ナビを出さない', async () => {
        await renderPage({});
        expect(screen.queryByRole('navigation', { name: '航路の種類' })).toBeNull();
    });

    it('季節運航・運休の凡例を1か所に出す', async () => {
        await renderPage({ domestic: [{ routeId: '1', routeName: 'A' }] });
        const legend = document.querySelectorAll('.route-legend');
        expect(legend).toHaveLength(1);
        expect(legend[0].textContent).toContain('季節運航');
        expect(legend[0].textContent).toContain('運休');
    });

    it('セルに列名のラベルを付け、空セルに印を付ける', async () => {
        await renderPage({ domestic: [{ routeId: '2', businessName: 'A', routeName: 'Route A', url: '' }] });
        const cells = domesticRows()[0].querySelectorAll('td');
        expect(cells[1].dataset.label).toBe('事業者名');
        expect(cells[2].dataset.column).toBe('routeName');
    });

    it('値が「-」のセルにだけ data-empty を付ける', async () => {
        // 可視列判定で列ごと消えないよう、同じ表に船名のある行を並べる
        await renderPage({ domestic: [
            { routeId: '1', businessName: 'A', routeName: 'Route A', shipName: 'Ship A' },
            { routeId: '2', businessName: 'B', routeName: 'Route B' },
        ] });
        const [filled, empty] = domesticRows().map((row) => row.querySelector<HTMLElement>('td[data-column="shipName"]'));
        expect(filled?.dataset.empty).toBeUndefined();
        expect(empty?.textContent).toBe('-');
        expect(empty?.dataset.empty).toBe('true');
        expect(empty?.dataset.label).toBe('船名');
    });

    it('ヘッダーの「航路一覧」を現在地にする', async () => {
        await renderPage({});
        expect(screen.getByRole('link', { name: '航路一覧' }).getAttribute('aria-current')).toBe('page');
    });
});
