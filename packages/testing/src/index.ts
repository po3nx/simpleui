/**
 * @simpleui/testing — harness dan fixture untuk test lintas adapter (FND-020).
 *
 * Subpath `@simpleui/testing/adapter` menyediakan kontrak adapter (butuh
 * Vitest). Entry utama bebas runtime test sehingga bisa dipakai di mana saja.
 */
export {
  createSeededRandom,
  hashSeed,
  type Seed,
  type SeededRandom,
} from './random.js';
export {
  createColumns,
  createRowFactory,
  createRows,
  SECURITY_PAYLOADS,
  type FixtureOptions,
  type PersonRow,
} from './fixtures.js';

export { captureAriaSnapshot } from './aria-snapshot.js';
