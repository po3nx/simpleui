import { defineConfig } from 'vitest/config';

/** Test untuk logika situs (router/manifest); tidak ada gate coverage. */
export default defineConfig({
  test: {
    name: '@simpleui/docs',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { enabled: false },
  },
});
