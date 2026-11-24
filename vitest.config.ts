import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { useWorkspaceBrowsers } from './tools/browsers-path.js';
import { TEST_ENV } from './vitest.shared.js';

useWorkspaceBrowsers();

/**
 * Vitest workspace (FND-005).
 *
 * Setiap paket yang punya test menyediakan `vitest.config.ts` sendiri; proyek
 * `browser` di bawah menjalankan test DOM di browser nyata (ADR-0009), bukan
 * jsdom, karena layout/scroll/pointer tidak dapat dipercaya di emulasi.
 *
 * Perintah:
 * - `pnpm test`          — unit test per paket lewat Turbo (cache, gate PR).
 * - `pnpm test:coverage` — seluruh proyek + laporan coverage agregat.
 * - `pnpm test:browser`  — hanya test DOM di Chromium.
 */
export default defineConfig({
  test: {
    projects: [
      'packages/*/vitest.config.ts',
      {
        test: {
          name: 'browser',
          include: ['packages/*/test/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          // Browser belum dipakai paket mana pun sampai komponen pertama ada.
          passWithNoTests: true,
        },
        // Flag esm-bundler Vue agar tidak memunculkan warning di test.
        define: {
          __VUE_OPTIONS_API__: 'true',
          __VUE_PROD_DEVTOOLS__: 'false',
          __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
        },
      },
    ],
    env: TEST_ENV,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/dist/**'],
      // Gate keseluruhan (85% line / 80% branch, docs/00-rule-umum.md §7.2)
      // belum diaktifkan: baru `core` yang punya test, sehingga angka agregat
      // akan selalu gagal karena paket lain 0%. Diaktifkan di FND-007 saat
      // komponen pertama sudah memiliki coverage.
    },
  },
});
