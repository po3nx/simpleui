/**
 * Katalog pesan (FND-016, docs/06-theming-a11y-i18n.md §3.3).
 *
 * - Key mengikuti `sui.<komponen>.<area>.<key>`.
 * - Placeholder `{nama}` diganti sebagai teks biasa; katalog tidak pernah
 *   dievaluasi sebagai kode dan tidak menghasilkan HTML.
 * - Pesan plural memakai `Intl.PluralRules` lewat objek `{ one, other }`.
 */

export type MessageParams = Record<string, string | number>;

export interface PluralForms {
  one: string;
  other: string;
  zero?: string;
  two?: string;
  few?: string;
  many?: string;
}

export type MessageValue = string | PluralForms;

export type MessageCatalog = Readonly<Record<string, MessageValue>>;

/** Ganti `{nama}` dengan nilai parameter; placeholder tanpa nilai dibiarkan. */
export function formatMessage(
  template: string,
  params: MessageParams = {},
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

/**
 * Pilih bentuk plural yang sesuai, fallback ke `other`.
 * Bentuk `zero` dipakai eksplisit untuk count 0 (CLDR `en` memetakannya ke
 * `other`, padahal UI biasanya ingin "tidak ada baris dipilih").
 */
export function resolvePlural(
  value: PluralForms,
  count: number,
  rules: Intl.PluralRules,
): string {
  if (count === 0 && value.zero) return value.zero;

  const form = rules.select(count);
  return value[form as keyof PluralForms] ?? value.other;
}

/** Katalog bawaan (bahasa Inggris, sesuai default locale `en`). */
export const DEFAULT_MESSAGES: MessageCatalog = {
  'sui.common.loading': 'Loading…',
  'sui.common.empty.noData': 'No data',
  'sui.common.validation.required': 'Required',
  'sui.common.filter.clear': 'Clear filter',
  'sui.common.pager.pageOf': 'Page {page} of {pages}',
  'sui.common.selection.selected': {
    one: '{count} row selected',
    other: '{count} rows selected',
    zero: 'No rows selected',
  },
  'sui.common.selection.selectAll': 'Select all',
  'sui.datagrid.filter.contains': 'Contains',
  'sui.datagrid.filter.startsWith': 'Starts with',
};
