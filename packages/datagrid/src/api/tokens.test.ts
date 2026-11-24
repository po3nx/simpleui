import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Kontrak token visual DataGrid (DG-003, docs/components/datagrid/08-visual-spec).
 * Jika token diganti nama atau dihapus, test ini gagal sebelum CSS grid dibuat.
 */

const REQUIRED_TOKENS = [
  '--sui-color-bg-surface',
  '--sui-color-bg-subtle',
  '--sui-color-bg-hover',
  '--sui-color-bg-selected',
  '--sui-color-border-subtle',
  '--sui-color-border-strong',
  '--sui-color-text-primary',
  '--sui-color-text-secondary',
  '--sui-color-text-disabled',
  '--sui-color-accent-default',
  '--sui-color-accent-contrast',
  '--sui-color-danger-default',
  '--sui-border-width',
  '--sui-border-width-thick',
  '--sui-focus-ring-color',
  '--sui-focus-ring-width',
  '--sui-focus-ring-offset',
  '--sui-density-row-height',
  '--sui-density-cell-padding',
  '--sui-density-control-height',
  '--sui-font-size-sm',
  '--sui-font-size-md',
  '--sui-font-weight-semibold',
  '--sui-space-2',
  '--sui-space-6',
  '--sui-radius-md',
  '--sui-shadow-sm',
  '--sui-shadow-overlay',
  '--sui-z-sticky',
  '--sui-motion-duration-fast',
] as const;

const tokensCss = readFileSync(
  new URL('../../../theme/src/tokens.css', import.meta.url),
  'utf8',
);

describe('token visual DataGrid', () => {
  it('semua token pada visual spec tersedia di tema', () => {
    const missing = REQUIRED_TOKENS.filter(
      (token) => !tokensCss.includes(token),
    );

    expect(missing).toEqual([]);
  });
});
