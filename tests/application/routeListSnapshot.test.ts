import { describe, expect, it } from 'vitest';
import {
    ROUTE_LIST_SNAPSHOT_ID,
    parseRouteListSnapshot,
    serializeRouteListSnapshot,
} from '../../src/application/routeListSnapshot';
import type { RouteTableState } from '../../src/application/viewModels/routeListViewModel';

const tables: RouteTableState[] = [
    {
        selector: '.a tbody',
        sourceId: 'a',
        rows: [{ routeId: '1', routeName: '</script><b>x', businessName: 'Ferry' }],
        visibleColumns: ['routeId', 'businessName', 'routeName'],
    },
];

describe('routeListSnapshot', () => {
    it('serialize した内容を parse すると元の配列に戻る', () => {
        const html = serializeRouteListSnapshot(tables);
        const match = html.match(/^<script type="application\/json" id="([^"]+)">([\s\S]*)<\/script>$/);
        expect(match).not.toBeNull();
        expect(match![1]).toBe(ROUTE_LIST_SNAPSHOT_ID);
        expect(parseRouteListSnapshot(match![2])).toEqual(tables);
    });

    it('</script> を含む値でも終了タグは 1 回しか現れない', () => {
        const html = serializeRouteListSnapshot(tables);
        expect(html.match(/<\/script>/g)).toHaveLength(1);
    });

    it('空・不正 JSON・配列でない場合は null', () => {
        expect(parseRouteListSnapshot('')).toBeNull();
        expect(parseRouteListSnapshot('{')).toBeNull();
        expect(parseRouteListSnapshot('{"a":1}')).toBeNull();
        expect(parseRouteListSnapshot(null)).toBeNull();
        expect(parseRouteListSnapshot(undefined)).toBeNull();
    });
});
