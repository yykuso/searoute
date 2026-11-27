import { describe, expect, it } from 'vitest';
import { assertRouteListHasDetailPages, buildLlmsFullText, buildRouteListJsonLd } from '../../src/application/routeListPublication';
import type { RouteTableState } from '../../src/application/viewModels/routeListViewModel';
import type { RoutePageRecord } from '../../src/domain/routePage';

const tables: RouteTableState[] = [
    {
        selector: '.a',
        sourceId: 'geojson_sea_route',
        rows: [
            { routeId: '2', businessName: 'ハートランドフェリー', routeName: '稚内～利尻', shipName: 'フェリー宗谷', url: 'https://example.com/' },
            { routeId: '3', businessName: '</script>社', routeName: 'URLなし航路' },
        ],
        visibleColumns: ['routeId', 'businessName', 'routeName'],
    },
];

describe('buildRouteListJsonLd', () => {
    it('ItemList を生成し url は航路詳細ページ', () => {
        const html = buildRouteListJsonLd(tables, 'https://searoute.info');
        const match = html.match(/^<script type="application\/ld\+json">([\s\S]*)<\/script>$/);
        expect(match).not.toBeNull();
        const data = JSON.parse(match![1]);
        expect(data['@type']).toBe('ItemList');
        expect(data.itemListElement).toHaveLength(2);
        expect(data.numberOfItems).toBe(2);
        expect(data.itemListElement[0].url).toBe('https://searoute.info/route/2/');
        expect(data.itemListElement[0].position).toBe(1);
        expect(data.itemListElement[0].name).toBe('ハートランドフェリー 稚内～利尻');
        expect(match![1]).not.toContain('<');
    });
});

describe('buildLlmsFullText', () => {
    it('カテゴリ見出しと行を出力し、url が無い行に公式: を付けない', () => {
        const text = buildLlmsFullText(tables, 'https://searoute.info', '2026-01-01T00:00:00.000Z');
        expect(text).toContain('# おでかけ航路マップ 全航路一覧');
        expect(text).toContain('2026-01-01T00:00:00.000Z');
        expect(text).toContain('## 国内航路');
        const lines = text.split('\n');
        expect(lines.find((l) => l.includes('ハートランドフェリー'))).toContain('（フェリー宗谷）');
        expect(lines.find((l) => l.includes('ハートランドフェリー'))).toContain('公式: https://example.com/');
        expect(lines.find((l) => l.includes('URLなし航路'))).not.toContain('公式:');
    });

    it('各項目の空白・改行を1つのスペースにまとめる', () => {
        const text = buildLlmsFullText([{
            selector: '.a',
            sourceId: 'geojson_sea_route',
            rows: [{ routeId: '9', businessName: '改行\n事業者', routeName: '航路  名', shipName: '船\r\n名', url: 'https://example.com/\n' }],
            visibleColumns: [],
        }], 'https://searoute.info', 'x');
        const line = text.split('\n').find((l) => l.includes('事業者'))!;
        expect(line).toBe('- 改行 事業者｜航路 名（船 名）: https://searoute.info/route/9/ / 公式: https://example.com/');
    });

    it('事業者名・航路名が両方空の行は出力しない', () => {
        const text = buildLlmsFullText([{
            selector: '.a',
            sourceId: 'geojson_sea_route',
            rows: [{ routeId: '8', businessName: '', routeName: ' ' }],
            visibleColumns: [],
        }], 'https://searoute.info', 'x');
        expect(text).not.toContain('/route/8/');
    });

    it('info があれば［info］として付ける', () => {
        const text = buildLlmsFullText([{
            selector: '.a',
            sourceId: 'geojson_sea_route',
            rows: [{ routeId: '7', businessName: '事業者', routeName: '航路', shipName: '船', info: '1日2便\n冬季運休' }],
            visibleColumns: [],
        }], 'https://searoute.info', 'x');
        const line = text.split('\n').find((l) => l.includes('/route/7/'))!;
        expect(line).toBe('- 事業者｜航路（船）［1日2便 冬季運休］: https://searoute.info/route/7/');
    });

    it('routePages に該当航路があれば［発着港］［運航頻度］を追記する', () => {
        const routePages: RoutePageRecord[] = [
            { routeId: '7', layer: 'seaRoute', freqInfo: '1日\n2便', ports: [{ name: '稚内', lon: 141.7, lat: 45.4 }, { name: '利尻', lon: 141.2, lat: 45.2 }] },
            { routeId: '6', layer: 'seaRoute', ports: [] },
        ];
        const text = buildLlmsFullText([{
            selector: '.a',
            sourceId: 'geojson_sea_route',
            rows: [
                { routeId: '7', businessName: '事業者', routeName: '航路', shipName: '船', info: '冬季運休' },
                { routeId: '6', businessName: '事業者', routeName: '港なし' },
                { routeId: '5', businessName: '事業者', routeName: '詳細なし' },
            ],
            visibleColumns: [],
        }], 'https://searoute.info', 'x', routePages);
        const lines = text.split('\n');
        expect(lines.find((l) => l.includes('/route/7/'))).toBe('- 事業者｜航路（船）［冬季運休］［発着港: 稚内・利尻］［運航頻度: 1日 2便］: https://searoute.info/route/7/');
        expect(lines.find((l) => l.includes('/route/6/'))).toBe('- 事業者｜港なし: https://searoute.info/route/6/');
        expect(lines.find((l) => l.includes('/route/5/'))).toBe('- 事業者｜詳細なし: https://searoute.info/route/5/');
    });
});

describe('assertRouteListHasDetailPages', () => {
    const page = (routeId: string): RoutePageRecord => ({ routeId, layer: 'seaRoute', ports: [] });

    it('一覧の全 routeId が routePages にあれば何もしない', () => {
        expect(() => assertRouteListHasDetailPages(tables, [page('2'), page('3'), page('99')])).not.toThrow();
    });

    it('欠けた routeId を列挙して throw する', () => {
        const twoTables: RouteTableState[] = [...tables, {
            selector: '.b', sourceId: 'geojson_KR_sea_route', rows: [{ routeId: 'KR1' }], visibleColumns: [],
        }];
        expect(() => assertRouteListHasDetailPages(twoTables, [page('2')])).toThrow(/3, KR1/);
    });

    it('一覧か routePages のどちらかが空なら検査しない', () => {
        expect(() => assertRouteListHasDetailPages(tables, [])).not.toThrow();
        expect(() => assertRouteListHasDetailPages([], [page('1')])).not.toThrow();
        expect(() => assertRouteListHasDetailPages([{ ...tables[0], rows: [] }], [page('1')])).not.toThrow();
    });
});
