import { describe, expect, it } from 'vitest';
import { buildSeaRouteSidebarContent } from '../../js/presentation/drawerHelpers.js';

describe('buildSeaRouteSidebarContent', () => {
    it('航路ズーム操作をデータ属性付きボタンとして生成する', () => {
        const html = buildSeaRouteSidebarContent({
            routeId: 'route-1',
            lineId: 'line-2',
            routeName: '本線',
            portName1: '出発港',
            portName2: '到着港',
        }, {}, 'geojson_sea_route');

        expect(html).toContain('data-drawer-action="zoom-route"');
        expect(html).toContain('data-drawer-action="zoom-route-section"');
        expect(html).toContain('data-route-id="route-1"');
        expect(html).toContain('data-line-id="line-2"');
        expect(html).toContain('data-source-id="geojson_sea_route"');
        expect(html.match(/class="[^"]*text-left[^"]*"/g)).toHaveLength(2);
        expect(html).not.toContain('onclick=');
        expect(html).not.toContain('window.zoomToRoute');
    });
});