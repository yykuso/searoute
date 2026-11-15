import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        include: [
            'tests/domain/**/*.test.ts',
            'tests/application/**/*.test.ts',
            'tests/adapters/**/*.test.ts',
            'tests/entrypoints/**/*.test.{ts,tsx}',
            // React コンポーネントのテスト（*.test.tsx）は各ファイル先頭の @vitest-environment jsdom で DOM を使う
            'tests/presentation/**/*.test.{ts,tsx}',
        ],
    },
});
