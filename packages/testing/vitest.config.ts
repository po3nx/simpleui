import { defineConfig } from 'vitest/config';
import { coverageOptions, TEST_ENV } from '../../vitest.shared.js';

/**
 * `grid-parity.ts` hanya berjalan di browser test adapter (bukan node), jadi
 * tidak ikut dihitung coverage node; perilakunya diuji 4 adapter.
 */
const coverage = coverageOptions({ gate: 'adapter' });
coverage.exclude = [...(coverage.exclude ?? []), 'src/grid-parity.ts'];

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
