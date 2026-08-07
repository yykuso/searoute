const { test, expect } = require('@playwright/test');

test('マップコントロールのダブルタップ拡大を抑止する', async ({ page }) => {
    await page.goto('/index.html');

    const controls = page.locator('.maplibregl-ctrl');
    await expect(controls.first()).toBeVisible({ timeout: 30_000 });

    const touchActions = await controls.evaluateAll((elements) => (
        elements.map((element) => getComputedStyle(element).touchAction)
    ));
    expect(touchActions).not.toHaveLength(0);
    expect(touchActions.every((touchAction) => touchAction === 'manipulation')).toBe(true);
});

test('航路フィルターを変更して表示とCookieへ反映する', async ({ page }) => {
    await page.goto('/index.html');

    const filterControl = page.locator('#route-filter-control');
    const filterToggle = filterControl.getByRole('button', { name: '航路フィルタ' });
    await expect(filterToggle).toBeVisible({ timeout: 30_000 });

    await filterControl.hover();

    const activeFilter = filterControl.locator('[data-route-filter-group="status"][data-route-filter-key="active"]');
    const seasonFilter = filterControl.locator('[data-route-filter-group="status"][data-route-filter-key="season"]');
    const suspendedFilter = filterControl.locator('[data-route-filter-group="status"][data-route-filter-key="suspend"]');

    await expect(activeFilter).toBeChecked();
    await expect(seasonFilter).toBeChecked();
    await expect(suspendedFilter).not.toBeChecked();

    await suspendedFilter.check();

    await expect(filterToggle).toHaveClass(/route-filter-active/);
    await expect(page.locator('#settings-window [data-route-filter-group="status"][data-route-filter-key="suspend"]')).toBeChecked();

    const savedFilters = await page.evaluate(() => {
        const cookie = document.cookie
            .split('; ')
            .find((entry) => entry.startsWith('routeFilters='));
        return cookie ? JSON.parse(decodeURIComponent(cookie.split('=')[1])) : null;
    });

    expect(savedFilters).toEqual({
        status: { active: true, season: true, suspend: true },
        carriage: { car: false, bike: false, bicycle: false },
    });
});