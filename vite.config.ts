import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createServer, defineConfig } from 'vite';
import type { Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

// Cloudflare Pages のコミットSHA（先頭7桁）。ローカルでは 'local'
const BUILD_NUMBER = (process.env.CF_PAGES_COMMIT_SHA || process.env.VITE_BUILD_NUMBER || 'local').slice(0, 7);
const DEFINE = {
    'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(BUILD_NUMBER),
};
const APP_ROOT = '<div id="app"></div>';

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
                const { renderPages } = await server.ssrLoadModule('/src/entrypoints/prerender.tsx') as {
                    renderPages: (buildNumber: string) => Record<string, string>;
                };
                for (const [fileName, appHtml] of Object.entries(renderPages(BUILD_NUMBER))) {
                    const filePath = resolve(outDir, fileName);
                    const html = await readFile(filePath, 'utf8');
                    if (!html.includes(APP_ROOT)) {
                        throw new Error(`${fileName} に ${APP_ROOT} が見つかりません`);
                    }
                    await writeFile(filePath, html.replace(APP_ROOT, `<div id="app">${appHtml}</div>`));
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
 * Vite が注入するスタイルシートを従来どおり非同期読み込み（media=print → all）にし、
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

export default defineConfig({
    plugins: [react(), tailwindcss(), asyncStylesheets(), prerenderPages()],
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
            },
        },
    },
    preview: {
        port: 4173,
        strictPort: true,
    },
});
