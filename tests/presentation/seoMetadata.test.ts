import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('SEO metadata', () => {
    it.each([
        ['index.html', 'https://searoute.info/'],
        ['routeList.html', 'https://searoute.info/routeList'],
    ])('%s はクエリなしの正規 URL を宣言する', (fileName, canonicalUrl) => {
        const html = readFileSync(`${projectRoot}${fileName}`, 'utf8');
        const { document } = new JSDOM(html).window;
        const canonicalLinks = document.querySelectorAll('link[rel="canonical"]');

        expect(canonicalLinks).toHaveLength(1);
        expect(canonicalLinks[0].href).toBe(canonicalUrl);
    });
});

describe('routeList.html の検索向けメタデータ', () => {
    const html = readFileSync(`${projectRoot}routeList.html`, 'utf8');
    const { document } = new JSDOM(html).window;

    it('title と description は検索語（フェリー・旅客船・時刻表）を含み、OGP / Twitter と一致する', () => {
        const title = document.title;
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

        for (const keyword of ['フェリー', '旅客船', '航路一覧', '時刻表']) {
            expect(title).toContain(keyword);
        }
        for (const keyword of ['フェリー', '旅客船', '時刻表']) {
            expect(description).toContain(keyword);
        }
        expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(title);
        expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(title);
        expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(description);
        expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(description);
    });

    it('index,follow を宣言し、JSON-LD にパンくず（トップ → 航路一覧）を持つ', () => {
        expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow,max-image-preview:large');
        const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}');
        expect(jsonLd.description).toBe(document.querySelector('meta[name="description"]')?.getAttribute('content'));
        expect(jsonLd.breadcrumb.itemListElement.map((item: { item: string }) => item.item)).toEqual([
            'https://searoute.info/',
            'https://searoute.info/routeList',
        ]);
    });
});

describe('og:image と 404 ページ', () => {
    it.each(['index.html', 'routeList.html'])('%s の og:image は絶対URLの banner.png', (fileName) => {
        const html = readFileSync(`${projectRoot}${fileName}`, 'utf8');
        const { document } = new JSDOM(html).window;

        expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
            'https://searoute.info/img/banner.png',
        );
    });

    it('routeList.html の twitter:image は /searoute/ を含まない', () => {
        const html = readFileSync(`${projectRoot}routeList.html`, 'utf8');
        const { document } = new JSDOM(html).window;

        expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(
            'https://searoute.info/img/twbanner.png',
        );
    });

    it('public/404.html は noindex でトップと航路一覧へのリンクを持つ', () => {
        const html = readFileSync(`${projectRoot}public/404.html`, 'utf8');
        const { document } = new JSDOM(html).window;

        expect(document.documentElement.getAttribute('lang')).toBe('ja');
        expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
        expect(document.querySelector('a[href="/"]')).not.toBeNull();
        expect(document.querySelector('a[href="/routeList"]')).not.toBeNull();
        expect(document.querySelector('script')).toBeNull();
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
describe('公開 URL は Cloudflare Pages の正規形（.html なし）', () => {
    it('routeList.html の og:url と JSON-LD の url は /routeList', () => {
        const html = readFileSync(`${projectRoot}routeList.html`, 'utf8');
        const { document } = new JSDOM(html).window;
        const jsonLd = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}');

        expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://searoute.info/routeList');
        expect(jsonLd.url).toBe('https://searoute.info/routeList');
    });

    it('public/llms.txt は .html 付きの URL を含まない', () => {
        const text = readFileSync(`${projectRoot}public/llms.txt`, 'utf8');

        expect(text).toContain('https://searoute.info/routeList)');
        expect(text).not.toMatch(/searoute\.info\/[^\s)]*\.html/);
    });
});
