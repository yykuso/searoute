/**
 * Font Awesome アイコン（インライン SVG）
 *
 * Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 * Copyright 2026 Fonticons, Inc.
 *
 * 旧版の Web フォント（<i class="fa-solid fa-xmark">）を置き換える。<i> と class はそのまま残し
 * （CSS セレクター・テストが参照するため）、中に使用するアイコンだけの SVG パスを描画する。
 * 寸法・位置はフォントのグリフと同じになるよう src/styles/icons.css で合わせている。
 */
import type { CSSProperties } from 'react';
import {
    faBan,
    faBars,
    faBicycle,
    faCalendarDays,
    faCar,
    faCheck,
    faCircleCheck,
    faCircleInfo,
    faFilter,
    faGift,
    faLayerGroup,
    faLink,
    faLocationDot,
    faLock,
    faMap,
    faMapLocationDot,
    faMapPin,
    faMotorcycle,
    faPenToSquare,
    faRotate,
    faRoute,
    faShareNodes,
    faShip,
    faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/** 使用するアイコンのみ（キーは旧版（Font Awesome 6.4.0 の Web フォント）のクラス名。旧名の別名も含む） */
const ICONS: Record<string, IconDefinition> = {
    'fa-ban': faBan,
    'fa-bars': faBars,
    'fa-bicycle': faBicycle,
    'fa-calendar-days': faCalendarDays,
    'fa-car': faCar,
    'fa-check': faCheck,
    'fa-circle-check': faCircleCheck,
    'fa-circle-info': faCircleInfo,
    'fa-info-circle': faCircleInfo,
    'fa-filter': faFilter,
    'fa-gift': faGift,
    'fa-github': faGithub,
    'fa-layer-group': faLayerGroup,
    'fa-link': faLink,
    'fa-location-dot': faLocationDot,
    'fa-lock': faLock,
    'fa-map': faMap,
    'fa-map-location-dot': faMapLocationDot,
    'fa-map-marked-alt': faMapLocationDot,
    'fa-map-pin': faMapPin,
    'fa-motorcycle': faMotorcycle,
    'fa-pen-to-square': faPenToSquare,
    'fa-rotate': faRotate,
    'fa-route': faRoute,
    'fa-share-nodes': faShareNodes,
    'fa-ship': faShip,
    'fa-twitter': faTwitter,
    'fa-xmark': faXmark,
};

function findIcon(className: string): IconDefinition | null {
    for (const name of className.split(/\s+/)) {
        const icon = ICONS[name];
        if (icon) return icon;
    }
    return null;
}

/** className は旧版の <i> の class（例: "fa-solid fa-xmark fa-lg"）をそのまま渡す */
export function Icon({ className }: { className: string }) {
    const definition = findIcon(className);
    // 未登録アイコンで画面全体を落とさない（ICONS への登録漏れは警告で気付けるようにする）
    if (!definition) {
        console.warn(`未登録のアイコンです: ${className}`);
        return <i className={className} />;
    }
    const [width, height, , , path] = definition.icon;
    // フォントのグリフ幅（= viewBox の幅 / 高さ em）。.fa-fw 等の width 指定があればそちらが優先される
    const style = { '--fa-w': `${width / height}em` } as CSSProperties;
    return (
        <i className={className} style={style}>
            <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
                <path d={Array.isArray(path) ? path.join(' ') : path} />
            </svg>
        </i>
    );
}
