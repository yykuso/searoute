// データを取得してテーブルに表示する関数
async function populateTable(detailsPath, tableSelector) {
    try {
        // JSON データを取得
        const response = await fetch(detailsPath);
        const details = await response.json();

        // テーブルの tbody 要素を取得
        const tableBody = document.querySelector(tableSelector);

        // 各データをテーブルに追加
        Object.keys(details).forEach((routeId) => {
            const { businessName, routeName, info, shipName, note, url } = details[routeId];

            const row = document.createElement('tr');

            // note の値に応じて行のクラスを設定
            if (note === 'season') {
                row.classList.add('season-row');
            } else if (note === 'suspend') {
                row.classList.add('suspend-row');
            }

            // 各プロパティをテーブルのセルに追加
            [routeId, businessName, routeName, info, shipName].forEach((value) => {
                const cell = document.createElement('td');
                cell.textContent = value || '-';
                row.appendChild(cell);
            });

            // URL を a タグとして追加
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

            // テーブルに行を追加
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
    }
}

// DOMContentLoaded イベントで関数を呼び出す
document.addEventListener('DOMContentLoaded', () => {
    populateTable('./data/seaRouteDetails.json', '.sea-route-table tbody');
    populateTable('./data/internationalSeaRouteDetails.json', '.international-sea-route-table tbody');
    populateTable('./data/seaRouteKRDetails.json', '.sea-route-KR-table tbody');
});

// 検索機能の実装
document.getElementById('searchbutton').addEventListener('click', function () {
    const input = document.getElementById('searchbox').value.toLowerCase();
    const messageBox = document.getElementById('search-message'); // メッセージ表示用の要素

    if (!input) {
        messageBox.textContent = ''; // メッセージをクリア
        return;
    }

    const rows = document.querySelectorAll('table tbody tr'); // テーブルの行を取得

    let found = false;

    // すべての行をリセット（表示状態に戻す）
    rows.forEach(row => {
        row.style.display = ''; // 行を再表示
    });

    // 入力値に基づいて行をフィルタリング
    rows.forEach(row => {
        const cells = row.querySelectorAll('td'); // 行内のセルを取得
        let rowMatches = false;

        cells.forEach(cell => {
            const text = cell.textContent.toLowerCase();

            // ハイライトをリセット
            const originalText = cell.getAttribute('data-original-text');
            if (originalText) {
                cell.innerHTML = originalText; // 元のテキストを復元
                cell.removeAttribute('data-original-text'); // 属性を削除
            }

            // セルのテキストが入力値を含む場合
            if (text.includes(input)) {
                rowMatches = true;

                if (!cell.getAttribute('data-original-text')) {
                    cell.setAttribute('data-original-text', cell.innerHTML);
                }

                // ハイライトを適用
                const regex = new RegExp(`(${input})`, 'gi');
                cell.innerHTML = cell.innerHTML.replace(regex, '<span style="background-color: #ffe46f;">$1</span>');
            }
        });

        if (!rowMatches) {
            row.style.display = 'none'; // 該当しない行を非表示
        } else {
            found = true; // 該当する行が見つかった
        }
    });

    // 見つからなかった場合のメッセージ表示
    if (!found) {
        messageBox.textContent = '見つかりませんでした。';
    } else {
        messageBox.textContent = ''; // メッセージをクリア
    }
});

// リセットボタンの実装
document.getElementById('resetbutton').addEventListener('click', function () {
    const rows = document.querySelectorAll('table tbody tr'); // テーブルの行を取得
    const messageBox = document.getElementById('search-message'); // メッセージ表示用の要素
    const searchBox = document.getElementById('searchbox'); // 検索ボックス

    // 検索ボックスをクリア
    searchBox.value = '';

    // すべての行を再表示
    rows.forEach(row => {
        row.style.display = ''; // 行を再表示
        const cells = row.querySelectorAll('td'); // 行内のセルを取得

        // ハイライトをリセット
        cells.forEach(cell => {
            const originalText = cell.getAttribute('data-original-text');
            if (originalText) {
                cell.innerHTML = originalText; // 元のテキストを復元
                cell.removeAttribute('data-original-text'); // 属性を削除
            }
        });
    });

    // メッセージをクリア
    messageBox.textContent = '';
});