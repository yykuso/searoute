import { describe, expect, it } from 'vitest';
import { createCookieSettingsRepository } from '../../../js/adapters/persistence/cookieControl.js';

describe('cookieSettingsRepository', () => {
    it('指定したCookieをデコードして取得する', () => {
        const documentRef = {
            cookie: 'currentMap=90; routeFilters=%7B%22status%22%3A%7B%22active%22%3Atrue%7D%7D',
        };
        const repository = createCookieSettingsRepository({ documentRef });

        expect(repository.get('routeFilters')).toBe('{"status":{"active":true}}');
        expect(repository.get('missing')).toBeNull();
    });

    it('値に等号が含まれていても末尾まで取得する', () => {
        const repository = createCookieSettingsRepository({
            documentRef: { cookie: 'token=first%3Dsecond%3Dthird' },
        });

        expect(repository.get('token')).toBe('first=second=third');
    });

    it('指定日数の有効期限とルートパスで保存する', () => {
        const documentRef = { cookie: '' };
        const repository = createCookieSettingsRepository({
            documentRef,
            now: () => new Date('2026-07-31T00:00:00.000Z'),
        });

        repository.set('currentMap', 90, 30);

        expect(documentRef.cookie).toBe('currentMap=90;expires=Sun, 30 Aug 2026 00:00:00 GMT;path=/');
    });
});