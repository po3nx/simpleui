/**
 * Logika navigasi keyboard murni (FND-014).
 *
 * Dipisahkan dari DOM agar dapat diuji tanpa browser dan dipakai ulang oleh
 * roving tabindex maupun komponen grid (docs/01-arsitektur.md §5).
 */

export type NavigationOrientation = 'vertical' | 'horizontal' | 'both';

export interface NavigationOptions {
  /** Arah yang direspons; default `vertical`. */
  orientation?: NavigationOrientation;
  /** Kembali ke ujung saat melewati batas. */
  wrap?: boolean;
}

const NAVIGATION_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

/** True untuk tombol yang menggeser fokus. */
export function isNavigationKey(key: string): boolean {
  return NAVIGATION_KEYS.has(key);
}

/** True untuk tombol aktivasi (Enter atau Space). */
export function isActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}

/** True untuk Escape — dipakai overlay untuk menutup diri (R-A11Y-03). */
export function isEscapeKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc';
}

function directionOf(
  key: string,
  orientation: NavigationOrientation,
): 1 | -1 | 0 {
  const forwards =
    orientation === 'vertical'
      ? key === 'ArrowDown'
      : orientation === 'horizontal'
        ? key === 'ArrowRight'
        : key === 'ArrowDown' || key === 'ArrowRight';

  if (forwards) return 1;

  const backwards =
    orientation === 'vertical'
      ? key === 'ArrowUp'
      : orientation === 'horizontal'
        ? key === 'ArrowLeft'
        : key === 'ArrowUp' || key === 'ArrowLeft';

  return backwards ? -1 : 0;
}

function clamp(value: number, count: number): number {
  return Math.min(Math.max(value, 0), count - 1);
}

/**
 * Hitung indeks tujuan untuk satu tombol navigasi.
 * Mengembalikan `null` bila tombol tidak relevan untuk orientasi tersebut.
 */
export function nextIndex(
  current: number,
  count: number,
  key: string,
  options: NavigationOptions = {},
): number | null {
  if (count <= 0) return null;

  const { orientation = 'vertical', wrap = false } = options;

  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;

  const direction = directionOf(key, orientation);
  if (direction === 0) return null;

  const target = current + direction;
  if (target >= 0 && target < count) return target;
  if (wrap) return (target + count) % count;

  return clamp(target, count);
}
