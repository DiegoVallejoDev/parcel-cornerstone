import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                matchMedia: 'readonly',
                setTimeout: 'readonly',
                console: 'readonly',
                Date: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
        },
    },
    {
        files: ['api/**/*.js', 'scripts/**/*.js', 'packages/**/*.js', '.htmlnanorc.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly',
                console: 'readonly',
                Date: 'readonly',
            },
        },
    },
    {
        ignores: ['dist/**', '.build/**', '.parcel-cache/**', 'node_modules/**'],
    },
];
