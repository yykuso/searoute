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
        expect(data.itemListElement[0].url).toBe('https://searoute.info/index.html?share=route&routeId=2&sourceId=geojson_sea_route');
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
});
