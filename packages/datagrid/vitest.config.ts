import { defineConfig } from 'vitest/config';
import { coverageOptions, TEST_ENV } from '../../vitest.shared.js';

/**
 * Unit test model/data DataGrid. DOM/view diuji di browser nyata (root
 * workspace project `browser`), jadi coverage unit fokus pada lapisan
 * model/data sesuai gate DG-080.
 */
const coverage = coverageOptions({
  gate: 'component',
  include: ['src/model/**/*.ts', 'src/data/**/*.ts'],
});
coverage.thresholds = { lines: 90, branches: 85 };
// Perf test dijalankan terpisah dengan RUN_PERF=1; instrumentasi v8 membuat
// pengukuran sort 3-4× lebih lambat sehingga coverage dimatikan.
coverage.enabled = process.env['RUN_PERF'] !== '1';

export default defineConfig({
  test: {
    name: '@simpleui/datagrid',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: TEST_ENV,
    coverage,
  },
});
