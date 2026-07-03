/**
 * 航路テーブル管理クラス
 * 複数のテーブルを統合管理し、検索・リセット機能を提供する
 */
class RouteTableManager {
    constructor(tables) {
        /**
         * @param {Array} tables - テーブル設定配列
         *        [
         *          { dataPath: './data/seaRouteDetails.json', selector: '.sea-route-table tbody' },
         *          ...
         *        ]
         */
        this.tables = tables;
        this.tableData = {}; // テーブルIDごとのデータキャッシュ
        this.originalRows = {}; // オリジナルのHTML保存用
    }

    /**
     * 全テーブルを初期化＆データ読み込み
     */
    async initialize() {
        for (const tableConfig of this.tables) {
            await this.loadTableData(tableConfig);
        }
    }

    /**
     * テーブルデータを読み込んでDOM生成
     */
    async loadTableData(config) {
        try {
            const response = await fetch(config.dataPath);
            const data = await response.json();
            const tableBody = document.querySelector(config.selector);

            if (!tableBody) {
                throw new Error(`Table body not found: ${config.selector}`);
            }

            const details = await this.loadDetailsIndex(config);
            const rows = this.normalizeRows(data, details);

            this.tableData[config.selector] = rows;

            // テーブルに行を追加
            rows.forEach((rowData) => {
                const { routeId, businessName, routeName, info, shipName, note, url } = rowData;

                const row = document.createElement('tr');

                // note の値に応じてクラスを設定
                if (note === 'season') {
                    row.classList.add('season-row');
                } else if (note === 'suspend') {
                    row.classList.add('suspend-row');
                }

                // セル作成
                [routeId, businessName, info, shipName].forEach((value) => {
                    const cell = document.createElement('td');
                    cell.textContent = value || '-';
                    row.appendChild(cell);
                });

                const routeNameCell = document.createElement('td');
                const routeNameLink = document.createElement('a');
                routeNameLink.href = this.buildRouteMapUrl(routeId, config.sourceId);
                routeNameLink.textContent = routeName || '-';
                routeNameLink.rel = 'noopener noreferrer';
                routeNameCell.appendChild(routeNameLink);
                row.insertBefore(routeNameCell, row.children[2]);

                // URL セル
                const urlCell = document.createElement('td');
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = 'リンク';
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    urlCell.appendChild(link);
                } else {
                    urlCell.textContent = '-';
                }
                row.appendChild(urlCell);

                tableBody.appendChild(row);
            });

            // オリジナル状態を保存
            this.cacheOriginalRows(config.selector);
        } catch (error) {
            console.error(`データ読み込み失敗 (${config.dataPath}):`, error);
        }
    }

    async loadDetailsIndex(config) {
        if (!config.detailsPath) {
            return {};
        }

        try {
            const response = await fetch(config.detailsPath);
            if (!response.ok) {
                return {};
            }
            return await response.json();
        } catch (error) {
            console.warn(`詳細データ読み込み失敗 (${config.detailsPath}):`, error);
            return {};
        }
    }

    normalizeRows(data, detailsIndex) {
        if (data && Array.isArray(data.features)) {
            return this.normalizeGeoJsonRows(data, detailsIndex);
        }

        if (data && typeof data === 'object') {
            return Object.entries(data).map(([routeId, detail]) => ({
                routeId,
                businessName: detail.businessName,
                routeName: detail.routeName,
                info: detail.info || detail.information || this.infoFromNote(detail.note),
                shipName: detail.shipName,
                note: detail.note,
                url: detail.url,
            }));
        }

        return [];
    }

    normalizeGeoJsonRows(geojson, detailsIndex) {
        const routeMap = new Map();

        geojson.features.forEach((feature) => {
            const props = feature?.properties || {};
            if (props.routeId === undefined || props.routeId === null) {
                return;
            }

            const routeId = String(props.routeId);
            const detail = detailsIndex[routeId] || {};
            const previous = routeMap.get(routeId) || {};

            routeMap.set(routeId, {
                routeId,
                businessName: detail.businessName || props.businessName || previous.businessName,
                routeName: detail.routeName || props.routeName || previous.routeName,
                info: detail.info || detail.information || props.info || props.information || this.infoFromNote(detail.note || props.note) || previous.info,
                shipName: detail.shipName || props.shipName || previous.shipName,
                note: detail.note || props.note || previous.note,
                url: detail.url || props.url || previous.url,
            });
        });

        return Array.from(routeMap.values()).sort((a, b) => this.compareRouteId(a.routeId, b.routeId));
    }

    infoFromNote(note) {
        if (note === 'season') {
            return '季節運航';
        }
        if (note === 'suspend') {
            return '運休中';
        }
        return undefined;
    }

    compareRouteId(a, b) {
        const aNumeric = /^\d+$/.test(a);
        const bNumeric = /^\d+$/.test(b);

        if (aNumeric && bNumeric) {
            return Number(a) - Number(b);
        }

        return a.localeCompare(b, 'ja', { numeric: true });
    }

    /**
     * 航路の共有URLを生成
     */
    buildRouteMapUrl(routeId, sourceId) {
        const url = new URL('./index.html', window.location.href);
        url.searchParams.set('share', 'route');
        url.searchParams.set('routeId', routeId);
        url.searchParams.set('sourceId', sourceId);
        return url.toString();
    }

    /**
     * テーブルのオリジナル行をキャッシュ
     */
    cacheOriginalRows(selector) {
        const tableBody = document.querySelector(selector);
        this.originalRows[selector] = tableBody.innerHTML;
    }

    /**
     * 全テーブルで検索を実行
     */
    search(query) {
        if (!query) {
            // クエリなしの場合はメッセージクリア
            document.getElementById('search-message').textContent = '';
            return;
        }

        const lowerQuery = query.toLowerCase();
        const rows = document.querySelectorAll('table tbody tr');
        let found = false;

        // 全行をリセット
        rows.forEach(row => row.style.display = '');

        // 各行をフィルター
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let matches = false;

            cells.forEach(cell => {
                const text = cell.textContent.toLowerCase();

                // ハイライトをリセット
                const originalHtml = cell.getAttribute('data-original-text');
                if (originalHtml) {
                    cell.innerHTML = originalHtml;
                    cell.removeAttribute('data-original-text');
                }

                // マッチ判定＆ハイライト
                if (text.includes(lowerQuery)) {
                    matches = true;

                    if (!cell.getAttribute('data-original-text')) {
                        cell.setAttribute('data-original-text', cell.innerHTML);
                    }

                    const regex = new RegExp(`(${lowerQuery})`, 'gi');
                    cell.innerHTML = cell.innerHTML.replace(regex, '<span style="background-color: #ffe46f;">$1</span>');
                }
            });

            if (!matches) {
                row.style.display = 'none';
            } else {
                found = true;
            }
        });

        // メッセージ表示
        document.getElementById('search-message').textContent = found ? '' : '見つかりませんでした。';
    }

    /**
     * 全テーブルをリセット
     */
    reset() {
        const searchBox = document.getElementById('searchbox');
        const rows = document.querySelectorAll('table tbody tr');

        // 検索ボックスクリア
        searchBox.value = '';

        // 行のリセット
        rows.forEach(row => {
            row.style.display = '';
            const cells = row.querySelectorAll('td');

            cells.forEach(cell => {
                const originalHtml = cell.getAttribute('data-original-text');
                if (originalHtml) {
                    cell.innerHTML = originalHtml;
                    cell.removeAttribute('data-original-text');
                }
            });
        });

        // メッセージクリア
        document.getElementById('search-message').textContent = '';
    }
}

// テーブル設定
const TABLE_CONFIGS = [
    {
        dataPath: './data/seaRoute_enriched.geojson',
        detailsPath: './data/old/seaRouteDetails.json',
        selector: '.sea-route-table tbody',
        sourceId: 'geojson_sea_route'
    },
    {
        dataPath: './data/old/internationalSeaRoute.geojson',
        detailsPath: './data/old/internationalSeaRouteDetails.json',
        selector: '.international-sea-route-table tbody',
        sourceId: 'geojson_international_sea_route'
    },
    {
        dataPath: './data/old/seaRouteKR.geojson',
        detailsPath: './data/old/seaRouteKRDetails.json',
        selector: '.sea-route-KR-table tbody',
        sourceId: 'geojson_KR_sea_route'
    },
];

// テーブルマネージャーインスタンス
const tableManager = new RouteTableManager(TABLE_CONFIGS);

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    await tableManager.initialize();
});

// 検索ボタン
document.getElementById('searchbutton').addEventListener('click', () => {
    const query = document.getElementById('searchbox').value;
    tableManager.search(query);
});

// リセットボタン
document.getElementById('resetbutton').addEventListener('click', () => {
    tableManager.reset();
});