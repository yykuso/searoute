
export function initCenterZoom() {
    // デフォルト設定
    const defaultCenter = [136.2923, 35.3622];
    const defaultZoom = 5;

    // Cookieから情報を取得
    const savedCenter = getCookie("mapCenter");
    const savedZoom = getCookie("mapZoom");

    // 保存された値を使用
    const mapCenter = savedCenter ? JSON.parse(savedCenter) : defaultCenter;
    const mapZoom = savedZoom ? parseFloat(savedZoom) : defaultZoom;

    return [mapCenter, mapZoom];
}

export function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

export function getCookie(name) {
    const cookies = document.cookie.split("; ");
    for (let cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return null;
}
