import { createSeededRandom, type Seed } from './random.js';

/**
 * Factory data test dengan seeded random (FND-020).
 * Semua data deterministik: seed yang sama menghasilkan data yang sama.
 */

export interface PersonRow {
  readonly id: number;
  readonly name: string;
  readonly age: number;
  readonly active: boolean;
  readonly city: string;
}

export interface FixtureOptions {
  readonly seed?: Seed;
  readonly count?: number;
}

const FIRST_NAMES = [
  'Ani',
  'Budi',
  'Citra',
  'Dewi',
  'Eko',
  'Fajar',
  'Gita',
  'Hadi',
  'Indah',
  'Joko',
] as const;

const LAST_NAMES = [
  'Pratama',
  'Sari',
  'Wijaya',
  'Nugroho',
  'Halim',
  'Kusuma',
  'Santoso',
  'Rahayu',
] as const;

const CITIES = [
  'Jakarta',
  'Bandung',
  'Surabaya',
  'Medan',
  'Makassar',
  'Yogyakarta',
] as const;

/** Buat `count` baris deterministik. */
export function createRows(options: FixtureOptions = {}): PersonRow[] {
  const count = options.count ?? 10;
  const random = createSeededRandom(options.seed ?? 'simpleui');

  return Array.from({ length: count }, (_value, index) => ({
    id: index + 1,
    name: `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`,
    age: random.int(18, 65),
    active: random.chance(0.7),
    city: random.pick(CITIES),
  }));
}

/** Factory baris berdasarkan indeks, untuk kasus yang butuh data per baris. */
export function createRowFactory(
  options: FixtureOptions = {},
): (index: number) => PersonRow {
  const rows = createRows(options);
  return (index: number): PersonRow => {
    const row = rows[index % Math.max(rows.length, 1)];
    if (!row) throw new RangeError('index di luar jangkauan fixture');
    return row;
  };
}

/** Kolom contoh yang cocok dengan `PersonRow`. */
export function createColumns(): Array<{
  readonly field: keyof PersonRow;
  readonly caption: string;
}> {
  return [
    { field: 'id', caption: 'ID' },
    { field: 'name', caption: 'Nama' },
    { field: 'age', caption: 'Usia' },
    { field: 'active', caption: 'Aktif' },
    { field: 'city', caption: 'Kota' },
  ];
}

/** Payload keamanan untuk test lintas adapter (docs/05 §3). */
export const SECURITY_PAYLOADS = {
  xss: ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>'],
  url: ['javascript:alert(1)', 'https://trusted.com@evil.com'],
  csv: ['=1+1', '@user', '+62'],
  prototype: ['__proto__', 'constructor', 'prototype'],
} as const;
