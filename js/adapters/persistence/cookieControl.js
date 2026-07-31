
/**
 * Cookie管理モジュール
 *
 * 責務:
 * - Cookie の読み書き（GET/SET）
 * - マップの中心座標・ズームレベルの永続化
 * - ユーザー設定（選択したレイヤーなど）の保存
 */

const DEFAULT_CENTER = [136.2923, 35.3622];
const DEFAULT_ZOOM = 5;

export function createCookieSettingsRepository(options = {}) {
    const { documentRef = document, now = () => new Date() } = options;
    function get(name) {
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
    function set(name, value, days) {
        const expiresAt = new Date(now().getTime() + days * 24 * 60 * 60 * 1000);
        documentRef.cookie = `${name}=${value};expires=${expiresAt.toUTCString()};path=/`;
    }
    return { get, set };
}

export function getInitialMapView(settingsRepository) {
    const savedCenter = settingsRepository.get('mapCenter');
    const savedZoom = settingsRepository.get('mapZoom');
    const center = savedCenter ? JSON.parse(savedCenter) : [...DEFAULT_CENTER];
    const zoom = savedZoom ? parseFloat(savedZoom) : DEFAULT_ZOOM;
    return [center, zoom];
}

let cookieSettingsRepository = null;

function getCookieSettingsRepository() {
    if (!cookieSettingsRepository) {
        cookieSettingsRepository = createCookieSettingsRepository();
    }
    return cookieSettingsRepository;
}

export function initCenterZoom() {
    return getInitialMapView(getCookieSettingsRepository());
}

export function setCookie(name, value, days) {
    getCookieSettingsRepository().set(name, value, days);
}

export function getCookie(name) {
    return getCookieSettingsRepository().get(name);
}
