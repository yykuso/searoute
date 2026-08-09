const { test, expect } = require('@playwright/test');

test('マップUIのピンチ拡大と横ドラッグを抑止する', async ({ page }) => {
    await page.goto('/index.html');

    const controls = page.locator('.maplibregl-ctrl');
    await expect(controls.first()).toBeVisible({ timeout: 30_000 });

    await expect(controls.first()).toHaveCSS('touch-action', 'pan-y');
    await expect(page.locator('.maplibregl-ctrl button').first()).toHaveCSS('touch-action', 'none');
    await expect(page.locator('.maplibregl-ctrl-layers-toggle')).toHaveCSS('touch-action', 'none');

    const windows = page.locator('#info-window, #settings-window, #privacy-policy-window');
    await expect(windows).toHaveCount(3);
    const touchActions = await windows.evaluateAll((elements) => (
        elements.map((element) => getComputedStyle(element).touchAction)
    ));
    expect(touchActions).toEqual(['pan-y', 'pan-y', 'pan-y']);
});

test('レイヤー項目をオフにすると通常の文字ウェイトへ戻る', async ({ page }) => {
    await page.goto('/index.html');

    const layersControl = page.locator('#layers-control');
    await expect(layersControl).toBeVisible({ timeout: 30_000 });
    await layersControl.hover();

    const checkbox = layersControl.locator('input[type="checkbox"]').first();
    const layerItem = checkbox.locator('..');
    const label = layerItem.locator('label');
    await expect(checkbox).toBeVisible();

    await checkbox.check();
    await expect(label).toHaveCSS('font-weight', '600');

    await checkbox.uncheck();
    await layerItem.hover();
    await expect(label).toHaveCSS('font-weight', '500');

    const radios = layersControl.locator('input[type="radio"]');
    const previousRadio = radios.first();
    const nextRadio = radios.nth(1);
    const previousLabel = previousRadio.locator('..').locator('label');

    await previousRadio.check();
    await expect(previousLabel).toHaveCSS('font-weight', '600');

    await nextRadio.check();
    await expect(previousRadio).not.toBeChecked();
    await expect(previousLabel).toHaveCSS('font-weight', '500');
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