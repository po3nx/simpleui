/**
 * Seeded random untuk test deterministik (FND-020,
 * docs/04-testing-strategy.md §4: DILARANG data acak tanpa seed).
 */

export type Seed = number | string;

/** Hash string menjadi integer 32-bit (deterministik). */
export function hashSeed(seed: Seed): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }

  const text = String(seed);
  let hash = 2_166_136_261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export interface SeededRandom {
  /** Bilangan [0, 1). */
  next(): number;
  /** Bilangan bulat inklusif [min, max]. */
  int(min: number, max: number): number;
  /** Pilih satu elemen; melempar bila daftar kosong. */
  pick<T>(items: readonly T[]): T;
  /** Salinan acak deterministik (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Boolean dengan probabilitas `probability` (default 0.5). */
  chance(probability?: number): boolean;
}

/** PRNG mulberry32: cepat, cukup untuk data test, tidak untuk kriptografi. */
export function createSeededRandom(seed: Seed): SeededRandom {
  let state = hashSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    int(min: number, max: number): number {
      if (max < min) throw new RangeError('max harus >= min');
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly T[]): T {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new RangeError('items tidak boleh kosong');
      return item;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1));
        const current = copy[index];
        const other = copy[swap];
        if (current === undefined || other === undefined) continue;
        copy[index] = other;
        copy[swap] = current;
      }
      return copy;
    },
    chance(probability = 0.5): boolean {
      return next() < probability;
    },
  };
}
