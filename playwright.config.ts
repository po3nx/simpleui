import { defineConfig, devices } from '@playwright/test';
import { useWorkspaceBrowsers } from './tools/browsers-path.js';

/**
 * Konfigurasi Playwright untuk E2E (FND-006).
 *
 * Keputusan yang mengikat:
 * - ADR-0009 & docs/04 §3: E2E memakai Chromium, Firefox, dan WebKit.
 * - docs/04 §13: PR hanya Chromium, nightly semua browser. Karena itu ketiga
 *   proyek selalu didefinisikan dan pemilihannya lewat script (`--project`),
 *   bukan env var, supaya tetap lintas platform.
 * - docs/00-rule-umum.md §7.3 R-TEST-03: locale dan timezone dikunci.
 */
const isCI = Boolean(process.env.CI);

useWorkspaceBrowsers();

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: isCI
    ? [
        ['github'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Trace disimpan saat percobaan ulang supaya kegagalan CI dapat diperiksa
    // tanpa harus mereproduksi lokal (docs/04 §14: perbaiki akar masalah).
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: [
    {
      // Fixture minimal untuk smoke test harness.
      command: 'node tests/fixtures/server.mjs',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !isCI,
      timeout: 30_000,
    },
    {
      // Docs site disajikan statis untuk uji a11y + keyboard (FND-031).
      // `pnpm build` dijalankan sebagai langkah CI/lokal sebelum test.
      command: 'node tools/serve-docs.mjs',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
