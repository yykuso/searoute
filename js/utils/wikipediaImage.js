/**
 * Wikipedia API を使って船・会社の画像を取得・表示するユーティリティ
 */

/**
 * Wikipedia でクエリを検索し、サムネイル画像URLを返す
 * @param {string} query - 検索クエリ
 * @returns {Promise<{src: string, title: string}|null>} - サムネイルURL とページタイトル or null
 */
async function fetchWikipediaImage(query) {
    // Step1: ページタイトルを検索
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const hit = searchData?.query?.search?.[0];
    if (!hit) return null;
    const pageTitle = hit.title;

    // Step2: そのページのサムネイル画像を取得
    const imgUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=400&format=json&origin=*`;
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();
    const pages = imgData?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    const src = page?.thumbnail?.source ?? null;
    return src ? { src, title: pageTitle } : null;
}

/**
 * 画像をコンテナDOMに挿入するヘルパー（現在未使用）
 *//**
 * ドロワー内の画像エリアに Wikipedia 画像を非同期で挿入する
 * 「会社名 + 船名」で検索し、ヒットしなければ「会社名」のみで再試行
 * shipName が null/空のときは何もしない
 * @param {string|null} shipName - カンマ区切りの船名（最初の1隻を使用）
 * @param {string} businessName - 会社名
 */
export async function loadShipImageIntoDrawer(shipName, businessName) {
    if (!shipName) return;

    const container = document.getElementById('drawer-ship-image');
    if (!container) return;

    const firstShip = shipName.split(',')[0].trim();

    try {
        // まず「会社名 + 船名」で検索
        let result = businessName
            ? await fetchWikipediaImage(`${businessName} ${firstShip}`)
            : null;

        // ヒットしなければ会社名のみで再試行
        if (!result && businessName) {
            result = await fetchWikipediaImage(businessName);
        }

        if (result) {
            const pageUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(result.title)}`;
            container.innerHTML = `
                <img src="${result.src}" alt="${result.title}" class="rounded w-full object-cover max-h-36">
                <a href="${pageUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-slate-400 mt-0.5 truncate block text-right underline hover:text-blue-500 transition-colors">${result.title} - Wikipedia</a>
            `;
        }
    } catch {
        // 失敗時は何も表示しない
    }
}
