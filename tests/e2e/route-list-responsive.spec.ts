import { test, expect } from '@playwright/test';

// route-list.spec.ts と同じモック（ビルドは SEAROUTE_SKIP_ROUTE_DATA=1 なので一覧用 JSON をブラウザで取得する）
test.beforeEach(async ({ page }) => {
    await page.route('https://pmtiles.searoute.info/lightweight/*.json', async (route) => {
        const fileName = new URL(route.request().url()).pathname.split('/').pop();
        const records = fileName === 'seaRoute.json'
            ? [
                {
                    routeId: 2,
                    businessName: 'Example Ferry',
                    routeName: 'Ocean [Route]',
                    information: '毎日運航',
                    url: 'https://example.com/timetable',
                },
                {
                    routeId: 10,
                    businessName: 'Island Lines',
                    routeName: '離島航路',
                    note: 'season',
                },
            ]
            : [];

        await route.fulfill({ json: { records } });
    });
});

test('スマホ幅では横スクロールせず行をカードで表示する', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/routeList.html');
    const row = page.locator('.sea-route-table tbody tr').first();
    await expect(row).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await expect(page.locator('.sea-route-table thead')).toHaveCSS('position', 'absolute'); // sr-only
    await expect(row).toHaveCSS('display', 'block');
});

test('PC幅では表として表示する', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/routeList.html');
    await expect(page.locator('.sea-route-table tbody tr').first()).toHaveCSS('display', 'table-row');
});
