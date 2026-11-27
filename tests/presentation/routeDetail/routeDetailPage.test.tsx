// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RoutePageRecord } from '../../../src/domain/routePage';
import { RouteDetailPage } from '../../../src/presentation/routeDetail/RouteDetailPage';

afterEach(cleanup);

const compact = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');

function fullRecord(): RoutePageRecord {
    return {
        routeId: '10101',
        layer: 'seaRoute',
        businessName: 'ハートランドフェリー',
        routeName: '稚内～利礼島（鴛泊）～礼文（香深）',
        url: 'https://heartlandferry.jp/timetable/',
        freq: 3,
        freqInfo: '1日2～3往復',
        car: 1,
        bike: 1,
        bicycle: 1,
        shipName: 'アマポーラ宗谷, サイプリア宗谷, ボレアース宗谷',
        bbox: [141.04616, 45.24146, 141.71621, 45.47422],
        lastChecked: '2026-11-25',
        ports: [
            { name: '稚内', lon: 141.68254, lat: 45.41617 },
            { name: '鴛泊', lon: 141.22879, lat: 45.24182 },
            { name: '香深', lon: 141.04616, lat: 45.29791 },
        ],
    };
}

const relatedRecord: RoutePageRecord = {
    routeId: '10102',
    layer: 'seaRoute',
    businessName: 'ハートランドフェリー',
    routeName: '利礼島（沓形）～礼文（香深）',
    ports: [],
};

const dtTexts = () => [...document.querySelectorAll('dl dt')].map((element) => compact(element.textContent));
const ddFor = (label: string) => {
    const dt = [...document.querySelectorAll('dl dt')].find((element) => compact(element.textContent) === label);
    return dt?.nextElementSibling ?? null;
};

describe('RouteDetailPage', () => {
    it('値がそろった航路：見出し・情報・ボタン・関連航路・地図の差し込み口を描画する', () => {
        render(<RouteDetailPage record={fullRecord()} related={[relatedRecord]} />);

        expect(compact(screen.getByRole('heading', { level: 1 }).textContent)).toBe('稚内～利礼島（鴛泊）～礼文（香深）');
        expect(compact(document.querySelector('.route-detail-operator')?.textContent)).toBe('ハートランドフェリー');

        expect(dtTexts()).toEqual(['事業者', '発着港', '運航頻度', '船名', '車両航送', '情報確認日']);
        expect(compact(ddFor('発着港')?.textContent)).toBe('稚内⇄鴛泊⇄香深');
        expect(compact(ddFor('船名')?.textContent)).toBe('アマポーラ宗谷、サイプリア宗谷、ボレアース宗谷');
        expect(compact(ddFor('車両航送')?.textContent)).toBe('自動車・バイク・自転車可');

        const mapLink = screen.getByRole('link', { name: /大きな地図で見る/ });
        expect(mapLink.getAttribute('href')).toBe('/?share=route&routeId=10101&sourceId=geojson_sea_route');
        const officialLink = screen.getByRole('link', { name: /時刻表（公式サイト）/ });
        expect(officialLink.getAttribute('href')).toBe('https://heartlandferry.jp/timetable/');
        expect(officialLink.getAttribute('target')).toBe('_blank');
        expect(officialLink.getAttribute('rel')).toBe('noopener noreferrer');

        expect(screen.getByRole('heading', { level: 2, name: '同じ事業者の航路' })).toBeTruthy();
        expect(screen.getByRole('link', { name: /利礼島（沓形）～礼文（香深）/ }).getAttribute('href')).toBe('/route/10102/');

        const crumbs = [...document.querySelectorAll('nav[aria-label="パンくずリスト"] a')].map((element) => element.getAttribute('href'));
        expect(crumbs).toEqual(['/', '/routeList', '/routeList#domestic']);

        const map = document.getElementById('route-detail-map') as HTMLElement;
        expect(map.getAttribute('aria-label')).toBe('航路の地図');
        expect(map.dataset.routeId).toBe('10101');
        expect(map.dataset.sourceLayer).toBe('seaRoute');
        expect(JSON.parse(map.dataset.bbox as string)).toEqual(fullRecord().bbox);
        expect(JSON.parse(map.dataset.ports as string)).toEqual(fullRecord().ports);

        // ヘッダーはマップ・航路一覧への絶対リンク（現在ページの強調なし）
        const headerLinks = [...document.querySelectorAll('header a')];
        expect(headerLinks.map((element) => element.getAttribute('href'))).toEqual(['/', '/routeList']);
        expect(headerLinks.some((element) => element.hasAttribute('aria-current'))).toBe(false);
    });

    it('値が欠けた航路：該当行・公式ボタン・関連セクションを出さない', () => {
        const record: RoutePageRecord = {
            routeId: '99999',
            layer: 'seaRoute_international',
            routeName: '欠損航路',
            ports: [{ name: '博多', lon: 130.4, lat: 33.6 }],
        };
        render(<RouteDetailPage record={record} related={[]} />);

        expect(dtTexts()).toEqual(['発着港']);
        expect(compact(ddFor('発着港')?.textContent)).toBe('博多');
        expect(screen.queryByRole('link', { name: /時刻表（公式サイト）/ })).toBeNull();
        expect(screen.queryByRole('heading', { name: '同じ事業者の航路' })).toBeNull();
        expect(screen.getByRole('link', { name: /大きな地図で見る/ }).getAttribute('href'))
            .toBe('/?share=route&routeId=99999&sourceId=geojson_international_sea_route');
        expect(document.querySelector('nav[aria-label="パンくずリスト"] a[href="/routeList#international"]')).toBeTruthy();
    });

    it('季節運航などの note をバッジで示す', () => {
        render(<RouteDetailPage record={{ ...fullRecord(), note: 'season' }} related={[]} />);
        expect(compact(document.querySelector('.route-detail-badges')?.textContent)).toContain('季節運航');
    });

    it('ページ内のリンクはすべて絶対パスか外部 URL（/route/x/ 配下で相対リンクが壊れないように）', () => {
        render(<RouteDetailPage record={fullRecord()} related={[relatedRecord]} />);
        const hrefs = [...document.querySelectorAll('a[href]')].map((element) => element.getAttribute('href') ?? '');
        expect(hrefs.length).toBeGreaterThan(0);
        for (const href of hrefs) {
            expect(href.startsWith('/') || href.startsWith('http'), href).toBe(true);
        }
    });
});
