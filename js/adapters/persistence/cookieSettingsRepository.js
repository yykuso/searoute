export function createCookieSettingsRepository(options = {}) {
    const {
        documentRef = document,
        now = () => new Date(),
    } = options;

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