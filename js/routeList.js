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
            const details = await response.json();
            const tableBody = document.querySelector(config.selector);

            this.tableData[config.selector] = details;

            // テーブルに行を追加
            Object.keys(details).forEach((routeId) => {
                const { businessName, routeName, info, shipName, note, url } = details[routeId];

                const row = document.createElement('tr');

                // note の値に応じてクラスを設定
                if (note === 'season') {
                    row.classList.add('season-row');
                } else if (note === 'suspend') {
                    row.classList.add('suspend-row');
                }

                // セル作成
                [routeId, businessName, routeName, info, shipName].forEach((value) => {
                    const cell = document.createElement('td');
                    cell.textContent = value || '-';
                    row.appendChild(cell);
                });

                // URL セル
                const urlCell = document.createElement('td');
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = 'リンク';
                    link.target = '_blank';
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
    { dataPath: './data/seaRouteDetails.json', selector: '.sea-route-table tbody' },
    { dataPath: './data/internationalSeaRouteDetails.json', selector: '.international-sea-route-table tbody' },
    { dataPath: './data/seaRouteKRDetails.json', selector: '.sea-route-KR-table tbody' },
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