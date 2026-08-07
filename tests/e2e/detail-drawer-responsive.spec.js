const { test, expect } = require('@playwright/test');

test('表示中の詳細ドロワーが画面幅に合わせて全体を切り替える', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto('/index.html');

    await page.evaluate(async () => {
        const drawer = document.getElementById('detail-drawer');
        drawer.style.display = '';
        const { showDetailDrawer } = await import('/js/presentation/map/detailDrawerView.js');
        showDetailDrawer('<p>responsive drawer</p>', '詳細情報');
    });

    const drawer = page.locator('#detail-drawer');
    await expect(drawer).toBeVisible();
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().height)).toBe(720);

    await page.setViewportSize({ width: 600, height: 800 });
    await expect.poll(() => drawer.evaluate((element) => Math.round(element.getBoundingClientRect().height))).toBe(240);
    await expect.poll(() => drawer.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(600);

    await page.setViewportSize({ width: 1024, height: 720 });
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().height)).toBe(720);
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().width)).toBe(384);
});