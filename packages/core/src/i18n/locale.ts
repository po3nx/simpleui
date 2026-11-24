/**
 * Arah teks dan pseudo-locale (FND-016, docs/06-theming-a11y-i18n.md §3.4–3.5).
 */

export type TextDirection = 'ltr' | 'rtl';

/** Bahasa yang ditulis kanan-ke-kiri. */
const RTL_LANGUAGES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'he',
  'iw',
  'ku',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi',
]);

/** True bila kode bahasa utama locale termasuk RTL. */
export function isRtlLocale(locale: string): boolean {
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? '';
  return RTL_LANGUAGES.has(language);
}

export function getDirection(locale: string): TextDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

const ACCENTS: Readonly<Record<string, string>> = {
  a: 'á',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'é',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'í',
  j: 'ĵ',
  k: 'ķ',
  l: 'ĺ',
  m: 'ɱ',
  n: 'ñ',
  o: 'ó',
  p: 'þ',
  q: 'ǫ',
  r: 'ŕ',
  s: 'š',
  t: 'ţ',
  u: 'ú',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẋ',
  y: 'ý',
  z: 'ž',
  A: 'Á',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'É',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Í',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ĺ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ó',
  P: 'Þ',
  Q: 'Ǫ',
  R: 'Ŕ',
  S: 'Š',
  T: 'Ţ',
  U: 'Ú',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẋ',
  Y: 'Ý',
  Z: 'Ž',
};

/**
 * Pseudo-locale `en-XA`: aksen + perpanjangan ±30% agar truncation dan layout
 * RTL terlihat di visual regression (docs/06 §3.5).
 */
export function pseudoLocalize(text: string): string {
  const accented = [...text]
    .map((character) => ACCENTS[character] ?? character)
    .join('');
  const padding = '·'.repeat(Math.ceil(text.length * 0.3));
  return `${accented}${padding}`;
}

/** True bila locale meminta pseudo-locale. */
export function isPseudoLocale(locale: string): boolean {
  return locale.toLowerCase().endsWith('-xa');
}
