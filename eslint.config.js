import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat config (FND-004).
 *
 * Lint ini menegakkan aturan yang di dokumen disebut sebagai batas keras:
 * - `docs/00-rule-umum.md` §3.3 — framework leak lewat `no-restricted-imports`.
 * - `docs/00-rule-umum.md` §4.1 — batas LOC, parameter, kompleksitas, nesting.
 * - `docs/00-rule-umum.md` §4.3 — larangan `any`, `@ts-ignore`, non-null
 *   assertion, dan `enum`.
 *
 * Catatan: aturan yang butuh type information (`no-floating-promises`,
 * `no-misused-promises`, dst.) belum diaktifkan karena tsconfig per paket
 * belum memuat file test. Akan diaktifkan bersama Vitest workspace (FND-005).
 */

/** Framework UI yang tidak boleh bocor ke paket core/komponen (R-ARC-01). */
const FRAMEWORK_MODULES = [
  'react',
  'react/*',
  'react-dom',
  'react-dom/*',
  'preact',
  'preact/*',
  'vue',
  'vue/*',
  'svelte',
  'svelte/*',
  '@angular/*',
  'jquery',
  'jquery/*',
];

/** Framework yang sah untuk tiap adapter, dipetakan per direktori paket. */
const ADAPTER_OWN_FRAMEWORK = {
  'adapter-react': ['react', 'react-dom'],
  'adapter-vue': ['vue'],
  'adapter-angular': ['@angular/*'],
  'adapter-vanilla': [],
};

/** Paket adapter tidak boleh saling bergantung (R-ARC-03). */
const ADAPTER_PACKAGES = [
  '@simpleui/react',
  '@simpleui/vue',
  '@simpleui/angular',
  '@simpleui/vanilla',
];

/** Deep import dilarang; selalu lewat entry point `exports` (R-ARC-06). */
const DEEP_IMPORT_PATTERNS = ['@simpleui/*/dist/*', '@simpleui/*/src/*'];

const COMPONENT_PACKAGES = [
  '@simpleui/datagrid',
  '@simpleui/pivotgrid',
  '@simpleui/charts',
];

/**
 * Bangun opsi `no-restricted-imports`. Deep import selalu disertakan supaya
 * setiap blok tetap menegakkan R-ARC-06 — flat config menimpa opsi rule, bukan
 * menggabungkannya, jadi aturan global terpisah akan menghapus aturan paket.
 */
function restrictedImports(patterns, message) {
  return [
    'error',
    {
      patterns: [
        ...(patterns.length > 0 ? [{ group: patterns, message }] : []),
        {
          group: DEEP_IMPORT_PATTERNS,
          message:
            'R-ARC-06: deep import dilarang; pakai entry point publik paket.',
        },
      ],
    },
  ];
}

function adapterConfigs() {
  return Object.entries(ADAPTER_OWN_FRAMEWORK).map(
    ([adapterDir, ownFramework]) => ({
      files: [`packages/${adapterDir}/src/**/*.ts`],
      rules: {
        'no-restricted-imports': restrictedImports(
          [
            ...FRAMEWORK_MODULES.filter(
              (pattern) => !ownFramework.includes(pattern),
            ),
            ...ADAPTER_PACKAGES,
          ],
          'R-ARC-03: adapter hanya boleh memakai framework-nya sendiri dan tidak boleh bergantung pada adapter lain.',
        ),
      },
    }),
  );
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.tsbuildinfo',
    ],
  },

  // Berkas JavaScript/MJS (tools, konfigurasi) — lingkungan Node.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
      },
    },
  },

  // Seluruh berkas TypeScript.
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // R-TS-01 — `any` dilarang.
      '@typescript-eslint/no-explicit-any': 'error',
      // R-TS-02 — `@ts-ignore` dilarang, `@ts-expect-error` wajib beralasan.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
        },
      ],
      // R-TS-03 — non-null assertion dilarang.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // R-TS-04 — gunakan union string, bukan enum.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration:not([const=true])',
          message:
            'R-TS-04: gunakan union string, bukan enum (kecuali const enum internal).',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      // §4.1 — batas ukuran yang wajib ditegakkan, bukan sekadar review.
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'error',
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', { max: 4 }],
      complexity: ['error', 12],
      'max-depth': ['error', 4],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // Kode sumber paket: core tidak boleh menyentuh framework maupun paket
  // komponen (R-ARC-01).
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictedImports(
        [...FRAMEWORK_MODULES, '@simpleui/*'],
        'R-ARC-01: core tidak boleh mengimpor framework atau paket @simpleui/* lain.',
      ),
    },
  },

  // Komponen: hanya public API core, tanpa adapter dan tanpa komponen lain
  // (R-ARC-02, R-ARC-04).
  ...COMPONENT_PACKAGES.map((packageName) => ({
    files: [`packages/${packageName.replace('@simpleui/', '')}/src/**/*.ts`],
    rules: {
      'no-restricted-imports': restrictedImports(
        [
          ...FRAMEWORK_MODULES,
          ...ADAPTER_PACKAGES,
          ...COMPONENT_PACKAGES.filter((name) => name !== packageName),
        ],
        'R-ARC-02/04: komponen hanya boleh bergantung pada core; import lintas komponen dan ke adapter dilarang.',
      ),
    },
  })),

  // Paket non-framework lain (icons, theme) juga tidak boleh membawa framework.
  {
    files: ['packages/icons/src/**/*.ts', 'packages/theme/src/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictedImports(
        [...FRAMEWORK_MODULES, ...ADAPTER_PACKAGES],
        'R-ARC-01: paket non-adapter tidak boleh mengimpor framework atau adapter.',
      ),
    },
  },

  ...adapterConfigs(),

  // Harness test boleh memakai framework (untuk menguji adapter), tetapi deep
  // import tetap dilarang.
  {
    files: ['packages/testing/src/**/*.ts'],
    rules: {
      'no-restricted-imports': restrictedImports(
        [],
        'R-ARC-06: deep import dilarang.',
      ),
    },
  },

  // Test boleh lebih panjang dari batas produksi.
  {
    files: ['**/*.test.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-params': 'off',
    },
  },

  // Prettier terakhir: matikan aturan format yang bertabrakan.
  prettier,
);
