import { expect, test, type Page } from '@playwright/test';

/**
 * Visual regression area komponen (FND-032, docs/04 §9).
 *
 * Baseline disimpan per platform ({-snapshotSuffix}) karena rendering font
 * berbeda antar OS. Screenshot hanya area demo, bukan seluruh halaman.
 */

const DOCS_URL = 'http://127.0.0.1:4174';

async function openDemo(page: Page, theme: string) {
  await page.goto(`${DOCS_URL}/#/contoh`);
  await expect(page.locator('.sui-demo-viewport')).toBeVisible();
  await page.getByLabel('Tema').selectOption(theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  // Pastikan jendela virtual tergambar penuh sebelum screenshot.
  await expect(page.locator('.sui-demo-row').first()).toBeVisible();
}

for (const theme of ['light', 'dark', 'high-contrast']) {
  test(`demo 10k baris — ${theme}`, async ({ page }) => {
    await openDemo(page, theme);

    await expect(page.locator('.sui-demo-viewport')).toHaveScreenshot(
      `demo-${theme}.png`,
    );
  });
}

test('tema benar-benar mengubah warna demo', async ({ page }) => {
  const backgroundOf = async (theme: string): Promise<string> => {
    await openDemo(page, theme);
    return page
      .locator('.sui-demo-row--even')
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
  };

  const light = await backgroundOf('light');
  const dark = await backgroundOf('dark');

  expect(dark).not.toBe(light);
});

test('demo setelah scroll — light', async ({ page }) => {
  await openDemo(page, 'light');

  await page.locator('.sui-demo-viewport').evaluate((element) => {
    element.scrollTop = 3600;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(page.locator('.sui-demo-row').first()).toContainText('Baris 98');

  await expect(page.locator('.sui-demo-viewport')).toHaveScreenshot(
    'demo-scrolled.png',
  );
});
