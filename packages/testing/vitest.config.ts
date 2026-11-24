import { defineConfig } from 'vitest/config';
import { coverageOptions, TEST_ENV } from '../../vitest.shared.js';

/** Paket harness test; gate memakai ambang adapter (80/75). */
export default defineConfig({
  test: {
    name: '@simpleui/testing',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: TEST_ENV,
    coverage: coverageOptions({ gate: 'adapter' }),
  },
});
