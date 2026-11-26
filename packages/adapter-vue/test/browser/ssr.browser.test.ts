import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { DataGrid } from '../../src/index.js';

describe('Vue adapter — SSR (DG-055)', () => {
  it('renderToString aman dan menghasilkan placeholder', async () => {
    const app = createSSRApp({
      render: () =>
        h(DataGrid, {
          columns: [{ dataField: 'name', caption: 'Nama' }],
          rows: [{ id: 1, name: 'Ani' }],
          keyExpr: 'id',
        }),
    });
    const html = await renderToString(app);

    expect(html).toContain('simpleui-vue-grid');
    expect(html).not.toContain('role="grid"');
  });
});
