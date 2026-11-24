import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Arahkan Playwright/Vitest browser mode ke browser yang dipasang di dalam
 * workspace (`pnpm exec playwright install` dengan `PLAYWRIGHT_BROWSERS_PATH`).
 *
 * Alasannya bukan preferensi: lingkungan sandbox menolak menulis ke cache
 * global (`~/Library/Caches/ms-playwright`), jadi browser harus tinggal di
 * dalam repo. Bila browser sudah ada di cache global, fungsi ini tidak
 * melakukan apa pun.
 */
export function useWorkspaceBrowsers(): void {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return;

  const browsersPath = path.resolve(
    import.meta.dirname,
    '..',
    '.playwright-browsers',
  );
  if (existsSync(browsersPath)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  }
}
