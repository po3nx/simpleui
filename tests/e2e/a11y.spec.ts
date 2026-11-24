import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Uji a11y dan keyboard pada docs site nyata (FND-031, docs/04 §11).
 * Gate: tidak boleh ada pelanggaran axe berlevel serious/critical.
 */

const DOCS_URL = 'http://127.0.0.1:4174';
const DOCS_PAGES = [
  'pengantar',
  'instalasi',
  'tema',
  'aksesibilitas',
  'contoh',
];

async function openDocs(page: Page, slug: string) {
  await page.goto(`${DOCS_URL}/#/${slug}`);
  await expect(page.locator('.sui-docs-article h1')).toBeVisible();
}

for (const slug of DOCS_PAGES) {
  test(`axe: tidak ada pelanggaran serious/critical di "${slug}"`, async ({
    page,
  }) => {
    await openDocs(page, slug);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
    );

    expect(
      blocking.map((violation) => `${violation.id}: ${violation.help}`),
    ).toEqual([]);
  });
}

test('keyboard: tautan navigasi dapat difokuskan dan diaktifkan', async ({
  page,
}) => {
  await openDocs(page, 'pengantar');

  const contohLink = page.getByRole('link', { name: 'Contoh', exact: true });
  await contohLink.focus();
  await expect(contohLink).toBeFocused();

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/#\/contoh$/);
  await expect(page.locator('.sui-demo-viewport')).toBeVisible();
});

test('keyboard: pengalih tema dapat dioperasikan tanpa mouse', async ({
  page,
}) => {
  await openDocs(page, 'pengantar');

  const themeSelect = page.getByLabel('Tema');
  await themeSelect.focus();
  // Typeahead native select: 'd' memilih "dark" tanpa mouse.
  await page.keyboard.press('d');

  await expect(themeSelect).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('fokus terlihat pada tautan navigasi', async ({ page }) => {
  await openDocs(page, 'pengantar');

  const link = page.getByRole('link', { name: 'Instalasi', exact: true });
  await link.focus();

  const outline = await link.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });

  expect(outline.style).not.toBe('none');
  expect(Number.parseFloat(outline.width)).toBeGreaterThan(0);
});
