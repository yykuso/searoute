/**
 * 詳細ドロワーのHTML生成ヘルパー関数
 * XSS対策とテンプレートの一元管理を提供
 */

/**
 * HTML 特殊文字をエスケープ（XSS 対策）
 * @param {*} value - エスケープ対象の値
 * @returns {string} - エスケープ済み文字列
 */
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 事業者名を主要部分と副要素に分割
 * @param {string} value - 事業者名（例: "会社名（子会社名）"）
 * @returns {Object} - { primary, secondary }
 */
export function splitBusinessName(value) {
    const businessName = value || 'N/A';
    if (!businessName.includes('（')) {
        return {
            primary: businessName,
            secondary: '',
        };
    }

    const parts = businessName.split('（');
    return {
        primary: parts[0],
        secondary: (parts[1] || '').replace('）', ''),
    };
}

/**
 * カンマ区切り文字列をブロック行に変換
 * @param {string} value - カンマ区切り文字列
 * @param {string} prefix - 各行のプリフィックス（デフォルト: 空文字）
 * @returns {string} - HTML 形式のブロック行
 */
export function toBlockLines(value, prefix = '') {
    if (!value) {
        return '';
    }

    return value.split(', ')
        .map((item) => `<span class="block">${prefix}${escapeHtml(item.trim())}</span>`)
        .join('');
}

/**
 * アクセントバー HTML を生成
 * @param {string} color - バーの背景色
 * @returns {string} - HTML 文字列
 */
export function createDrawerAccentBar(color) {
    return `
        <div class="mb-3">
            <div style="height:4px; width:100%; background:${color}; border-radius:6px;"></div>
        </div>
    `;
}

/**
 * ドロワーセクション HTML を生成
 * @param {Object} options - セクション設定
 *        - iconClass: アイコン CSS クラス（例: 'fas fa-route'）
 *        - title: セクションタイトル
 *        - titleColorClass: タイトルカラー CSS クラス（例: 'text-blue-600'）
 *        - iconColorClass: アイコンカラー CSS クラス（例: 'text-blue-500'）
 *        - body: セクション本体の HTML 文字列
 * @returns {string} - セクション HTML（body が空の場合は空文字列）
 */
export function createDrawerSection(options) {
    const {
        iconClass,
        title,
        titleColorClass,
        iconColorClass,
        body,
    } = options;

    if (!body) {
        return '';
    }

    return `
        <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
            <h3 class="flex items-center justify-between text-xs font-semibold ${titleColorClass} w-24 min-w-24 text-center mr-2">
                <i class="${iconClass} fa-fw mr-1 ${iconColorClass}"></i><span class="mx-auto">${title}</span>
            </h3>
            ${body}
        </div>
    `;
}

/**
 * URL からホスト名を取得
 * @param {string} url - URL 文字列
 * @returns {string} - ホスト名 または 元の URL（パース失敗時）
 */
export function getLinkHostname(url) {
    try {
        return new URL(url).hostname;
    } catch (error) {
        return url;
    }
}

/**
 * 航路ドロワー用のサイドバーコンテンツを生成
 * @param {Object} properties - 航路プロパティ
 * @param {string} sourceId - ソース ID（クリックイベント用）
 * @returns {string} - HTML コンテンツ
 */
export function buildSeaRouteSidebarContent(properties, sourceId) {
    const routeId = escapeHtml(properties.routeId || '');
    const lineId = escapeHtml(properties.lineId || '');
    const routeName = escapeHtml(properties.routeName || 'N/A');
    const sectionName = `${escapeHtml(properties.portName1 || 'N/A')}～${escapeHtml(properties.portName2 || 'N/A')}`;
    const url = properties.url || '';
    const linkDomain = escapeHtml(getLinkHostname(url));

    // 各セクションのbodyをあらかじめ構築（nullのときは空文字列）
    const freqInfoBody = properties.freqInfo ? `<div class="text-gray-800 text-xs">${toBlockLines(properties.freqInfo)}</div>` : '';
    const infoBody = properties.info ? `<div class="text-gray-800 text-xs">${toBlockLines(properties.info)}</div>` : '';
    const shipNameBody = properties.shipName ? `<ul class="text-gray-800 text-xs">${toBlockLines(properties.shipName, '・')}</ul>` : '';
    const urlBody = url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded">運行スケジュール - ${linkDomain}</a>` : '';

    return `
        ${createDrawerAccentBar(properties.color || '#e5e7eb')}
        ${createDrawerSection({
            iconClass: 'fas fa-route',
            title: '航路',
            titleColorClass: 'text-blue-600',
            iconColorClass: 'text-blue-500',
            body: `<div class="text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors" onclick="window.zoomToRoute({routeId: '${routeId}', sourceId: '${sourceId}'})">${routeName}</div>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-map-pin',
            title: '選択部分',
            titleColorClass: 'text-green-600',
            iconColorClass: 'text-green-500',
            body: `<div class="text-gray-800 text-xs cursor-pointer hover:text-blue-600 underline hover:underline transition-colors" onclick="window.zoomToRouteSection('${routeId}', '${lineId}', '${sourceId}')">${sectionName}</div>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-rotate',
            title: '運行頻度',
            titleColorClass: 'text-red-600',
            iconColorClass: 'text-red-500',
            body: freqInfoBody,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-info-circle',
            title: '情報',
            titleColorClass: 'text-yellow-600',
            iconColorClass: 'text-yellow-500',
            body: infoBody,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-ship',
            title: '船舶',
            titleColorClass: 'text-purple-600',
            iconColorClass: 'text-purple-500',
            body: shipNameBody,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-link',
            title: 'リンク',
            titleColorClass: 'text-indigo-600',
            iconColorClass: 'text-indigo-500',
            body: urlBody,
        })}
        <div id="drawer-ship-image" class="mt-2"></div>
    `;
}

/**
 * 港湾ドロワー用のサイドバーコンテンツを生成
 * @param {Object} properties - 港湾プロパティ
 * @param {string} googleMapsUrl - Google マップ URL
 * @returns {string} - HTML コンテンツ
 */
export function buildPortSidebarContent(properties, googleMapsUrl) {
    // 情報セクションのbodyをあらかじめ構築（nullのときは空文字列）
    const infoBody = properties.info ? `<div class="text-gray-800 text-xs">${toBlockLines(properties.info)}</div>` : '';

    return `
        ${createDrawerAccentBar('#505050')}
        ${createDrawerSection({
            iconClass: 'fas fa-map-marked-alt',
            title: '地図',
            titleColorClass: 'text-green-600',
            iconColorClass: 'text-green-500',
            body: `<a href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-blue-600 transition-all duration-200 rounded">Googleマップで開く</a>`,
        })}
        ${createDrawerSection({
            iconClass: 'fas fa-info-circle',
            title: '情報',
            titleColorClass: 'text-yellow-600',
            iconColorClass: 'text-yellow-500',
            body: infoBody,
        })}
    `;
}
