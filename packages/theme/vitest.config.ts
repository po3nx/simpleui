import { defineConfig } from 'vitest/config';
import { TEST_ENV } from '../../vitest.shared.js';

/**
 * Paket tema hanya berisi CSS dan test kontrak token; tidak ada kode runtime
 * yang perlu diukur coverage-nya.
 */
export default defineConfig({
  test: {
    name: '@simpleui/theme',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: TEST_ENV,
    coverage: { enabled: false },
  },
});
