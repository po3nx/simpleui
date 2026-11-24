import type { UserConfig } from 'vitest/config';

/**
 * Konfigurasi test bersama (FND-005).
 *
 * Sumber keputusan:
 * - `docs/04-testing-strategy.md` §3 — Vitest workspace, coverage v8.
 * - `docs/00-rule-umum.md` §7.2 — ambang coverage per jenis paket.
 * - `docs/adr/0009-infrastruktur-test.md` — unit node, DOM di browser nyata.
 */

/** Ambang coverage per jenis paket (`docs/00-rule-umum.md` §7.2). */
export const COVERAGE_GATES = {
  core: { lines: 90, branches: 85 },
  component: { lines: 85, branches: 80 },
  adapter: { lines: 80, branches: 75 },
  overall: { lines: 85, branches: 80 },
} as const;

export type CoverageGate = keyof typeof COVERAGE_GATES;

/**
 * R-TEST-03: test wajib deterministik. Timezone dan locale dikunci agar
 * `Intl`/`Date` tidak bergantung pada mesin developer atau runner CI.
 */
export const TEST_ENV = {
  TZ: 'UTC',
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
} as const;

export interface CoverageOptions {
  /** Nama gate di `COVERAGE_GATES`. */
  gate: CoverageGate;
  /** Pola file sumber yang dihitung, relatif terhadap root paket. */
  include?: string[];
}

/** Opsi coverage v8 dengan ambang sesuai jenis paket. */
export function coverageOptions({
  gate,
  include = ['src/**/*.ts'],
}: CoverageOptions): NonNullable<UserConfig['test']>['coverage'] {
  return {
    enabled: true,
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    reportsDirectory: 'coverage',
    include,
    exclude: ['src/**/*.test.ts', '**/*.d.ts'],
    thresholds: COVERAGE_GATES[gate],
  };
}
