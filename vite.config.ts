import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createServer, defineConfig } from 'vite';
import type { Plugin } from 'vite';
import type * as Prerender from './src/entrypoints/prerender';

const root = fileURLToPath(new URL('.', import.meta.url));

// Cloudflare Pages のコミットSHA（先頭7桁）。ローカルでは 'local'
const BUILD_NUMBER = (process.env.CF_PAGES_COMMIT_SHA || process.env.VITE_BUILD_NUMBER || 'local').slice(0, 7);
const DEFINE = {
    'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(BUILD_NUMBER),
};
const APP_ROOT = '<div id="app"></div>';
const ROUTE_DETAIL_TEMPLATE = 'routeDetail.html';
const ROUTE_HEAD_PLACEHOLDER = /<!-- searoute:route-head[\s\S]*?-->/;

/** プリレンダリング結果を HTML へ埋め込む（<div id="app"> の中身・head 末尾・body 末尾） */
function applyPrerenderedPage(html: string, page: Prerender.PrerenderedPage): string {
    let output = html.replace(APP_ROOT, () => `<div id="app">${page.app}</div>`);
    if (page.head) output = output.replace('</head>', () => `${page.head}\n</head>`);
    if (page.bodyEnd) output = output.replace('</body>', () => `${page.bodyEnd}\n</body>`);
    return output;
}

/**
 * ビルド時プリレンダリング（SSG）
 * クライアントのビルド完了後に src/entrypoints/prerender.tsx を SSR で読み込み、
 * 各ページの React ツリーの HTML を dist/*.html の <div id="app"> へ埋め込む（クライアントは hydrateRoot で引き継ぐ）
 */
function prerenderPages(): Plugin {
    let outDir = resolve(root, 'dist');
    return {
        name: 'searoute-prerender',
        apply: 'build',
        configResolved(config) {
            outDir = resolve(config.root, config.build.outDir);
        },
        async closeBundle() {
            const server = await createServer({
                configFile: false,
                root,
                logLevel: 'error',
                appType: 'custom',
                server: { middlewareMode: true, hmr: false, ws: false },
                define: DEFINE,
                plugins: [react()],
            });
            try {
                const {
                    renderPages, renderRouteDetailPages, loadPrerenderRouteTables, loadPrerenderRoutePages, normalizeRoutePages, buildLlmsFullText, SITE_URL,
                } = await server.ssrLoadModule('/src/entrypoints/prerender.tsx') as typeof Prerender;
                // SEAROUTE_SKIP_ROUTE_DATA=1 のときは航路データを取得しない（E2E など）。取得失敗はビルド失敗にする
                const routeTables = process.env.SEAROUTE_SKIP_ROUTE_DATA === '1' ? [] : await loadPrerenderRouteTables();
                for (const [fileName, page] of Object.entries(renderPages(BUILD_NUMBER, routeTables))) {
                    const filePath = resolve(outDir, fileName);
                    const html = await readFile(filePath, 'utf8');
                    if (!html.includes(APP_ROOT)) {
                        throw new Error(`${fileName} に ${APP_ROOT} が見つかりません`);
                    }
                    await writeFile(filePath, applyPrerenderedPage(html, page));
                }

                // 航路詳細ページ：dist/routeDetail.html を雛形に route/<routeId>/index.html を書き出し、雛形は消す
                // SEAROUTE_ROUTE_PAGES_FILE（プロジェクトルートからの相対パス）があればそのファイル、SEAROUTE_SKIP_ROUTE_DATA=1 なら 0 件、
                // それ以外は配信元から取得する。取得失敗・routeId 重複はビルド失敗
                const routePagesFile = process.env.SEAROUTE_ROUTE_PAGES_FILE;
                const routePages = routePagesFile
                    ? normalizeRoutePages(JSON.parse(await readFile(resolve(root, routePagesFile), 'utf8')))
                    : process.env.SEAROUTE_SKIP_ROUTE_DATA === '1' ? [] : await loadPrerenderRoutePages();
                const templatePath = resolve(outDir, ROUTE_DETAIL_TEMPLATE);
                const template = await readFile(templatePath, 'utf8');
                if (!template.includes(APP_ROOT) || !ROUTE_HEAD_PLACEHOLDER.test(template)) {
                    throw new Error(`${ROUTE_DETAIL_TEMPLATE} に ${APP_ROOT} または searoute:route-head が見つかりません`);
                }
                for (const { fileName, page } of renderRouteDetailPages(routePages)) {
                    const filePath = resolve(outDir, fileName);
                    const html = applyPrerenderedPage(template, { app: page.app, bodyEnd: page.bodyEnd })
                        .replace(ROUTE_HEAD_PLACEHOLDER, () => page.head ?? '');
                    await mkdir(dirname(filePath), { recursive: true });
                    await writeFile(filePath, html);
                }
                await rm(templatePath);
                if (routeTables.length > 0) {
                    await writeFile(resolve(outDir, 'llms-full.txt'), buildLlmsFullText(routeTables, SITE_URL, new Date().toISOString()));
                }
            } finally {
                await server.close();
            }
        },
    };
}

const ENTRY_CSS_PLACEHOLDER = /<!-- searoute:entry-css[\s\S]*?-->/;
const INJECTED_STYLESHEET = /[ \t]*<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">\n?/g;

/**
 * Vite が注入するスタイルシートを従来どおり非同期読み込み（media=print → all。JavaScript 無効時は noscript で通常読み込み）にし、
 * index.html のプレースホルダー位置（インライン style より前）へ移して旧来のカスケード順を保つ
 */
function asyncStylesheets(): Plugin {
    return {
        name: 'searoute-async-stylesheets',
        enforce: 'post',
        transformIndexHtml: {
            order: 'post',
            handler(html) {
                const links: string[] = [];
                let result = html.replace(INJECTED_STYLESHEET, (_match, href: string) => {
                    links.push(`<link rel="stylesheet" crossorigin href="${href}" media="print" onload="this.media='all'">`);
                    // JavaScript 無効だと onload が動かず media=print のままになるので、通常読み込みの代替を添える
                    links.push(`<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`);
                    return '';
                });
                if (ENTRY_CSS_PLACEHOLDER.test(result)) {
                    result = result.replace(ENTRY_CSS_PLACEHOLDER, links.join('\n  '));
                } else if (links.length > 0) {
                    result = result.replace('</head>', `  ${links.join('\n  ')}\n</head>`);
                }
                return result;
            },
        },
    };
}

const ROUTE_DATA_ORIGIN = 'https://pmtiles.searoute.info';
const ROUTE_DATA_PROXY_PATH = '/__route-data';

/**
 * 開発サーバー専用: 航路データ（pmtiles.searoute.info）を同じオリジンのプロキシ経由で取得する
 * 配信元は本番のオリジンにしか CORS を許可していないため、127.0.0.1:5173 から直接は読めない。
 * 相対パスなので Quick Tunnel 経由のアクセスでも同じプロキシを通る。
 * ビルド・プレビュー・Vitest では何もしない（本番の URL のまま。src/config/routeData.ts）。
 */
function devRouteDataProxy(): Plugin {
    return {
        name: 'searoute-dev-route-data-proxy',
        apply: (_config, { command }) => command === 'serve' && !process.env.VITEST,
        config: () => ({
            define: { __SEAROUTE_DEV_ROUTE_DATA_BASE__: JSON.stringify(ROUTE_DATA_PROXY_PATH) },
            server: {
                proxy: {
                    [ROUTE_DATA_PROXY_PATH]: {
                        target: ROUTE_DATA_ORIGIN,
                        changeOrigin: true,
                        rewrite: (path) => path.slice(ROUTE_DATA_PROXY_PATH.length),
                    },
                },
            },
        }),
    };
}

const ICON_CSS_PLACEHOLDER =/<!-- searoute:icon-css[\s\S]*?-->/;
const ICON_CSS_PATH = resolve(root, 'src/styles/icons.css');
const ICON_LICENSE = '/*! Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2026 Fonticons, Inc. */';

/**
 * アイコン（インライン SVG）用の CSS を各 HTML の head へインライン展開する
 * 非同期読み込みの CSS より前に効かせ、SVG が未スタイルの大きさで一瞬描画されるのを防ぐ（旧 Font Awesome の CSS と同じ位置）
 */
function inlineIconStyles(): Plugin {
    return {
        name: 'searoute-inline-icon-css',
        async transformIndexHtml(html) {
            if (!ICON_CSS_PLACEHOLDER.test(html)) return html;
            const css = (await readFile(ICON_CSS_PATH, 'utf8'))
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s*\n\s*/g, '')
                .trim();
            return html.replace(ICON_CSS_PLACEHOLDER, `<style>${ICON_LICENSE}${css}</style>`);
        },
    };
}

export default defineConfig({
    plugins: [react(), tailwindcss(), inlineIconStyles(), asyncStylesheets(), prerenderPages(), devRouteDataProxy()],
    // 公開ディレクトリ（data/ style/ img/ manifest.json 等）は同じURLのまま dist 直下へコピーされる
    publicDir: 'public',
    define: DEFINE,
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // maplibre チャンク（ライブラリ単体で約 1.1MB・分割不可）のみが閾値を超えるため上限を合わせる
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                // MapLibre（約 800KB）を独立チャンクにしてエントリーの肥大化とキャッシュ無効化を避ける
                manualChunks(id) {
                    const normalizedId = id.replace(/\\/g, '/');
                    // CSS（エントリーで静的 import）をこのチャンクに入れるとエントリーが MapLibre を静的 import してしまう
                    if (/\.css($|\?)/.test(normalizedId)) {
                        return undefined;
                    }
                    if (normalizedId.includes('node_modules/maplibre-gl/') || normalizedId.includes('node_modules/@maplibre/')) {
                        return 'maplibre';
                    }
                    if (/node_modules\/(react|react-dom|scheduler)\//.test(normalizedId)) {
                        return 'react';
                    }
                    return undefined;
                },
            },
            input: {
                index: resolve(root, 'index.html'),
                routeList: resolve(root, 'routeList.html'),
                // 航路詳細ページの雛形（プリレンダリングで route/<routeId>/index.html に展開し、dist からは消す）
                routeDetail: resolve(root, ROUTE_DETAIL_TEMPLATE),
            },
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        // Cloudflare Quick Tunnel（*.trycloudflare.com）経由のアクセスを許可
        allowedHosts: ['.trycloudflare.com'],
    },
    preview: {
        port: 4173,
        strictPort: true,
    },
});
