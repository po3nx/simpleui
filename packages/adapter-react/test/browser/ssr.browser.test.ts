import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataGrid } from '../../src/index.js';

describe('React adapter — SSR (DG-055)', () => {
  it('renderToString tidak menyentuh DOM dan menghasilkan placeholder', () => {
    const html = renderToString(
      createElement(DataGrid, {
        columns: [{ dataField: 'name', caption: 'Nama' }],
        rows: [{ id: 1, name: 'Ani' }],
        keyExpr: 'id',
      }),
    );

    expect(html).toContain('simpleui-react-grid');
    expect(html).not.toContain('role="grid"');
  });
});
