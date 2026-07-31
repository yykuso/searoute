const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        include: [
            'tests/domain/**/*.test.js',
            'tests/application/**/*.test.js',
            'tests/adapters/**/*.test.js',
            'tests/presentation/**/*.test.js',
        ],
    },
});