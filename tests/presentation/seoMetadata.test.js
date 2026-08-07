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