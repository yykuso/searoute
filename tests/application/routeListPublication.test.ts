import { describe, expect, it } from 'vitest';
import { buildLlmsFullText, buildRouteListJsonLd } from '../../src/application/routeListPublication';
import type { RouteTableState } from '../../src/application/viewModels/routeListViewModel';

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
    it('ItemList を生成し url は地図リンク', () => {
        const html = buildRouteListJsonLd(tables, 'https://searoute.info');
        const match = html.match(/^<script type="application\/ld\+json">([\s\S]*)<\/script>$/);
        expect(match).not.toBeNull();
        const data = JSON.parse(match![1]);
        expect(data['@type']).toBe('ItemList');
        expect(data.itemListElement).toHaveLength(2);
        expect(data.numberOfItems).toBe(2);
        expect(data.itemListElement[0].url).toBe('https://searoute.info/?share=route&routeId=2&sourceId=geojson_sea_route');
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
        expect(line).toBe('- 改行 事業者｜航路 名（船 名）: https://searoute.info/?share=route&routeId=9&sourceId=geojson_sea_route / 公式: https://example.com/');
    });

    it('事業者名・航路名が両方空の行は出力しない', () => {
        const text = buildLlmsFullText([{
            selector: '.a',
            sourceId: 'geojson_sea_route',
            rows: [{ routeId: '8', businessName: '', routeName: ' ' }],
            visibleColumns: [],
        }], 'https://searoute.info', 'x');
        expect(text).not.toContain('routeId=8');
    });

    it('info があれば［info］として付ける', () => {
        const text = buildLlmsFullText([{
            selector: '.a',
            sourceId: 'geojson_sea_route',
            rows: [{ routeId: '7', businessName: '事業者', routeName: '航路', shipName: '船', info: '1日2便\n冬季運休' }],
            visibleColumns: [],
        }], 'https://searoute.info', 'x');
        const line = text.split('\n').find((l) => l.includes('routeId=7'))!;
        expect(line).toBe('- 事業者｜航路（船）［1日2便 冬季運休］: https://searoute.info/?share=route&routeId=7&sourceId=geojson_sea_route');
    });
});
