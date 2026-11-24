import { expect, test } from '@playwright/test';

/**
 * Playground adapter (FND-028): memastikan bridge benar-benar berjalan di
 * aplikasi Vite nyata, bukan hanya di test unit/browser.
 */

const BASE = 'http://127.0.0.1:4175';
const PLAYGROUNDS = [
  { label: 'React', path: 'playground-react' },
  { label: 'Vue', path: 'playground-vue' },
  { label: 'Angular', path: 'playground-angular' },
  { label: 'vanilla', path: 'playground-vanilla' },
];

for (const { label, path } of PLAYGROUNDS) {
  test(`${label}: mount, update, unmount, dan remount`, async ({ page }) => {
    await page.goto(`${BASE}/${path}/dist/index.html`);

    const host = page.locator('#host');
    await expect(host.locator('li')).toHaveCount(2);
    await expect(page.locator('#status')).toHaveText('mounted: 2 item');

    await page.getByRole('button', { name: 'Tambah item' }).click();
    await expect(host.locator('li')).toHaveCount(3);
    await expect(page.locator('#status')).toHaveText('mounted: 3 item');

    await page.getByRole('button', { name: 'Unmount', exact: true }).click();
    await expect(host.locator('li')).toHaveCount(0);
    await expect(page.locator('#status')).toHaveText('unmounted');

    await page.getByRole('button', { name: 'Mount', exact: true }).click();
    await expect(host.locator('li')).toHaveCount(3);
  });
}
