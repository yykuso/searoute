import { describe, expect, it, vi } from 'vitest';
import {
    executeDrawerAction,
    executeDrawerCloseHandlers,
    registerDrawerAction,
    registerDrawerCloseHandler,
} from '../../js/presentation/drawerActionRegistry.js';

describe('drawerActionRegistry', () => {
    it('登録したアクションへpayloadを渡す', () => {
        const handler = vi.fn();
        const unregister = registerDrawerAction('test-action', handler);

        expect(executeDrawerAction('test-action', { routeId: '1' })).toBe(true);
        expect(handler).toHaveBeenCalledWith({ routeId: '1' });

        unregister();
        expect(executeDrawerAction('test-action')).toBe(false);
    });

    it('未登録アクションは実行しない', () => {
        expect(executeDrawerAction('missing-action')).toBe(false);
    });

    it('ドロワー終了時に登録したクリーンアップを実行する', () => {
        const handler = vi.fn();
        const unregister = registerDrawerCloseHandler(handler);

        executeDrawerCloseHandlers();
        expect(handler).toHaveBeenCalledOnce();

        unregister();
        executeDrawerCloseHandlers();
        expect(handler).toHaveBeenCalledOnce();
    });
});