/**
 * 航路詳細ページの head（メタ情報・JSON-LD）を組み立てる純関数
 */
import { ROUTE_PAGE_LAYERS, buildRouteDetailPath, getVehicleLabels } from '../domain/routePage';
import type { RoutePageRecord, RoutePort } from '../domain/routePage';

const SITE_TITLE = 'おでかけ航路マップ';
const OG_IMAGE_URL = 'https://searoute.info/img/banner.png';
const TWITTER_IMAGE_URL = 'https://searoute.info/img/twbanner.png';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function jsonLdScript(data: unknown): string {
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">${json}</script>`;
}

function routeLabel(record: RoutePageRecord): string {
    return record.routeName || record.routeId;
}

export function buildRouteDetailTitle(record: RoutePageRecord): string {
    const heading = [record.businessName, routeLabel(record)].filter(Boolean).join(' ');
    return `${heading} | ${SITE_TITLE}`;
}

export function buildRouteDetailDescription(record: RoutePageRecord): string {
    const name = routeLabel(record);
    const sentences = [record.businessName ? `${record.businessName}の${name}航路。` : `${name}航路。`];
    if (record.ports.length > 0) {
        sentences.push(`発着港：${record.ports.map((port) => port.name).join('・')}。`);
    }
    if (record.freqInfo) {
        sentences.push(`運航頻度：${record.freqInfo}。`);
    }
    if (record.shipName) {
        sentences.push(`使用船舶：${record.shipName.replace(/,\s*/g, '、')}。`);
    }
    const vehicles = getVehicleLabels(record);
    if (vehicles.length > 0) {
        sentences.push(`${vehicles.join('・')}の航送可。`);
    }
    sentences.push('最新の時刻表は運航事業者の公式サイトで確認できます。');
    return sentences.join('');
}

function buildTerminal(port: RoutePort): Record<string, unknown> {
    return {
        '@type': 'BoatTerminal',
        name: port.name,
        geo: { '@type': 'GeoCoordinates', latitude: port.lat, longitude: port.lon },
    };
}

function buildBoatTripJsonLd(record: RoutePageRecord, pageUrl: string): string {
    const trip: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'BoatTrip',
        name: [record.businessName, routeLabel(record)].filter(Boolean).join(' '),
        url: pageUrl,
    };
    if (record.businessName) {
        trip.provider = {
            '@type': 'Organization',
            name: record.businessName,
            ...(record.url ? { url: record.url } : {}),
        };
    }
    if (record.ports.length >= 2) {
        trip.departureBoatTerminal = buildTerminal(record.ports[0]);
        trip.arrivalBoatTerminal = buildTerminal(record.ports[record.ports.length - 1]);
    }
    return jsonLdScript(trip);
}

function buildBreadcrumbJsonLd(record: RoutePageRecord, siteUrl: string, pageUrl: string): string {
    const layer = ROUTE_PAGE_LAYERS[record.layer];
    const items = [
        { name: SITE_TITLE, item: `${siteUrl}/` },
        { name: '航路一覧', item: `${siteUrl}/routeList` },
        { name: layer.label, item: `${siteUrl}/routeList#${layer.anchorId}` },
        { name: routeLabel(record), item: pageUrl },
    ];
    return jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: entry.name,
            item: entry.item,
        })),
    });
}

export function buildRouteDetailHead(record: RoutePageRecord, siteUrl: string): string {
    const pageUrl = `${siteUrl}${buildRouteDetailPath(record.routeId)}`;
    const title = escapeHtml(buildRouteDetailTitle(record));
    const description = escapeHtml(buildRouteDetailDescription(record));
    const url = escapeHtml(pageUrl);
    return [
        `<title>${title}</title>`,
        `<meta name="description" content="${description}">`,
        `<link rel="canonical" href="${url}">`,
        `<meta property="og:url" content="${url}">`,
        `<meta property="og:title" content="${title}">`,
        `<meta property="og:description" content="${description}">`,
        '<meta property="og:type" content="article">',
        `<meta property="og:image" content="${OG_IMAGE_URL}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${title}">`,
        `<meta name="twitter:description" content="${description}">`,
        `<meta name="twitter:image" content="${TWITTER_IMAGE_URL}">`,
        buildBoatTripJsonLd(record, pageUrl),
        buildBreadcrumbJsonLd(record, siteUrl, pageUrl),
    ].join('\n');
}
