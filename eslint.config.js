// レイヤー境界（クリーンアーキテクチャの依存ルール）を機械的に検査する
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// 依存は内向きのみ: domain ← application ← (adapters, presentation) ← entrypoints
const LAYER_RULES = {
    domain: ['domain'],
    config: ['config', 'domain'],
    application: ['application', 'domain', 'config'],
    adapters: ['adapters', 'application', 'domain', 'config'],
    presentation: ['presentation', 'application', 'domain', 'config', 'styles'],
    entrypoints: ['entrypoints', 'presentation', 'adapters', 'application', 'domain', 'config', 'styles'],
};

const FRAMEWORK_MODULES = ['maplibre-gl', 'maplibre-gl/*', '@maplibre/*', 'pmtiles', 'react', 'react/*', 'react-dom', 'react-dom/*'];

export default tseslint.config(
    {
        ignores: ['dist/**', 'deploy/**', 'public/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { boundaries },
        settings: {
            'boundaries/include': ['src/**/*'],
            'boundaries/elements': [
                { type: 'domain', pattern: 'src/domain/**' },
                { type: 'config', pattern: 'src/config/**' },
                { type: 'application', pattern: 'src/application/**' },
                { type: 'adapters', pattern: 'src/adapters/**' },
                { type: 'presentation', pattern: 'src/presentation/**' },
                { type: 'entrypoints', pattern: 'src/entrypoints/**' },
                { type: 'styles', pattern: 'src/styles/**' },
            ],
            'import/resolver': {
                node: { extensions: ['.ts', '.tsx', '.js'] },
            },
        },
        rules: {
            'boundaries/no-unknown-dependencies': 'error',
            'boundaries/dependencies': ['error', {
                default: 'disallow',
                message: '{{ from.element.type }} から {{ to.element.type }} への依存は禁止（依存は内向きのみ）',
                policies: [
                    ...Object.entries(LAYER_RULES).map(([from, allowed]) => ({
                        from: { element: { type: from } },
                        allow: { to: { element: { types: allowed } } },
                    })),
                    // 外部パッケージ・Node 組み込みは原則許可
                    { allow: { to: { module: { origin: ['external', 'core'] } } } },
                ],
            }],
        },
    },
    {
        // domain / application では DOM・ブラウザのグローバルを参照しない
        files: ['src/domain/**/*.ts', 'src/application/**/*.ts', 'src/config/**/*.ts'],
        rules: {
            'no-restricted-globals': ['error',
                'window', 'document', 'location', 'history', 'navigator', 'localStorage', 'sessionStorage',
                'requestAnimationFrame', 'requestIdleCallback', 'ResizeObserver', 'HTMLElement', 'Element',
            ],
            // 地図・UI ライブラリへの依存も禁止
            'no-restricted-imports': ['error', {
                patterns: [{
                    group: FRAMEWORK_MODULES,
                    message: 'domain / config / application は MapLibre / PMTiles / React に依存できません',
                }],
            }],
            'no-restricted-properties': ['error',
                { object: 'globalThis', property: 'document' },
                { object: 'globalThis', property: 'window' },
                { object: 'globalThis', property: 'location' },
            ],
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['tests/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
);
