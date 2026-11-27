import { test, expect } from '@playwright/test';
import type { ConsoleMessage, Page } from '@playwright/test';

/** ページのエラーを拾う（prerender.spec.ts と同じく、外部タイル等の読み込み失敗は対象外） */
function collectPageErrors(page: Page): string[] {
    const errors: string[] = [];
    // ローカル配信では外部タイル（pmtiles.searoute.info）が CORS で拒否されるため対象外
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

test.describe('JavaScript 無効でも航路詳細ページの本文を表示する', () => {
    test.use({ javaScriptEnabled: false });

    test('/route/10101/', async ({ page }) => {
        await page.goto('/route/10101/');
        await expect(page.getByRole('heading', { level: 1, name: '稚内～利礼島（鴛泊）～礼文（香深）' })).toBeVisible();
        const ports = page.locator('dt', { hasText: '発着港' }).locator('xpath=following-sibling::dd[1]');
        await expect(ports).toContainText('稚内');
        await expect(ports).toContainText('鴛泊');
        await expect(ports).toContainText('香深');
        await expect(page.locator('#route-detail-map')).toBeVisible();
    });
});

test('航路詳細ページの埋め込み地図を初回描画後に読み込み、エラーを出さない', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/route/10101/');
    // 地図は WebGL がないと描画されないため、canvas ではなく MapLibre がコンテナに付けるクラスで判定する
    await expect(page.locator('#route-detail-map')).toHaveClass(/maplibregl-map/, { timeout: 30_000 });
    await expect(page.locator('#route-detail-map .maplibregl-ctrl-zoom-in')).toBeVisible();
    await expect(page.locator('#route-detail-map .maplibregl-ctrl-compass')).toHaveCount(0);
    expect(errors).toEqual([]);
});
