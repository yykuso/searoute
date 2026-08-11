const { devices, test, expect } = require('@playwright/test');

test('外部エントリーポイントからService Workerを登録する', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.locator('script[src="./js/entrypoints/serviceWorkerRegistration.js"]')).toHaveCount(1);
    const serviceWorkerUrl = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.scriptURL;
    });

    expect(serviceWorkerUrl).toMatch(/\/service-worker\.js$/);
});

test('モバイルで右上コントロールの最初のタップはパネルを開くだけにする', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    await page.goto('/index.html');

    const hamburgerToggle = page.locator('.maplibregl-ctrl-hamburger-toggle');
    await expect(hamburgerToggle).toBeVisible({ timeout: 30_000 });
    await hamburgerToggle.tap();
    const hamburgerList = page.locator('.maplibregl-ctrl-hamburger-list');
    await expect(hamburgerList).toBeVisible();
    await expect(page.locator('#info-window')).toBeHidden();

    const filterToggle = page.getByRole('button', { name: '航路フィルタ' });
    const activeFilter = page.locator('#route-filter-control [data-route-filter-key="active"]');
    await expect(activeFilter).toBeChecked();
    await filterToggle.tap();
    const filterList = page.locator('.maplibregl-ctrl-filter-list');
    await expect(filterList).toBeVisible();
    await expect(hamburgerList).toBeHidden();
    await expect(activeFilter).toBeChecked();
    await page.touchscreen.tap(200, 500);
    await expect(filterList).toBeHidden();

    const layersToggle = page.locator('.maplibregl-ctrl-layers-toggle');
    const checkedBaseLayer = page.locator('#layers-control input[type="radio"]:checked');
    const baseLayerIdBeforeTap = await checkedBaseLayer.getAttribute('id');
    await layersToggle.tap();
    const layersList = page.locator('.maplibregl-ctrl-layers-list');
    await expect(layersList).toBeVisible();
    await expect(checkedBaseLayer).toHaveAttribute('id', baseLayerIdBeforeTap);
    await page.touchscreen.tap(200, 500);
    await expect(layersList).toBeHidden();

    await filterToggle.tap();
    await expect(filterList).toBeVisible();
    await expect(activeFilter).toBeChecked();
    await page.touchscreen.tap(200, 500);
    await expect(filterList).toBeHidden();

    await context.close();
});

test('マップUIのピンチ拡大と意図しないドラッグを抑止する', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none');
    await expect(page.locator('body')).toHaveCSS('overscroll-behavior-y', 'none');

    const controls = page.locator('.maplibregl-ctrl');
    await expect(controls.first()).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('#hamburger-control')).toHaveCSS('touch-action', 'pan-y');
    await expect(page.locator('.maplibregl-ctrl button').first()).toHaveCSS('touch-action', 'none');
    await expect(page.locator('.maplibregl-ctrl-layers-toggle')).toHaveCSS('touch-action', 'none');
    await expect(page.locator('.maplibregl-ctrl-geocoder--collapsed')).toHaveCSS('touch-action', 'none');
    await expect(page.locator('.maplibregl-ctrl-attrib')).toHaveCSS('touch-action', 'none');

    const windows = page.locator('#info-window, #privacy-policy-window');
    await expect(windows).toHaveCount(2);
    const touchActions = await windows.evaluateAll((elements) => (
        elements.map((element) => getComputedStyle(element).touchAction)
    ));
    expect(touchActions).toEqual(['pan-y', 'pan-y']);
    const overscrollBehaviors = await windows.evaluateAll((elements) => (
        elements.map((element) => getComputedStyle(element).overscrollBehaviorY)
    ));
    expect(overscrollBehaviors).toEqual(['contain', 'contain']);

    const menuPanels = page.locator(
        '.maplibregl-ctrl-hamburger-list, .maplibregl-ctrl-layers-list, .maplibregl-ctrl-filter-list'
    );
    await expect(menuPanels).toHaveCount(3);
    const menuPanelStyles = await menuPanels.evaluateAll((elements) => elements.map((element) => ({
        overflowY: getComputedStyle(element).overflowY,
        overscrollBehaviorY: getComputedStyle(element).overscrollBehaviorY,
        touchAction: getComputedStyle(element).touchAction,
    })));
    expect(menuPanelStyles).toEqual([
        { overflowY: 'auto', overscrollBehaviorY: 'contain', touchAction: 'pan-y' },
        { overflowY: 'auto', overscrollBehaviorY: 'contain', touchAction: 'pan-y' },
        { overflowY: 'auto', overscrollBehaviorY: 'contain', touchAction: 'pan-y' },
    ]);

    const searchSuggestions = page.locator('.maplibregl-ctrl-geocoder .suggestions');
    await expect(searchSuggestions).toHaveCount(1);
    await expect(searchSuggestions).toHaveCSS('overflow-y', 'auto');
    await expect(searchSuggestions).toHaveCSS('overscroll-behavior-y', 'contain');
    await expect(searchSuggestions).toHaveCSS('touch-action', 'pan-y');
});

test('各モーダルを開き直すとスクロール位置が先頭へ戻る', async ({ page }) => {
    await page.goto('/index.html');

    const hamburgerControl = page.locator('#hamburger-control');
    await expect(hamburgerControl).toBeVisible({ timeout: 30_000 });
    await hamburgerControl.hover();
    await page.getByRole('link', { name: 'サイト情報' }).click();

    const infoWindow = page.locator('#info-window');
    await infoWindow.evaluate((modal) => modal.scrollTo(0, 100));
    await page.locator('#info-close-top-btn').click();
    await hamburgerControl.hover();
    await page.getByRole('link', { name: 'サイト情報' }).click();
    await expect.poll(() => infoWindow.evaluate((modal) => modal.scrollTop)).toBe(0);

    await page.getByRole('button', { name: 'プライバシーポリシーを読む' }).click();
    const privacyWindow = page.locator('#privacy-policy-window');
    await privacyWindow.evaluate((modal) => modal.scrollTo(0, 100));
    await page.locator('#privacy-close-top-btn').click();

    await hamburgerControl.hover();
    await page.getByRole('link', { name: 'サイト情報' }).click();
    await page.getByRole('button', { name: 'プライバシーポリシーを読む' }).click();

    await expect.poll(() => privacyWindow.evaluate((modal) => modal.scrollTop)).toBe(0);
});

test('プライバシーポリシーをURLから開きEscapeで閉じられる', async ({ page }) => {
    await page.goto('/index.html#privacy');

    const privacyDialog = page.getByRole('dialog', { name: 'プライバシーポリシー' });
    await expect(privacyDialog).toBeVisible();
    const closeButton = page.locator('#privacy-close-top-btn');
    await expect(closeButton).toBeFocused();

    const positionsBeforeScroll = await privacyDialog.evaluate((dialog) => {
        const dialogRect = dialog.getBoundingClientRect();
        const buttonRect = dialog.querySelector('.modal-close-btn').getBoundingClientRect();
        return {
            topOffset: buttonRect.top - dialogRect.top,
            rightOffset: dialogRect.right - buttonRect.right,
        };
    });
    expect(positionsBeforeScroll.topOffset).toBeCloseTo(9, 0);
    expect(positionsBeforeScroll.rightOffset).toBeCloseTo(9, 0);
    await privacyDialog.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    const positionsAfterScroll = await privacyDialog.evaluate((dialog) => {
        const dialogRect = dialog.getBoundingClientRect();
        const buttonRect = dialog.querySelector('.modal-close-btn').getBoundingClientRect();
        return {
            topOffset: buttonRect.top - dialogRect.top,
            rightOffset: dialogRect.right - buttonRect.right,
        };
    });
    expect(positionsAfterScroll).toEqual(positionsBeforeScroll);

    await page.keyboard.press('Escape');
    await expect(privacyDialog).toBeHidden();
});

test('サイト情報からプライバシーポリシーを開ける', async ({ page }) => {
    await page.goto('/index.html');

    const hamburgerControl = page.locator('#hamburger-control');
    await expect(hamburgerControl).toBeVisible({ timeout: 30_000 });
    await hamburgerControl.hover();
    await page.getByRole('link', { name: 'サイト情報' }).click();

    await expect(page.locator('#info-window')).toBeVisible();
    await page.getByRole('button', { name: 'プライバシーポリシーを読む' }).click();

    const privacyDialog = page.getByRole('dialog', { name: 'プライバシーポリシー' });
    await expect(privacyDialog).toBeVisible();
    await expect(privacyDialog.getByRole('heading', { level: 3 })).toHaveText([
        'Cookieの利用について',
        'Googleアナリティクス',
        '地図・外部サービス',
        '個人情報の取り扱い',
    ]);
});

test('サイト情報にGitHubリポジトリとビルド番号を表示する', async ({ page }) => {
    await page.goto('/index.html');

    const infoWindow = page.locator('#info-window');
    await infoWindow.evaluate((element) => { element.style.display = 'block'; });

    await expect(infoWindow.locator('.heading-tag')).toHaveText([
        'サイト情報',
        '開発者について',
    ]);
    await expect(infoWindow.getByRole('heading', { level: 3 })).toHaveText([
        '掲載データについて',
        'GitHubリポジトリ',
        'プライバシーポリシー',
        '免責事項',
    ]);
    await expect(infoWindow.getByText('当サイトでは、船による人の移動を目的とした定期航路を主な掲載対象としています。')).toBeVisible();
    await expect(infoWindow.locator('ul').filter({ hasText: '発着地が同じ遊覧航路' }).getByRole('listitem')).toHaveText([
        '発着地が同じ遊覧航路（途中の港で乗降できるものを除く）',
        '不定期に運航される航路',
        '旅客利用を目的としない業務用航路',
        '長期間運休している航路（一部を除く）',
    ]);
    await expect(infoWindow.getByText('yy_kuso が個人で開発・運営しています。')).toBeVisible();
    await expect(infoWindow.locator('a[href="https://x.com/yy_kuso"]')).toHaveText(/Twitter/);
    await expect(infoWindow.locator('a[href="https://lnk.yy-kuso.com/"]')).toHaveText(/開発者のサイト/);
    await expect(infoWindow.locator('a[href="https://www.amazon.co.jp/hz/wishlist/ls/KF9GONGN9M1K"]')).toHaveText(/ほしいものリスト/);
    await expect(infoWindow.locator('a[href="https://github.com/yykuso/searoute/"]')).toBeVisible();
    await expect(infoWindow.locator('a[href="https://github.com/yykuso/searoute-pmtiles"]')).toBeVisible();
    await expect(infoWindow.locator('#site-build-number')).toHaveText(/^(local|[0-9a-f]{7})$/);
});

test('サイト情報の次の見出しが固定見出しを置き換える', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 240 });
    await page.goto('/index.html');

    const infoWindow = page.locator('#info-window');
    await infoWindow.evaluate((element) => { element.style.display = 'block'; });
    const siteHeading = infoWindow.getByRole('heading', { name: 'サイト情報' });
    const developerHeading = infoWindow.getByRole('heading', { name: '開発者について' });

    const siteHeadingTopBeforeScroll = await siteHeading.evaluate((element) => element.getBoundingClientRect().top);
    await infoWindow.evaluate((element) => element.scrollTo(0, 40));
    const siteHeadingTopAfterScroll = await siteHeading.evaluate((element) => element.getBoundingClientRect().top);
    expect(siteHeadingTopAfterScroll).toBeCloseTo(siteHeadingTopBeforeScroll, 0);

    await developerHeading.evaluate((element) => {
        const scrollContainer = element.closest('#info-window');
        scrollContainer.scrollTo(0, element.offsetTop + 80);
    });

    const developerHeadingTop = await developerHeading.evaluate((element) => element.getBoundingClientRect().top);
    expect(developerHeadingTop).toBeCloseTo(siteHeadingTopBeforeScroll, 0);
    const visibleHeading = await developerHeading.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return document.elementFromPoint(rect.left + 20, rect.top + rect.height / 2)?.closest('.heading-tag')?.textContent.trim();
    });
    expect(visibleHeading).toBe('開発者について');
    await expect(page.locator('#info-close-top-btn')).toBeVisible();
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