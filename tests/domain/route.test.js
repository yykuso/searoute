import { describe, expect, it } from 'vitest';
import {
    compareRouteIds,
    createRouteSearchPattern,
    getRouteInfoFromNote,
    getVisibleRouteColumns,
    matchesRouteSearchText,
    normalizeRouteRows,
} from '../../js/domain/route.js';

describe('route', () => {
    it('lightweight JSONをRoute行へ変換してrouteId順に並べる', () => {
        expect(normalizeRouteRows({ records: [
            { routeId: 10, businessName: 'B社', routeName: '航路B', note: 'suspend' },
            { routeId: 2, businessName: 'A社', routeName: '航路A', information: '毎日運航' },
        ] })).toEqual([
            {
                routeId: '2', businessName: 'A社', routeName: '航路A', info: '毎日運航',
                shipName: undefined, note: undefined, url: undefined,
            },
            {
                routeId: '10', businessName: 'B社', routeName: '航路B', info: '運休中',
                shipName: undefined, note: 'suspend', url: undefined,
            },
        ]);
    });

    it('GeoJSONの同一routeIdを統合する', () => {
        expect(normalizeRouteRows({ features: [
            { properties: { routeId: 1, businessName: '船社', routeName: '本線', shipName: '第一船' } },
            { properties: { routeId: 1, note: 'season', url: 'https://example.com' } },
            { properties: {} },
        ] })).toEqual([{
            routeId: '1', businessName: '船社', routeName: '本線', info: '季節運航',
            shipName: '第一船', note: 'season', url: 'https://example.com',
        }]);
    });

    it('詳細オブジェクト形式をRoute行へ変換する', () => {
        expect(normalizeRouteRows({
            routeA: { businessName: '船社', routeName: '離島線', info: '週3便' },
        })[0]).toMatchObject({ routeId: 'routeA', businessName: '船社', routeName: '離島線', info: '週3便' });
    });

    it('値が存在する任意列だけを表示対象にする', () => {
        expect(getVisibleRouteColumns([
            { routeId: '1', businessName: '船社', routeName: '本線', info: '', shipName: '第一船' },
        ])).toEqual(['routeId', 'businessName', 'routeName', 'shipName']);
    });

    it('状態の表示文言とrouteIdの比較規則を返す', () => {
        expect(getRouteInfoFromNote('season')).toBe('季節運航');
        expect(getRouteInfoFromNote('suspend')).toBe('運休中');
        expect(getRouteInfoFromNote(null)).toBeUndefined();
        expect(['10', '2', 'A2', 'A10'].sort(compareRouteIds)).toEqual(['2', '10', 'A2', 'A10']);
    });

    it('大文字小文字を無視して検索し、正規表現の特殊文字を文字として扱う', () => {
        expect(matchesRouteSearchText('Ocean [Route]', 'ocean [')).toBe(true);
        expect(matchesRouteSearchText('瀬戸内航路', '北海道')).toBe(false);
        expect('Ocean [Route]'.replace(createRouteSearchPattern('[Route]'), '<mark>$1</mark>'))
            .toBe('Ocean <mark>[Route]</mark>');
    });
});