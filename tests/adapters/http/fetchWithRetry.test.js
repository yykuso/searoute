import { describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from '../../../js/adapters/http/fetchWithRetry.js';

describe('fetchWithRetry', () => {
    it('成功レスポンスをそのまま返す', async () => {
        const response = { ok: true, status: 200 };
        const fetchImpl = vi.fn().mockResolvedValue(response);

        await expect(fetchWithRetry('/data.json', { fetchImpl })).resolves.toBe(response);
        expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('失敗後に待機して再試行する', async () => {
        const response = { ok: true, status: 200 };
        const fetchImpl = vi.fn()
            .mockRejectedValueOnce(new Error('network error'))
            .mockResolvedValueOnce(response);
        const wait = vi.fn().mockResolvedValue(undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(fetchWithRetry('/data.json', {
            retries: 2,
            delay: 25,
            fetchImpl,
            wait,
        })).resolves.toBe(response);

        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(wait).toHaveBeenCalledWith(25);
        warn.mockRestore();
    });

    it('HTTPエラーが継続した場合は最後のエラーを返す', async () => {
        const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(fetchWithRetry('/data.json', {
            retries: 2,
            fetchImpl,
            wait: () => Promise.resolve(),
        })).rejects.toThrow('HTTP error! status: 503');

        expect(fetchImpl).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });
});