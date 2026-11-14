import { test, expect } from '@playwright/test';

// Service Worker 経由の fetch は page.route で差し替えられないため無効化する
test.use({ serviceWorkers: 'block' });

// 共有URL（港湾）から詳細ドロワーを開く。港湾データはローカルの /data/portData.geojson を使うため外部通信に依存しない
const PORT_SHARE_URL = `/index.html?share=port&lat=34.6833&lng=135.1833&name=${encodeURIComponent('神戸')}`;

test('表示中の詳細ドロワーが画面幅に合わせて全体を切り替える', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto(PORT_SHARE_URL);

    const drawer = page.locator('#detail-drawer');
    await expect(page.locator('#detail-drawer-title')).toContainText('神戸', { timeout: 30_000 });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Googleマップで開く' })).toBeVisible();
    // 共有URLのクエリは復元後に取り除かれる
    await expect.poll(() => new URL(page.url()).search).toBe('');

    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().height)).toBe(720);
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().left)).toBe(0);

    await page.setViewportSize({ width: 600, height: 800 });
    await expect.poll(() => drawer.evaluate((element) => Math.round(element.getBoundingClientRect().height))).toBe(240);
    await expect.poll(() => drawer.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(600);

    await page.setViewportSize({ width: 1024, height: 720 });
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().height)).toBe(720);
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().width)).toBe(384);

    // 閉じるとPCでは左へスライドアウトする
    await page.getByRole('button', { name: '詳細情報を閉じる' }).click();
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
});

test('座標の共有URLから座標ドロワー・住所・ピンを復元する', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.route('https://nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: { display_name: 'テスト住所' } }));
    await page.goto('/index.html?share=coord&lat=35.00000&lng=136.00000');

    await expect(page.locator('#detail-drawer-title')).toContainText('35.00000, 136.00000', { timeout: 30_000 });
    await expect(page.locator('#detail-drawer-title')).toContainText('座標情報');
    await expect(page.locator('#reverse-geocode-address')).toHaveText('テスト住所');
    await expect(page.locator('.maplibregl-marker')).toHaveCount(1);
});
