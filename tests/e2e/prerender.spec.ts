import { test, expect } from '@playwright/test';
import type { ConsoleMessage, Page } from '@playwright/test';

/** ハイドレーション不一致・React のエラーを拾う（外部タイル等の読み込み失敗は対象外） */
function collectReactErrors(page: Page): string[] {
    const errors: string[] = [];
    // ローカル配信では外部タイル（pmtiles.searoute.info）が CORS で拒否される（旧版も同じ）ため対象外
    const isNetworkNoise = (text: string) => /Failed to (load resource|fetch)|net::ERR|AJAXError|NetworkError|CORS policy/i.test(text);
    page.on('console', (message: ConsoleMessage) => {
        if ((message.type() === 'error' || message.type() === 'warning') && !isNetworkNoise(message.text())) {
            if (/hydrat|did not match|Minified React error|#418|#423|#425/i.test(message.text()) || message.type() === 'error') {
                errors.push(message.text());
            }
        }
    });
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
}

test.describe('JavaScript 無効でもプリレンダリングした静的コンテンツを表示する', () => {
    test.use({ javaScriptEnabled: false });

    test('地図ページ', async ({ page }) => {
        await page.goto('/index.html');
        await expect(page.getByRole('heading', { level: 1, name: 'おでかけ航路マップ' })).toBeVisible();
        await expect(page.locator('noscript')).toHaveCount(1);
        // 旧版と同じく、モーダル・ドロワーは DOM にあり初期状態は非表示
        await expect(page.locator('#info-window h2.heading-tag')).toHaveText(['サイト情報', '開発者について']);
        await expect(page.locator('#info-window')).toBeHidden();
        await expect(page.locator('#privacy-policy-window h3')).toHaveText([
            'Cookieの利用について',
            'Googleアナリティクス',
            '地図・外部サービス',
            '個人情報の取り扱い',
        ]);
        await expect(page.locator('#site-build-number')).toHaveText(/^(local|[0-9a-f]{7})$/);
        await expect(page.locator('#detail-drawer-title')).toHaveText('詳細情報');
        await expect(page.locator('#cookie-banner')).toContainText('当サイトはCookieを使用しております。');
    });

    test('航路一覧ページ', async ({ page }) => {
        await page.goto('/routeList.html');
        await expect(page.getByRole('heading', { level: 1, name: '航路一覧' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 2 })).toHaveText(['国内航路', '国際航路', '韓国 国内航路']);
        await expect(page.getByPlaceholder('検索キーワードを入力')).toBeVisible();
        await expect(page.getByRole('button', { name: '検索', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: '専用フォーム' })).toBeVisible();
        await expect(page.locator('.sea-route-table thead th')).toHaveCount(6);
    });
});

test('配信される HTML にプリレンダリング結果とビルド番号が含まれる', async ({ request }) => {
    const indexHtml = await (await request.get('/index.html')).text();
    expect(indexHtml).toContain('<h1>おでかけ航路マップ</h1>');
    expect(indexHtml).toMatch(/<span id="site-build-number">(local|[0-9a-f]{7})<\/span>/);
    expect(indexHtml).toContain('id="privacy-policy-window"');
    const routeListHtml = await (await request.get('/routeList.html')).text();
    expect(routeListHtml).toContain('<h1>航路一覧</h1>');
    expect(routeListHtml).toContain('id="searchbox"');
});

test('Cookie バナーは同意前はハイドレーション前から表示し、同意後は表示しない', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveAttribute('data-cookie-banner', 'show');
    await expect(page.locator('#cookie-banner')).toBeVisible();
    await expect(page.locator('#cookie-banner')).toHaveCSS('position', 'fixed');
    await page.locator('#cookie-close-btn').click();
    await expect(page.locator('#cookie-banner')).toBeHidden();
    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-cookie-banner', 'show');
    await expect(page.locator('#cookie-banner')).toBeHidden();
});

test('ハイドレーションでエラー・警告が出ない（地図ページ）', async ({ page }) => {
    const errors = collectReactErrors(page);
    await page.goto('/index.html');
    await expect(page.locator('#layers-control')).toBeVisible({ timeout: 30_000 });
    // ハイドレーション後に操作できる
    await page.locator('#hamburger-control').hover();
    await page.getByRole('link', { name: 'サイト情報' }).click();
    await expect(page.locator('#info-window')).toBeVisible();
    expect(errors).toEqual([]);
});

test('ハイドレーションでエラー・警告が出ない（航路一覧ページ）', async ({ page }) => {
    await page.route('https://pmtiles.searoute.info/lightweight/*.json', (route) => route.fulfill({
        json: { records: [{ routeId: 1, businessName: 'Example', routeName: 'Ocean' }] },
    }));
    const errors = collectReactErrors(page);
    await page.goto('/routeList.html');
    await expect(page.locator('.sea-route-table tbody tr')).toHaveCount(1);
    expect(errors).toEqual([]);
});
