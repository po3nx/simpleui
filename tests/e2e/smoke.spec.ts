import { expect, test } from '@playwright/test';

/**
 * Smoke test harness E2E (FND-006).
 *
 * Tujuannya membuktikan pipeline Playwright bekerja — webServer, browser
 * matrix, locale/timezone terkunci, dan artefak kegagalan — bukan menguji
 * komponen SimpleUI yang belum ada.
 */
test.describe('harness E2E', () => {
  test('harus merender fixture tanpa error konsol', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'SimpleUI E2E fixture' }),
    ).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('harus menjalankan interaksi keyboard pada fixture', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Hitung' }).press('Enter');
    await expect(page.getByTestId('counter')).toHaveText('1');

    await page.getByRole('button', { name: 'Hitung' }).press('Space');
    await expect(page.getByTestId('counter')).toHaveText('2');
  });
});
