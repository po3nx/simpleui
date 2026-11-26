import { defineConfig } from 'vitest/config';
import { coverageOptions, TEST_ENV } from '../../vitest.shared.js';

/**
 * `grid-parity.ts` dan `aria-snapshot.ts` hanya berjalan di browser test,
 * jadi tidak ikut coverage node; keduanya diuji di suite browser.
 */
const coverage = coverageOptions({ gate: 'adapter' });
coverage.exclude = [
  ...(coverage.exclude ?? []),
  'src/grid-parity.ts',
  'src/aria-snapshot.ts',
];

/** Paket harness test; gate memakai ambang adapter (80/75). */
export default defineConfig({
  test: {
    name: '@simpleui/testing',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: TEST_ENV,
    coverage,
  },
});
