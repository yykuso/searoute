/**
 * 航路一覧の公開用出力（JSON-LD・llms-full.txt）を組み立てる純関数
 */
import type { RouteRow } from '../domain/route';
import { buildRouteDetailPath } from '../domain/routePage';
import type { RoutePageRecord } from '../domain/routePage';
import type { RouteTableState } from './viewModels/routeListViewModel';

export const ROUTE_TABLE_LABELS: Record<string, string> = {
    geojson_sea_route: '国内航路',
    geojson_international_sea_route: '国際航路',
    geojson_KR_sea_route: '韓国国内航路',
};

/** 公開用の絶対 URL（航路詳細ページ /route/<routeId>/） */
function detailUrl(siteUrl: string, row: RouteRow): string {
    return `${siteUrl}${buildRouteDetailPath(row.routeId)}`;
}

export function buildRouteListJsonLd(tables: RouteTableState[], siteUrl: string): string {
    let position = 0;
    const itemListElement = tables.flatMap((table) => table.rows.map((row) => ({
        '@type': 'ListItem',
        position: ++position,
        name: [row.businessName, row.routeName].filter(Boolean).join(' '),
        url: detailUrl(siteUrl, row),
    })));
    const json = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'おでかけ航路マップ 航路一覧',
        numberOfItems: itemListElement.length,
        itemListElement,
    }).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">${json}</script>`;
}

/** 1行に収めるため空白・改行を1つのスペースにまとめる */
function clean(value: string | undefined): string {
    return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** routePages にある航路だけ「［発着港: A・B］［運航頻度: X］」を返す（値の無い項目は付けない） */
function routePageDetails(record: RoutePageRecord | undefined): string {
    if (!record) return '';
    const ports = record.ports.map((port) => clean(port.name)).filter(Boolean);
    const freq = clean(record.freqInfo);
    return (ports.length > 0 ? `［発着港: ${ports.join('・')}］` : '') + (freq ? `［運航頻度: ${freq}］` : '');
}

export function buildLlmsFullText(
    tables: RouteTableState[],
    siteUrl: string,
    generatedAt: string,
    routePages: RoutePageRecord[] = [],
): string {
    const routePagesById = new Map(routePages.map((record) => [record.routeId, record]));
    const lines = [
        '# おでかけ航路マップ 全航路一覧',
        '',
        `> 生成日時: ${generatedAt}`,
        '',
    ];
    for (const table of tables) {
        lines.push(`## ${ROUTE_TABLE_LABELS[table.sourceId] ?? table.sourceId}`, '');
        for (const row of table.rows) {
            const heading = [row.businessName, row.routeName].map(clean).filter(Boolean).join('｜');
            if (!heading) continue;
            const ship = clean(row.shipName) ? `（${clean(row.shipName)}）` : '';
            const info = clean(row.info) ? `［${clean(row.info)}］` : '';
            const details = routePageDetails(routePagesById.get(row.routeId));
            const official = clean(row.url) ? ` / 公式: ${clean(row.url)}` : '';
            lines.push(`- ${heading}${ship}${info}${details}: ${detailUrl(siteUrl, row)}${official}`);
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

/**
 * 一覧の全 routeId に航路詳細ページ（routePages）があるか検査する。欠けていれば欠けた routeId を列挙して throw
 * 一覧か routePages のどちらかが空（E2E・データ未取得）なら検査しない
 */
export function assertRouteListHasDetailPages(tables: RouteTableState[], routePages: RoutePageRecord[]): void {
    const routeIds = tables.flatMap((table) => table.rows.map((row) => row.routeId));
    if (routeIds.length === 0 || routePages.length === 0) return;
    const pageIds = new Set(routePages.map((record) => record.routeId));
    const missing = [...new Set(routeIds.filter((routeId) => !pageIds.has(routeId)))];
    if (missing.length > 0) {
        throw new Error(`航路一覧に航路詳細ページ（routePages.json）の無い routeId があります: ${missing.join(', ')}`);
    }
}
