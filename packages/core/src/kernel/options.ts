import { SimpleUIError } from './errors.js';

/**
 * Gabungkan opsi default dengan opsi dari consumer (docs/01-arsitektur.md §5.1).
 *
 * Aturan:
 * - merge dangkal; objek bersarang diganti utuh, bukan digabung;
 * - nilai `undefined` tidak menimpa default;
 * - kunci yang tidak dikenal ditolak (`SUI-CORE-001`) agar typo tidak menjadi
 *   bug senyap.
 */
export function mergeOptions<T extends object>(
  defaults: T,
  input?: Partial<T>,
): T {
  const merged = { ...defaults };
  if (input === undefined) return merged;

  const known = new Set(Object.keys(defaults));

  for (const [key, value] of Object.entries(input)) {
    if (!known.has(key)) {
      throw new SimpleUIError(
        'SUI-CORE-001',
        `Opsi tidak dikenal: "${key}". Opsi yang tersedia: ${[...known].join(', ')}.`,
      );
    }
    if (value === undefined) continue;
    (merged as Record<string, unknown>)[key] = value;
  }

  return merged;
}
