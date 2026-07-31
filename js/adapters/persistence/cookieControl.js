
/**
 * Cookie管理モジュール
 *
 * 責務:
 * - Cookie の読み書き（GET/SET）
 * - マップの中心座標・ズームレベルの永続化
 * - ユーザー設定（選択したレイヤーなど）の保存
 */

import { createCookieSettingsRepository } from './cookieSettingsRepository.js';
import { getInitialMapView } from '../../application/getInitialMapView.js';

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
