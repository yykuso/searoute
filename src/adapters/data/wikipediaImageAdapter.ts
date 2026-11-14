/**
 * Wikipedia API を使って船・会社の画像を検索する（ImageSearchPort の実装）
 * 表示用HTMLの生成は presentation 側で行う
 */
import type { ImageSearchPort, ShipImage } from '../../application/ports';

interface WikipediaSearchResponse {
    query?: { search?: Array<{ title: string }> };
}

interface WikipediaPageImagesResponse {
    query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
}

/**
 * Wikipedia でクエリを検索し、サムネイル画像URLとページタイトルを返す
 */
export async function fetchWikipediaImage(query: string): Promise<ShipImage | null> {
    // Step1: ページタイトルを検索
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json() as WikipediaSearchResponse;
    const hit = searchData?.query?.search?.[0];
    if (!hit) return null;
    const pageTitle = hit.title;

    // Step2: そのページのサムネイル画像を取得
    const imgUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=400&format=json&origin=*`;
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) return null;
    const imgData = await imgRes.json() as WikipediaPageImagesResponse;
    const pages = imgData?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    const src = page?.thumbnail?.source ?? null;
    return src ? { src, title: pageTitle } : null;
}

/**
 * 「会社名 + 船名」で検索し、ヒットしなければ「会社名」のみで再試行
 * shipName が null/空のときは null
 * @param shipName - カンマ区切りの船名（最初の1隻を使用）
 */
export async function findShipImage(shipName: string | null | undefined, businessName: string): Promise<ShipImage | null> {
    if (!shipName) return null;

    const firstShip = shipName.split(',')[0].trim();

    let result = businessName
        ? await fetchWikipediaImage(`${businessName} ${firstShip}`)
        : null;

    if (!result && businessName) {
        result = await fetchWikipediaImage(businessName);
    }

    return result;
}

export const wikipediaImageSearch: ImageSearchPort = { findShipImage };
