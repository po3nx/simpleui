import { expect, test, type Page } from '@playwright/test';

/**
 * Cross-browser layout matrix DataGrid (DG-058).
 *
 * Dijalankan pada Chromium/Firefox/WebKit (nightly) terhadap harness UMD yang
 * sama. Fokus: layout scroll (header/baris sinkron, tanpa scrollbar palsu),
 * footer tidak menutupi baris, serta search/pager benar-benar bekerja.
 */

const GRID_URL = 'http://127.0.0.1:4176/tools/a11y-harness/';

async function openGrid(page: Page) {
  await page.goto(GRID_URL);
  await expect(page.locator('[role="grid"]')).toBeVisible();
  await expect(page.locator('[role="gridcell"]').first()).toBeVisible();
}

async function expectAligned(page: Page) {
  const offsets = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(
      '[role="columnheader"][data-column-id="city"]',
    );
    const cell = document.querySelector<HTMLElement>(
      '[role="gridcell"][data-column-id="city"]',
    );
    return {
      header: header?.getBoundingClientRect().left ?? 0,
      cell: cell?.getBoundingClientRect().left ?? 0,
    };
  });
  expect(Math.abs(offsets.header - offsets.cell)).toBeLessThan(1);
}

test('grid muat tanpa scrollbar horizontal palsu', async ({ page }) => {
  await openGrid(page);
  const sizes = await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.sui-grid__viewport');
    return {
      client: viewport?.clientWidth ?? 0,
      scroll: viewport?.scrollWidth ?? 0,
    };
  });
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  await expectAligned(page);
});

for (const width of [1280, 768, 420]) {
  test(`layout ${width}px — header/baris sinkron saat scroll`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await openGrid(page);

    const viewport = page.locator('.sui-grid__viewport');
    await viewport.evaluate((element) => {
      element.scrollLeft = 120;
      element.dispatchEvent(new Event('scroll'));
    });
    await expectAligned(page);

    await viewport.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event('scroll'));
    });
    const geometry = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>(
        '.sui-grid__viewport',
      );
      const footer = document.querySelector<HTMLElement>('.sui-grid__footer');
      return {
        viewportBottom: viewport?.getBoundingClientRect().bottom ?? 0,
        footerTop: footer?.getBoundingClientRect().top ?? 0,
        scrollable:
          (viewport?.scrollHeight ?? 0) > (viewport?.clientHeight ?? 0),
      };
    });
    expect(geometry.footerTop).toBeGreaterThanOrEqual(
      geometry.viewportBottom - 1,
    );
    expect(geometry.scrollable).toBe(true);
  });
}

test('search dan pager mengubah isi grid', async ({ page }) => {
  await openGrid(page);
  const search = page.locator('.sui-grid__search-input');
  await search.fill('Karyawan 01');
  await expect(page.locator('.sui-grid__pager-status')).toContainText('1 data');

  await search.fill('');
  await expect(page.locator('.sui-grid__pager-status')).toContainText(
    '42 data',
  );
  await page.locator('[aria-label="Halaman berikutnya"]').click();
  await expect(page.locator('.sui-grid__pager-status')).toContainText(
    'Halaman 2 dari 5',
  );
  await expect(
    page
      .locator('.sui-grid__rows [role="gridcell"][data-column-id="name"]')
      .first(),
  ).toContainText('Karyawan 11');
});

test('filter row dan header filter dapat dioperasikan keyboard', async ({
  page,
}) => {
  await openGrid(page);
  const filter = page.locator(
    '.sui-grid__filter-cell[data-column-id="name"] input',
  );
  await filter.fill('Karyawan 02');
  await page.keyboard.press('Tab');
  await expect(page.locator('.sui-grid__pager-status')).toContainText('1 data');

  const trigger = page.locator(
    '[role="columnheader"][data-column-id="name"] .sui-grid__header-filter',
  );
  await trigger.focus();
  await trigger.press('Enter');
  const panel = page.locator('.sui-grid__filter-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.sui-grid__filter-search')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('RTL: layout, scroll, dan navigasi kolom', async ({ page }) => {
  await page.goto(`${GRID_URL}?rtl=1`);
  await expect(page.locator('[role="grid"]')).toBeVisible();
  await expect(page.locator('.sui-grid')).toHaveAttribute('dir', 'rtl');

  const sizes = await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('.sui-grid__viewport');
    return {
      client: viewport?.clientWidth ?? 0,
      scroll: viewport?.scrollWidth ?? 0,
    };
  });
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  await expectAligned(page);

  const grid = page.locator('[role="grid"]');
  await grid.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  const colIndex = await page.evaluate(() =>
    document.activeElement?.getAttribute('aria-colindex'),
  );
  expect(colIndex).toBe('3');
});
