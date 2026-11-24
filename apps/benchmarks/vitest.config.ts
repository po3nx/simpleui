import { defineConfig } from 'vitest/config';

/** Test untuk logika perbandingan baseline; benchmark sendiri dijalankan CLI. */
export default defineConfig({
  test: {
    name: '@simpleui/benchmarks',
    environment: 'node',
    include: ['src/**/*.test.mjs'],
    coverage: { enabled: false },
  },
});
