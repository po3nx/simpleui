import { expect, test, type Page } from '@playwright/test';

/**
 * Visual baseline DataGrid (DG-058): tema, keadaan filter, dan layout sempit.
 * Baseline per platform; screenshot hanya area grid.
 */

const GRID_URL = 'http://127.0.0.1:4176/tools/a11y-harness/';

async function openGrid(page: Page, theme = 'light') {
  await page.goto(GRID_URL);
  await expect(page.locator('.sui-grid')).toBeVisible();
  await page.evaluate((next) => {
    document.body.dataset['theme'] = next;
  }, theme);
  await expect(page.locator('.sui-grid')).toHaveScreenshot(`grid-${theme}.png`);
}

test('grid light', async ({ page }) => {
  await openGrid(page, 'light');
});

test('grid dark', async ({ page }) => {
  await openGrid(page, 'dark');
});

test('grid high-contrast', async ({ page }) => {
  await openGrid(page, 'high-contrast');
});

test('grid setelah search', async ({ page }) => {
  await page.goto(GRID_URL);
  await expect(page.locator('.sui-grid')).toBeVisible();
  await page.locator('.sui-grid__search-input').fill('Karyawan 02');
  await expect(page.locator('.sui-grid__pager-status')).toContainText('1 data');
  await expect(page.locator('.sui-grid')).toHaveScreenshot('grid-filtered.png');
});

test('grid layout sempit dengan scroll', async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 700 });
  await page.goto(GRID_URL);
  await expect(page.locator('.sui-grid')).toBeVisible();
  await page.locator('.sui-grid__viewport').evaluate((element) => {
    element.scrollLeft = 120;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(page.locator('.sui-grid')).toHaveScreenshot('grid-narrow.png');
});

test('grid RTL', async ({ page }) => {
  await page.goto(`${GRID_URL}?rtl=1`);
  await expect(page.locator('.sui-grid')).toBeVisible();
  await expect(page.locator('.sui-grid')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.sui-grid')).toHaveScreenshot('grid-rtl.png');
});
