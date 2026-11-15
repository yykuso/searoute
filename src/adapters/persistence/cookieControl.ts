/**
 * Cookie管理モジュール（SettingsStore の実装）
 *
 * 責務:
 * - Cookie の読み書き（GET/SET）
 * - マップの中心座標・ズームレベル、ユーザー設定の永続化先
 */
import type { SettingsStore, SettingValue } from '../../application/ports';

export interface CookieSettingsRepositoryOptions {
    documentRef?: { cookie: string };
    now?: () => Date;
}

export function createCookieSettingsRepository(options: CookieSettingsRepositoryOptions = {}): SettingsStore {
    const { documentRef = document, now = () => new Date() } = options;
    function get(name: string): string | null {
        const cookies = documentRef.cookie ? documentRef.cookie.split('; ') : [];
        for (const cookie of cookies) {
            const separatorIndex = cookie.indexOf('=');
            const key = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie;
            if (key === name) {
                const value = separatorIndex >= 0 ? cookie.slice(separatorIndex + 1) : '';
                return decodeURIComponent(value);
            }
        }
        return null;
    }
    function set(name: string, value: SettingValue, days: number): void {
        const expiresAt = new Date(now().getTime() + days * 24 * 60 * 60 * 1000);
        documentRef.cookie = `${name}=${value};expires=${expiresAt.toUTCString()};path=/`;
    }
    return { get, set };
}

let cookieSettingsRepository: SettingsStore | null = null;

/** document.cookie を使う共有インスタンス */
export function getCookieSettingsRepository(): SettingsStore {
    if (!cookieSettingsRepository) {
        cookieSettingsRepository = createCookieSettingsRepository();
    }
    return cookieSettingsRepository;
}

export function setCookie(name: string, value: SettingValue, days: number): void {
    getCookieSettingsRepository().set(name, value, days);
}

export function getCookie(name: string): string | null {
    return getCookieSettingsRepository().get(name);
}
