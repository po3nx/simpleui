import { defineConfig } from 'vitest/config';
import { TEST_ENV } from '../../vitest.shared.js';

/** Test tipe/API; coverage diaktifkan saat implementasi DG-010 dimulai. */
export default defineConfig({
  test: {
    name: '@simpleui/datagrid',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: TEST_ENV,
    coverage: { enabled: false },
  },
});
