import type { DocPage, NavSection } from './nav.js';

/** Ambil slug dari hash (`#/tema` → `tema`), fallback ke halaman pertama. */
export function resolveSlug(
  hash: string,
  sections: readonly NavSection[],
): string {
  const raw = hash.replace(/^#\/?/, '').trim();
  const pages = sections.flatMap((section) => section.pages);

  if (raw && pages.some((page) => page.slug === raw)) return raw;
  return pages[0]?.slug ?? '';
}

/** Cari halaman berdasarkan slug. */
export function findPage(
  slug: string,
  sections: readonly NavSection[],
): DocPage | undefined {
  for (const section of sections) {
    const page = section.pages.find((item) => item.slug === slug);
    if (page) return page;
  }
  return undefined;
}
