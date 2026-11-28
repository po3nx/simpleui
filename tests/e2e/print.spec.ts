import { expect, test } from '@playwright/test';

/** Print stylesheet DataGrid (DG-072). */
test('print menyembunyikan chrome dan mencegah baris terpotong', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4176/tools/a11y-harness/');
  await expect(page.locator('[role="grid"]')).toBeVisible();
  await page.emulateMedia({ media: 'print' });

  await expect(page.locator('.sui-grid__search')).toBeHidden();
  await expect(page.locator('.sui-grid__pager')).toBeHidden();

  const style = await page
    .locator('.sui-grid__row')
    .first()
    .evaluate((row) => {
      const computed = getComputedStyle(row);
      return {
        breakInside: computed.breakInside,
        pageBreakInside: computed.pageBreakInside,
      };
    });
  expect(style.breakInside).toBe('avoid');
  expect(style.pageBreakInside).toBe('avoid');
});
