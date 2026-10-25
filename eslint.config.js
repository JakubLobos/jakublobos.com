import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Unsafe HTML sinks are banned everywhere: guestbook and contact data is untrusted (docs/security.md).
const noHtmlSinks = {
  'no-restricted-properties': [
    'error',
    { property: 'innerHTML', message: 'Use textContent or DOM APIs (docs/security.md#xss).' },
    { property: 'outerHTML', message: 'Use DOM APIs (docs/security.md#xss).' },
    { property: 'insertAdjacentHTML', message: 'Use DOM APIs (docs/security.md#xss).' },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.property.name='write'][callee.object.name='document']",
      message: 'document.write is banned.',
    },
  ],
};

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.astro/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    'docs/design/**',
  ]),

  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,mts}'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ['**/*.{ts,mts}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      ...noHtmlSinks,
    },
  },

  {
    files: ['**/*.test.ts', '**/test/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  {
    // tools/design scripts pass callbacks to page.evaluate(), which run in the browser.
    files: ['apps/web/src/**/*.{ts,astro}', 'tools/design/**/*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.browser } },
  },

  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-strict'],
  {
    files: ['**/*.astro'],
    rules: {
      'astro/no-set-html-directive': 'error',
      'astro/no-unused-css-selector': 'error',
      ...noHtmlSinks,
    },
  },
  {
    // Type-aware rules cannot run on the virtual files produced for <script> blocks in .astro.
    files: ['**/*.astro', '**/*.astro/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettier,
]);
