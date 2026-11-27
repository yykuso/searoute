import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RouteTableState } from '../../src/application/viewModels/routeListViewModel';
import { loadPrerenderRouteTables, renderPages } from '../../src/entrypoints/prerender';
import { ROUTE_LIST_TABLE_CONFIGS } from '../../src/entrypoints/routeListServices';

// 旧版（develop ブランチの Vanilla JS 版）の HTML。body の静的マークアップをプリレンダリング結果と比較する
const fixtureDir = fileURLToPath(new URL('../fixtures/legacy/', import.meta.url));
const BUILD_NUMBER = 'abc1234';

function legacyBody(fileName: string): Document {
    const { document } = new JSDOM(readFileSync(`${fixtureDir}${fileName}`, 'utf8')).window;
    document.querySelectorAll('script, noscript').forEach((element) => element.remove());
    return document;
}

function prerendered(fileName: string): Document {
    const html = renderPages(BUILD_NUMBER)[fileName].app;
    return new JSDOM(`<!DOCTYPE html><body><div id="app">${html}</div></body>`).window.document;
}

/** 表示上の差が出ない空白を無視して比較する */
const compact = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');

/** サイト内リンクは .html なし（Cloudflare Pages の正規形）に変えたので、旧版の href を同じ形に読み替える */
function normalizeLegacyLinks(document: Document): Document {
    document.querySelectorAll('a[href]').forEach((element) => {
        const href = element.getAttribute('href') ?? '';
        element.setAttribute('href', href.replace(/^\.\/routeList\.html$/, './routeList').replace(/^(\.\/)?index\.html(?=\?|$)/, './'));
    });
    return document;
}

function collect(document: Document) {
    const root = document.body;
    return {
        ids: [...root.querySelectorAll('[id]')].map((element) => element.id).filter((id) => id !== 'app'),
        headings: [...root.querySelectorAll('h1, h2, h3')].map((element) => `${element.tagName}:${compact(element.textContent)}`),
        links: [...root.querySelectorAll('a[href]')].map((element) => `${element.getAttribute('href')}|${element.getAttribute('target') ?? ''}|${element.getAttribute('rel') ?? ''}`),
        buttons: [...root.querySelectorAll('button')].map((element) => `${element.id}|${element.getAttribute('aria-label') ?? ''}|${compact(element.textContent)}`),
        text: compact(root.textContent),
    };
}

describe('プリレンダリング結果は旧版の静的 body と同等', () => {
    it('index.html: 同じ ID・見出し・リンク・ボタン・テキストを持つ（ビルド番号以外）', () => {
        const legacy = collect(normalizeLegacyLinks(legacyBody('index.html')));
        const current = collect(prerendered('index.html'));

        expect(current.ids).toEqual(legacy.ids);
        expect(current.headings).toEqual(legacy.headings);
        expect(current.links).toEqual(legacy.links);
        expect(current.buttons).toEqual(legacy.buttons);
        expect(current.text).toBe(legacy.text.replace('(local)', `(${BUILD_NUMBER})`));
    });

    it('index.html: 主要要素の属性（クラス・ARIA・初期非表示）を保つ', () => {
        const legacy = legacyBody('index.html');
        const current = prerendered('index.html');
        for (const id of ['info-window', 'privacy-policy-window', 'detail-drawer', 'detail-drawer-content', 'context-menu', 'cookie-banner', 'detail-drawer-title', 'sidebar-grip']) {
            const before = legacy.getElementById(id) as HTMLElement;
            const after = current.getElementById(id) as HTMLElement;
            expect(after.className, id).toBe(before.className);
            for (const attribute of ['role', 'aria-label', 'aria-modal', 'aria-labelledby', 'tabindex']) {
                expect(after.getAttribute(attribute), `${id} ${attribute}`).toBe(before.getAttribute(attribute));
            }
        }
        // 初期状態で非表示のもの（Cookie バナーは head のスクリプトと CSS で表示を決める）
        for (const id of ['info-window', 'privacy-policy-window', 'detail-drawer', 'context-menu']) {
            expect((current.getElementById(id) as HTMLElement).style.display, id).toBe('none');
        }
        expect(current.getElementById('site-build-number')?.textContent).toBe(BUILD_NUMBER);
    });

    it('routeList.html: ヘッダー・検索 UI・説明文・テーブル見出しが同じ（SEO 用に変えた h1 と導入文を除く）', () => {
        const legacyDocument = normalizeLegacyLinks(legacyBody('routeList.html'));
        // 検索・リセットボタンは入力即時の絞り込みに変えて廃止したので、旧版から取り除いて比較する
        legacyDocument.querySelectorAll('#searchbutton, #resetbutton').forEach((button) => button.remove());
        const legacy = collect(legacyDocument);
        const seoDocument = prerendered('routeList.html');
        // h1 の文言と導入文（.route-list-intro）は SEO 改善で意図的に変えたので、旧版の形に戻して比較する
        seoDocument.querySelector('.route-list-intro')?.remove();
        const h1 = seoDocument.querySelector('h1');
        if (h1) h1.textContent = '航路一覧';
        const current = collect(seoDocument);

        expect(current.ids).toEqual(legacy.ids);
        expect(current.headings).toEqual(legacy.headings);
        expect(current.links).toEqual(legacy.links);
        expect(current.buttons).toEqual(legacy.buttons);
        expect(current.text).toBe(legacy.text);

        const legacyTableDocument = legacyBody('routeList.html');
        const currentDocument = prerendered('routeList.html');
        const tableHeaders = (document: Document) => [...document.querySelectorAll('table')].map((table) => (
            `${table.className}:${[...table.querySelectorAll('th')].map((th) => th.className).join(',')}`
        ));
        expect(tableHeaders(currentDocument)).toEqual(tableHeaders(legacyTableDocument));
        expect(currentDocument.getElementById('searchbox')?.getAttribute('placeholder')).toBe('検索キーワードを入力');
    });
});

describe('航路データ付きプリレンダリング', () => {
    const tables: RouteTableState[] = [{
        selector: '.sea-route-table tbody',
        sourceId: 'geojson_sea_route',
        rows: [{ routeId: '2', businessName: 'ハートランドフェリー', routeName: '稚内～利尻' }],
        visibleColumns: ['routeId', 'businessName', 'routeName'],
    }];

    it('routeList.html に航路名・スナップショット・JSON-LD が入る', () => {
        const page = renderPages(BUILD_NUMBER, tables)['routeList.html'];
        expect(page.app).toContain('稚内～利尻');
        expect(page.bodyEnd).toContain('id="route-list-data"');
        expect(page.head).toContain('ItemList');
    });

    it('routeList.html の h1 と導入文に検索語と掲載航路数が入る', () => {
        const page = renderPages(BUILD_NUMBER, tables)['routeList.html'];
        const document = new JSDOM(`<!DOCTYPE html><body>${page.app}</body>`).window.document;
        expect(document.querySelector('h1')?.textContent).toBe('フェリー・旅客船 航路一覧');
        const intro = document.querySelector('.route-list-intro')?.textContent ?? '';
        expect(intro).toContain('フェリー・旅客船・高速船');
        expect(intro).toContain('掲載航路数：国内航路 1件。');
    });

    it('データが空なら掲載航路数を出さない', () => {
        const page = renderPages(BUILD_NUMBER, [])['routeList.html'];
        expect(page.app).not.toContain('掲載航路数');
    });

    it('データが空なら head / bodyEnd を付けない', () => {
        const page = renderPages(BUILD_NUMBER, [])['routeList.html'];
        expect(page.head).toBeUndefined();
        expect(page.bodyEnd).toBeUndefined();
    });
});

describe('loadPrerenderRouteTables', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('全テーブルの dataPath を ?v= 付き・タイムアウト付きで取得する', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ routeId: '1', businessName: 'B', routeName: 'R' }])));
        vi.stubGlobal('fetch', fetchMock);
        const tables = await loadPrerenderRouteTables();
        expect(tables).toHaveLength(ROUTE_LIST_TABLE_CONFIGS.length);
        const calls = fetchMock.mock.calls as unknown as [string, RequestInit | undefined][];
        expect(calls).toHaveLength(ROUTE_LIST_TABLE_CONFIGS.length);
        for (const config of ROUTE_LIST_TABLE_CONFIGS) {
            const call = calls.find(([url]) => url.startsWith(`${config.dataPath}?v=`));
            expect(call, config.dataPath).toBeDefined();
            expect(call![1]?.signal).toBeInstanceOf(AbortSignal);
        }
    });
});
