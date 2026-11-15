/**
 * 航路一覧の公開用出力（JSON-LD・llms-full.txt）を組み立てる純関数
 */
import { buildRouteMapPath } from '../domain/route';
import type { RouteRow } from '../domain/route';
import type { RouteTableState } from './viewModels/routeListViewModel';

export const ROUTE_TABLE_LABELS: Record<string, string> = {
    geojson_sea_route: '国内航路',
    geojson_international_sea_route: '国際航路',
    geojson_KR_sea_route: '韓国国内航路',
};

function mapUrl(siteUrl: string, row: RouteRow, sourceId: string): string {
    return `${siteUrl}/${buildRouteMapPath(row.routeId, sourceId)}`;
}

export function buildRouteListJsonLd(tables: RouteTableState[], siteUrl: string): string {
    let position = 0;
    const itemListElement = tables.flatMap((table) => table.rows.map((row) => ({
        '@type': 'ListItem',
        position: ++position,
        name: [row.businessName, row.routeName].filter(Boolean).join(' '),
        url: mapUrl(siteUrl, row, table.sourceId),
    })));
    const json = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'おでかけ航路マップ 航路一覧',
        itemListElement,
    }).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">${json}</script>`;
}

export function buildLlmsFullText(tables: RouteTableState[], siteUrl: string, generatedAt: string): string {
    const lines = [
        '# おでかけ航路マップ 全航路一覧',
        '',
        `> 生成日時: ${generatedAt}`,
        '',
    ];
    for (const table of tables) {
        lines.push(`## ${ROUTE_TABLE_LABELS[table.sourceId] ?? table.sourceId}`, '');
        for (const row of table.rows) {
            const ship = row.shipName ? `（${row.shipName}）` : '';
            const official = row.url ? ` / 公式: ${row.url}` : '';
            const heading = [row.businessName, row.routeName].filter(Boolean).join('｜');
            lines.push(`- ${heading}${ship}: ${mapUrl(siteUrl, row, table.sourceId)}${official}`);
        }
        lines.push('');
    }
    lines.push(
        '## 補足',
        '',
        '- 航路の線や港の位置は探索を支援するための情報であり、実際の運航経路を厳密に示すものではありません。',
        '- 最新の運航状況、料金、予約、時刻表は各運航事業者の公式情報を優先してください。',
        '',
    );
    return lines.join('\n');
}
