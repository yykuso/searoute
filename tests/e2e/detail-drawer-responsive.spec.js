const { test, expect } = require('@playwright/test');

test('表示中の詳細ドロワーが画面幅に合わせて全体を切り替える', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto('/index.html');

    await page.evaluate(async () => {
        const drawer = document.getElementById('detail-drawer');
        drawer.style.display = '';
        const { showDetailDrawer } = await import('/js/presentation/map/detailDrawerView.js');
        const { buildSeaRouteSidebarContent } = await import('/js/presentation/drawerHelpers.js');
        const content = buildSeaRouteSidebarContent({
            routeId: 'route-1',
            lineId: 'line-1',
            routeName: '舟旅通勤 BLUE FERRY（晴海五丁目～日の出）',
            portName1: '晴海五丁目船着場',
            portName2: '日の出船着場',
        });
        showDetailDrawer(content, '東京湾クルージング');
    });

    const drawer = page.locator('#detail-drawer');
    const routeName = drawer.locator('[data-drawer-action="zoom-route"]');
    await expect(drawer).toBeVisible();
    await expect(routeName).toHaveCSS('text-align', 'left');
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().height)).toBe(720);

    await page.setViewportSize({ width: 600, height: 800 });
    await expect.poll(() => drawer.evaluate((element) => Math.round(element.getBoundingClientRect().height))).toBe(240);
    await expect.poll(() => drawer.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(600);

    await page.setViewportSize({ width: 1024, height: 720 });
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().height)).toBe(720);
    await expect.poll(() => drawer.evaluate((element) => element.getBoundingClientRect().width)).toBe(384);
});