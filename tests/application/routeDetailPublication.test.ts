import { describe, expect, it } from 'vitest';
import {
    buildRouteDetailDescription,
    buildRouteDetailHead,
    buildRouteDetailTitle,
} from '../../src/application/routeDetailPublication';
import type { RoutePageRecord } from '../../src/domain/routePage';

const SITE = 'https://searoute.info';

const full: RoutePageRecord = {
    routeId: '10101',
    layer: 'seaRoute',
    businessName: 'ハートランドフェリー',
    routeName: '稚内～利礼島（鴛泊）～礼文（香深）',
    url: 'https://heartlandferry.jp/timetable/',
    freqInfo: '1日2～3往復',
    car: 1,
    bike: 1,
    bicycle: 1,
    shipName: 'アマポーラ宗谷, サイプリア宗谷, ボレアース宗谷',
    ports: [
        { name: '稚内', lon: 141.68254, lat: 45.41617 },
        { name: '鴛泊', lon: 141.22879, lat: 45.24182 },
        { name: '香深', lon: 141.04616, lat: 45.29791 },
    ],
};

const minimal: RoutePageRecord = { routeId: '9', layer: 'seaRoute', routeName: 'A', ports: [] };

function scriptBodies(head: string): string[] {
    return [...head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1]);
}

function jsonLds(head: string): Array<Record<string, any>> {
    return scriptBodies(head).map((body) => JSON.parse(body));
}

describe('buildRouteDetailTitle', () => {
    it('事業者あり・なし', () => {
        expect(buildRouteDetailTitle(full)).toBe('ハートランドフェリー 稚内～利礼島（鴛泊）～礼文（香深） | おでかけ航路マップ');
        expect(buildRouteDetailTitle(minimal)).toBe('A | おでかけ航路マップ');
    });
});

describe('buildRouteDetailDescription', () => {
    it('全項目あり', () => {
        expect(buildRouteDetailDescription(full)).toBe(
            'ハートランドフェリーの稚内～利礼島（鴛泊）～礼文（香深）航路。発着港：稚内・鴛泊・香深。運航頻度：1日2～3往復。使用船舶：アマポーラ宗谷、サイプリア宗谷、ボレアース宗谷。自動車・バイク・自転車の航送可。最新の時刻表は運航事業者の公式サイトで確認できます。',
        );
    });

    it('欠損レコードでは該当の文を省く', () => {
        expect(buildRouteDetailDescription(minimal))
            .toBe('A航路。最新の時刻表は運航事業者の公式サイトで確認できます。');
    });
});

describe('buildRouteDetailHead', () => {
    const head = buildRouteDetailHead(full, SITE);

    it('canonical・OGP・twitter', () => {
        expect(head).toContain('<link rel="canonical" href="https://searoute.info/route/10101/">');
        expect(head).toContain('<meta property="og:url" content="https://searoute.info/route/10101/">');
        expect(head).toContain('<meta property="og:type" content="article">');
        expect(head).toContain('<meta property="og:image" content="https://searoute.info/img/banner.png">');
        expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(head).toContain('<meta name="twitter:image" content="https://searoute.info/img/twbanner.png">');
        expect(head).toContain('<title>ハートランドフェリー 稚内～利礼島（鴛泊）～礼文（香深） | おでかけ航路マップ</title>');
    });

    it('BoatTrip と BreadcrumbList', () => {
        const [trip, crumbs] = jsonLds(head);
        expect(trip['@type']).toBe('BoatTrip');
        expect(trip.url).toBe('https://searoute.info/route/10101/');
        expect(trip.provider).toEqual({ '@type': 'Organization', name: 'ハートランドフェリー', url: 'https://heartlandferry.jp/timetable/' });
        expect(trip.departureBoatTerminal).toEqual({
            '@type': 'BoatTerminal',
            name: '稚内',
            geo: { '@type': 'GeoCoordinates', latitude: 45.41617, longitude: 141.68254 },
        });
        expect(trip.arrivalBoatTerminal.name).toBe('香深');
        expect(crumbs['@type']).toBe('BreadcrumbList');
        expect(crumbs.itemListElement).toHaveLength(4);
        expect(crumbs.itemListElement.map((e: any) => e.item)).toEqual([
            'https://searoute.info/',
            'https://searoute.info/routeList',
            'https://searoute.info/routeList#domestic',
            'https://searoute.info/route/10101/',
        ]);
        expect(crumbs.itemListElement[2].name).toBe('国内航路');
    });

    it('欠損レコードでは provider・発着を省く', () => {
        const [trip] = jsonLds(buildRouteDetailHead(minimal, SITE));
        expect(trip.provider).toBeUndefined();
        expect(trip.departureBoatTerminal).toBeUndefined();
        expect(trip.arrivalBoatTerminal).toBeUndefined();
    });

    it('特殊文字をエスケープする', () => {
        const h = buildRouteDetailHead({ ...minimal, routeName: '<b>"x"&' }, SITE);
        expect(h).toContain('<title>&lt;b&gt;&quot;x&quot;&amp; | おでかけ航路マップ</title>');
        expect(h).toContain('<meta property="og:title" content="&lt;b&gt;&quot;x&quot;&amp; | おでかけ航路マップ">');
        expect(h).not.toContain('<b>');
        const scripts = scriptBodies(h);
        expect(scripts).toHaveLength(2);
        for (const s of scripts) expect(s).not.toContain('<');
        expect(jsonLds(h)[0].name).toBe('<b>"x"&');
    });
});
