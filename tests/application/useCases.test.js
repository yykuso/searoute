import { describe, expect, it, vi } from 'vitest';
import { restoreSharedRoute } from '../../js/application/restoreSharedRoute.js';

describe('restoreSharedRoute', () => {
    it('ensureSharedLayerEnabled と initShareFromUrl を順番に呼ぶ', async () => {
        const calls = [];
        const ensureSharedLayerEnabled = vi.fn(async () => calls.push('ensure'));
        const initShareFromUrl = vi.fn(async () => calls.push('init'));
        await restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl });
        expect(calls).toEqual(['ensure', 'init']);
    });

    it('ensureSharedLayerEnabled が失敗しても initShareFromUrl は実行される', async () => {
        const ensureSharedLayerEnabled = vi.fn(async () => { throw new Error('fail'); });
        const initShareFromUrl = vi.fn(async () => {});
        await restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl });
        expect(initShareFromUrl).toHaveBeenCalled();
    });
});
