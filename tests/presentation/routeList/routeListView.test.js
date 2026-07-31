import { describe, expect, it, vi } from 'vitest';
import {
    applyColumnVisibility,
    buildRouteMapUrl,
    renderRouteRows,
    resetRoutesInDocument,
    searchRoutesInDocument,
} from '../../../js/presentation/routeList/routeListView.js';

function createCell({ text = '', attrs = {} } = {}) {
    const attributes = { ...attrs };
    return {
        textContent: text,
        innerHTML: text,
        style: {},
        getAttribute: vi.fn((name) => attributes[name] ?? null),
        setAttribute: vi.fn((name, value) => { attributes[name] = value; }),
        removeAttribute: vi.fn((name) => { delete attributes[name]; }),
    };
}

function createRow(cells) {
    return {
        style: {},
        querySelectorAll: () => cells,
    };
}

function createDocumentStub({ rows = [], searchMessage = null, searchBox = null } = {}) {
    const elements = { 'search-message': searchMessage, searchbox: searchBox };
    return {
        getElementById: (id) => elements[id] ?? null,
        querySelectorAll: () => rows,
    };
}

describe('buildRouteMapUrl', () => {
    it('共有パラメータ付きの index.html URL を生成する', () => {
        const url = buildRouteMapUrl('2', 'geojson_sea_route', {
            locationRef: { href: 'https://searoute.info/routeList.html' },
        });

        expect(url).toBe('https://searoute.info/index.html?share=route&routeId=2&sourceId=geojson_sea_route');
    });
});

describe('applyColumnVisibility', () => {
    it('非表示にする列のセルに display:none を設定する', () => {
        const shipNameCell = { style: {} };
        const routeIdCell = { style: {} };
        const table = {
            querySelectorAll: vi.fn((selector) => {
                if (selector === '.ship-name') return [shipNameCell];
                if (selector === '.route-id') return [routeIdCell];
                return [];
            }),
        };
        const tableBody = { closest: () => table };

        applyColumnVisibility(tableBody, ['routeId', 'businessName', 'routeName']);

        expect(routeIdCell.style.display).toBe('');
        expect(shipNameCell.style.display).toBe('none');
    });
});

describe('renderRouteRows', () => {
    it('可視列のみのセルを持つ行を tbody に追加する', () => {
        const created = [];
        const documentRef = {
            createElement: vi.fn((tag) => {
                const el = {
                    tag,
                    classList: { add: vi.fn() },
                    children: [],
                    appendChild(child) { this.children.push(child); },
                };
                created.push(el);
                return el;
            }),
        };
        const tableBody = { appendChild: vi.fn() };

        renderRouteRows(
            tableBody,
            [{ routeId: '2', routeName: 'Route A', note: 'season' }],
            ['routeId', 'routeName'],
            'geojson_sea_route',
            { documentRef, locationRef: { href: 'https://searoute.info/routeList.html' } },
        );

        expect(tableBody.appendChild).toHaveBeenCalledTimes(1);
        const row = tableBody.appendChild.mock.calls[0][0];
        expect(row.classList.add).toHaveBeenCalledWith('season-row');
        expect(row.children).toHaveLength(2);
    });
});

describe('searchRoutesInDocument', () => {
    it('クエリが空の場合はメッセージのみクリアする', () => {
        const searchMessage = { textContent: '前回の結果' };
        const documentRef = createDocumentStub({ searchMessage });

        searchRoutesInDocument(documentRef, '');

        expect(searchMessage.textContent).toBe('');
    });

    it('一致しない行を非表示にしてマッチ箇所をハイライトする', () => {
        const matchCell = createCell({ text: 'Ocean Route' });
        const noMatchCell = createCell({ text: 'Island Line' });
        const matchRow = createRow([matchCell]);
        const noMatchRow = createRow([noMatchCell]);
        const searchMessage = { textContent: '' };
        const documentRef = createDocumentStub({ rows: [matchRow, noMatchRow], searchMessage });

        searchRoutesInDocument(documentRef, 'Ocean');

        expect(matchCell.setAttribute).toHaveBeenCalledWith('data-original-text', 'Ocean Route');
        expect(matchCell.innerHTML).toContain('background-color: #ffe46f');
        expect(noMatchRow.style.display).toBe('none');
        expect(matchRow.style.display).toBe('');
        expect(searchMessage.textContent).toBe('');
    });

    it('一致する行がない場合はメッセージを表示する', () => {
        const noMatchCell = createCell({ text: 'Island Line' });
        const noMatchRow = createRow([noMatchCell]);
        const searchMessage = { textContent: '' };
        const documentRef = createDocumentStub({ rows: [noMatchRow], searchMessage });

        searchRoutesInDocument(documentRef, 'Ocean');

        expect(searchMessage.textContent).toBe('見つかりませんでした。');
    });
});

describe('resetRoutesInDocument', () => {
    it('検索ボックス・ハイライト・非表示行をすべて元に戻す', () => {
        const cell = createCell({ text: '', attrs: { 'data-original-text': 'Ocean Route' } });
        const row = createRow([cell]);
        row.style.display = 'none';
        const searchBox = { value: 'Ocean' };
        const searchMessage = { textContent: '見つかりませんでした。' };
        const documentRef = createDocumentStub({ rows: [row], searchBox, searchMessage });

        resetRoutesInDocument(documentRef);

        expect(searchBox.value).toBe('');
        expect(row.style.display).toBe('');
        expect(cell.innerHTML).toBe('Ocean Route');
        expect(cell.removeAttribute).toHaveBeenCalledWith('data-original-text');
        expect(searchMessage.textContent).toBe('');
    });
});
