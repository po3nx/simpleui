import { SimpleUIError } from '../kernel/errors.js';

/**
 * Utilitas DOM minimal untuk renderer (FND-013, docs/01-arsitektur.md §5.3).
 *
 * Aturan yang ditegakkan:
 * - Teks selalu lewat `textContent`; tidak ada `innerHTML`.
 * - Atribut `on*` dan URL `javascript:` ditolak (`SUI-DOM-001`) agar data tidak
 *   bisa menjadi script (docs/05-security.md).
 * - Style dinamis ditulis lewat CSSOM (`style.setProperty`), bukan string HTML,
 *   dan nilainya divalidasi dari penyelundupan properti.
 */

export interface ElementOptions {
  className?: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  text?: string;
  children?: readonly Node[];
}

const UNSAFE_URL = /^\s*javascript:/i;
const PROPERTY_INJECTION = /[;{}]/;

/** Buat element dengan atribut, teks, dan anak — tanpa HTML parsing. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options.className) element.className = options.className;
  if (options.attrs) setAttributes(element, options.attrs);
  if (options.text !== undefined) element.textContent = options.text;
  if (options.children) element.append(...options.children);

  return element;
}

/**
 * Set atribut dengan validasi keamanan.
 * - `null`/`undefined`/`false` menghapus atribut;
 * - `true` menjadi atribut boolean kosong;
 * - nama `on*` dan nilai `javascript:` ditolak.
 */
export function setAttributes(
  element: Element,
  attrs: Record<string, unknown>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) {
      element.removeAttribute(name);
      continue;
    }

    if (name.toLowerCase().startsWith('on')) {
      throw new SimpleUIError(
        'SUI-DOM-001',
        `Atribut event handler ditolak: "${name}". Gunakan addEventListener.`,
      );
    }

    const text = value === true ? '' : String(value);
    if (UNSAFE_URL.test(text)) {
      throw new SimpleUIError(
        'SUI-DOM-001',
        `Nilai URL tidak aman untuk atribut "${name}".`,
      );
    }

    element.setAttribute(name, text);
  }
}

/** Gabungkan kelas, abaikan nilai falsy. */
export function classNames(
  ...values: readonly (string | false | null | undefined)[]
): string {
  return values.filter(Boolean).join(' ');
}

/** Tambah atau lepas satu kelas tanpa menyentuh kelas lain. */
export function toggleClass(
  element: Element,
  name: string,
  force?: boolean,
): void {
  element.classList.toggle(name, force);
}

/**
 * Tulis satu properti CSS lewat CSSOM.
 * Nama dan nilai yang mengandung `;`, `{`, atau `}` ditolak agar tidak bisa
 * menyelundupkan properti lain.
 */
export function setStyle(
  element: HTMLElement,
  property: string,
  value: string,
): void {
  if (PROPERTY_INJECTION.test(property) || PROPERTY_INJECTION.test(value)) {
    throw new SimpleUIError(
      'SUI-DOM-001',
      `Nilai style tidak aman: "${property}: ${value}".`,
    );
  }

  element.style.setProperty(property, value);
}

/** Tulis beberapa properti CSS sekaligus. */
export function setStyles(
  element: HTMLElement,
  styles: Record<string, string>,
): void {
  for (const [property, value] of Object.entries(styles)) {
    setStyle(element, property, value);
  }
}

/** Cari leluhur yang dapat di-scroll, atau `null` bila tidak ada. */
export function getScrollParent(element: Element): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const style = getComputedStyle(parent);
    const scrollableY = /(auto|scroll|overlay)/.test(style.overflowY);
    const scrollableX = /(auto|scroll|overlay)/.test(style.overflowX);

    if (scrollableY || scrollableX) return parent;
    parent = parent.parentElement;
  }

  return null;
}

/**
 * Pastikan element terlihat tanpa menggulir seluruh halaman bila sudah terlihat.
 * Memakai `scrollIntoView({ block: 'nearest' })` yang didukung browser modern.
 */
export function scrollIntoViewIfNeeded(
  element: Element,
  options: ScrollIntoViewOptions = { block: 'nearest', inline: 'nearest' },
): void {
  element.scrollIntoView(options);
}
