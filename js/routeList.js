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

            const rows = this.normalizeRows(data);
            const visibleColumns = this.getVisibleColumns(rows);

            this.applyColumnVisibility(tableBody, visibleColumns);

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

                visibleColumns.forEach((column) => {
                    if (column === 'routeName') {
                        const routeNameCell = document.createElement('td');
                        const routeNameLink = document.createElement('a');
                        routeNameLink.href = this.buildRouteMapUrl(routeId, config.sourceId);
                        routeNameLink.textContent = routeName || '-';
                        routeNameLink.rel = 'noopener noreferrer';
                        routeNameCell.appendChild(routeNameLink);
                        row.appendChild(routeNameCell);
                        return;
                    }

                    if (column === 'url') {
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
                        return;
                    }

                    const cell = document.createElement('td');
                    cell.textContent = rowData[column] || '-';
                    row.appendChild(cell);
                });

                tableBody.appendChild(row);
            });

            // オリジナル状態を保存
            this.cacheOriginalRows(config.selector);
        } catch (error) {
            console.error(`データ読み込み失敗 (${config.dataPath}):`, error);
        }
    }

    normalizeRows(data) {
        if (data && Array.isArray(data.features)) {
            return this.normalizeGeoJsonRows(data);
        }

        if (data && Array.isArray(data.records)) {
            return this.normalizeLightweightRows(data.records);
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

    normalizeLightweightRows(records) {
        return records
            .map((record) => {
                return {
                    routeId: String(record.routeId),
                    businessName: record.businessName,
                    routeName: record.routeName,
                    info: record.info || record.information || this.infoFromNote(record.note),
                    shipName: record.shipName,
                    note: record.note,
                    url: record.url,
                };
            })
            .sort((a, b) => this.compareRouteId(a.routeId, b.routeId));
    }

    normalizeGeoJsonRows(geojson) {
        const routeMap = new Map();

        geojson.features.forEach((feature) => {
            const props = feature?.properties || {};
            if (props.routeId === undefined || props.routeId === null) {
                return;
            }

            const routeId = String(props.routeId);
            const previous = routeMap.get(routeId) || {};

            routeMap.set(routeId, {
                routeId,
                businessName: props.businessName || previous.businessName,
                routeName: props.routeName || previous.routeName,
                info: props.info || props.information || this.infoFromNote(props.note) || previous.info,
                shipName: props.shipName || previous.shipName,
                note: props.note || previous.note,
                url: props.url || previous.url,
            });
        });

        return Array.from(routeMap.values()).sort((a, b) => this.compareRouteId(a.routeId, b.routeId));
    }

    getVisibleColumns(rows) {
        const columns = ['routeId', 'businessName', 'routeName', 'info', 'shipName', 'url'];

        return columns.filter((column) => {
            if (column === 'routeId' || column === 'businessName' || column === 'routeName') {
                return true;
            }

            return rows.some((row) => {
                const value = row[column];
                return value !== undefined && value !== null && value !== '';
            });
        });
    }

    applyColumnVisibility(tableBody, visibleColumns) {
        const table = tableBody.closest('table');
        if (!table) {
            return;
        }

        const columnClassMap = {
            routeId: ['route-id'],
            businessName: ['business-name'],
            routeName: ['route-name'],
            info: ['info', 'information'],
            shipName: ['ship-name'],
            url: ['url'],
        };

        Object.entries(columnClassMap).forEach(([column, classNames]) => {
            const isVisible = visibleColumns.includes(column);
            classNames.forEach((className) => {
                table.querySelectorAll(`.${className}`).forEach((cell) => {
                    cell.style.display = isVisible ? '' : 'none';
                });
            });
        });
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
        dataPath: 'https://pmtiles.searoute.info/lightweight/seaRoute.json',
        selector: '.sea-route-table tbody',
        sourceId: 'geojson_sea_route'
    },
    {
        dataPath: 'https://pmtiles.searoute.info/lightweight/seaRoute_international.json',
        selector: '.international-sea-route-table tbody',
        sourceId: 'geojson_international_sea_route'
    },
    {
        dataPath: 'https://pmtiles.searoute.info/lightweight/seaRoute_KR.json',
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