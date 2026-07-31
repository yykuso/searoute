import { describe, expect, it, vi } from 'vitest';
import { trackEvent } from '../../../js/adapters/analytics/googleAnalyticsAdapter.js';

describe('trackEvent', () => {
    it('gtag が利用可能な場合は呼び出す', () => {
        const gtag = vi.fn();
        vi.stubGlobal('gtag', gtag);

        trackEvent('marker_click', 'map', 'FerryLine A');

        expect(gtag).toHaveBeenCalledWith('event', 'marker_click', {
            event_category: 'map',
            event_label: 'FerryLine A',
            value: 1,
        });

        vi.unstubAllGlobals();
    });

    it('value を指定できる', () => {
        const gtag = vi.fn();
        vi.stubGlobal('gtag', gtag);

        trackEvent('map_overlayer_change', 'map', 'OpenSeaMap', 0);

        expect(gtag).toHaveBeenCalledWith('event', 'map_overlayer_change', expect.objectContaining({ value: 0 }));

        vi.unstubAllGlobals();
    });

    it('gtag が存在しない場合は何もしない', () => {
        vi.stubGlobal('gtag', undefined);
        expect(() => trackEvent('test', 'cat', 'label')).not.toThrow();
        vi.unstubAllGlobals();
    });
});
