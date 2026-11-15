import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('SEO metadata', () => {
    it.each([
        ['index.html', 'https://searoute.info/'],
        ['routeList.html', 'https://searoute.info/routeList.html'],
    ])('%s はクエリなしの正規 URL を宣言する', (fileName, canonicalUrl) => {
        const html = readFileSync(`${projectRoot}${fileName}`, 'utf8');
        const { document } = new JSDOM(html).window;
        const canonicalLinks = document.querySelectorAll('link[rel="canonical"]');

        expect(canonicalLinks).toHaveLength(1);
        expect(canonicalLinks[0].href).toBe(canonicalUrl);
    });
});

describe('初期レイアウト', () => {
    it('Cookie バナーを非同期 CSS の適用前から固定配置する', () => {
        const html = readFileSync(`${projectRoot}index.html`, 'utf8');
        const criticalStyleIndex = html.indexOf('.cookie-banner {');
        const asyncCommonCssIndex = html.indexOf('href="./css/common.css"');

        expect(criticalStyleIndex).toBeGreaterThan(-1);
        expect(criticalStyleIndex).toBeLessThan(asyncCommonCssIndex);
        expect(html.slice(criticalStyleIndex, asyncCommonCssIndex)).toContain('position: fixed;');
        expect(html.slice(criticalStyleIndex, asyncCommonCssIndex)).toContain("font-family: 'Inter', sans-serif;");
    });

    it('Inter の遅延フォント交換を無効にする', () => {
        const html = readFileSync(`${projectRoot}index.html`, 'utf8');
        const { document } = new JSDOM(html).window;
        const interStylesheet = document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]');

        expect(interStylesheet?.href).toContain('display=optional');
    });
});