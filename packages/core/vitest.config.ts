import { defineConfig } from 'vitest/config';
import { TEST_ENV, coverageOptions } from '../../vitest.shared.js';

/**
 * Test `@simpleui/core`. Unit murni berjalan di Node; test yang butuh DOM
 * diletakkan di `test/browser/` dan dijalankan proyek `browser` di root
 * workspace (ADR-0009).
 */
export default defineConfig({
  test: {
    name: '@simpleui/core',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: TEST_ENV,
    coverage: {
      ...coverageOptions({ gate: 'core' }),
      // Utilitas DOM diuji di browser nyata (test/browser), bukan di Node,
      // sehingga tidak dihitung pada coverage unit.
      exclude: ['src/**/*.test.ts', '**/*.d.ts', 'src/dom/**'],
    },
  },
});
