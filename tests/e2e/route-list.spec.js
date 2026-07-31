const { test, expect } = require('@playwright/test');

test('航路一覧を描画して検索・リセットできる', async ({ page }) => {
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

    await page.goto('/routeList.html');

    const domesticRows = page.locator('.sea-route-table tbody tr');
    await expect(domesticRows).toHaveCount(2);
    await expect(domesticRows.first()).toContainText('Ocean [Route]');
    await expect(domesticRows.nth(1)).toHaveClass(/season-row/);

    const routeLink = domesticRows.first().locator('td').nth(2).getByRole('link');
    await expect(routeLink).toHaveAttribute('href', /share=route/);
    await expect(routeLink).toHaveAttribute('href', /routeId=2/);
    await expect(routeLink).toHaveAttribute('href', /sourceId=geojson_sea_route/);

    await page.getByPlaceholder('検索キーワードを入力').fill('[Route]');
    await page.getByRole('button', { name: '検索', exact: true }).click();

    await expect(domesticRows.first()).toBeVisible();
    await expect(domesticRows.first().locator('span')).toHaveText('[Route]');
    await expect(domesticRows.nth(1)).toBeHidden();

    await page.getByRole('button', { name: 'リセット' }).click();

    await expect(domesticRows.nth(1)).toBeVisible();
    await expect(page.locator('#searchbox')).toHaveValue('');
});