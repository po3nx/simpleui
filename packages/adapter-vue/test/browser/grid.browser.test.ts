import { createApp, defineComponent, h, nextTick, ref, type Slots } from 'vue';
import { createLeakTracker } from '@simpleui/testing';
import { describe, expect, it } from 'vitest';
import '../../../datagrid/src/styles/grid.css';
import { DataGrid } from '../../src/index.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10 },
  { id: 2, name: 'Budi', total: 20 },
];

const COLUMNS = [
  { dataField: 'name' as const, caption: 'Nama', width: 120 },
  { dataField: 'total' as const, caption: 'Total', width: 100 },
];

function mount(build: () => ReturnType<typeof h>, slots?: Slots) {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.append(container);
  const app = createApp(
    defineComponent({
      setup() {
        return build;
      },
    }),
  );
  app.mount(container);
  void slots;
  return {
    container,
    app,
    async next(): Promise<void> {
      await nextTick();
    },
    async unmount(): Promise<void> {
      app.unmount();
      container.remove();
    },
  };
}

function cells(container: HTMLElement): string[][] {
  return [...container.querySelectorAll<HTMLElement>('[role="row"]')]
    .filter((row) => row.querySelector('[role="gridcell"]'))
    .slice(0, 2)
    .map((row) =>
      [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].map(
        (cell) => cell.textContent ?? '',
      ),
    );
}

function header(
  container: HTMLElement,
  caption: string,
): HTMLElement | undefined {
  return [
    ...container.querySelectorAll<HTMLElement>('[role="columnheader"]'),
  ].find((cell) => cell.textContent?.includes(caption));
}

describe('Vue adapter — mount/slots', () => {
  it('merender grid dan membersihkan DOM saat unmount', async () => {
    const harness = mount(() =>
      h(DataGrid, {
        columns: COLUMNS,
        rows: ROWS,
        keyExpr: 'id',
      }),
    );
    await nextTick();

    expect(harness.container.querySelectorAll('[role="grid"]')).toHaveLength(1);
    expect(cells(harness.container)[0]).toEqual(['Ani', '10']);

    await harness.unmount();
    expect(harness.container.childElementCount).toBe(0);
  });

  it('cell dan header slot dirender ke DOM', async () => {
    const harness = mount(
      () =>
        h(
          DataGrid,
          { columns: COLUMNS, rows: ROWS, keyExpr: 'id' },
          {
            cell: (context: { value: unknown }) =>
              h('b', null, `V:${String(context.value)}`),
            header: (context: { value: unknown }) =>
              h('em', null, `H:${String(context.value)}`),
          },
        ),
      {
        cell: (context: { value: unknown }) =>
          h('b', null, `V:${String(context.value)}`),
        header: (context: { value: unknown }) =>
          h('em', null, `H:${String(context.value)}`),
      },
    );
    await nextTick();

    expect(
      harness.container.querySelector('[role="gridcell"] b')?.textContent,
    ).toBe('V:Ani');
    expect(
      harness.container.querySelector('[role="columnheader"] em')?.textContent,
    ).toBe('H:Nama');

    await harness.unmount();
  });

  it('update rows tanpa re-mount', async () => {
    const rows = ref<Row[]>(ROWS);
    const harness = mount(() =>
      h(DataGrid, { columns: COLUMNS, rows: rows.value, keyExpr: 'id' }),
    );
    await nextTick();

    rows.value = [{ id: 3, name: 'Cici', total: 30 }];
    await harness.next();

    expect(cells(harness.container)[0]).toEqual(['Cici', '30']);
    expect(harness.container.querySelectorAll('[role="grid"]')).toHaveLength(1);

    await harness.unmount();
  });
});

describe('Vue adapter — v-model', () => {
  it('v-model:sort-by memperbarui props dari klik header', async () => {
    const sortBy = ref<readonly { selector: string; desc?: boolean }[]>([]);
    const harness = mount(() =>
      h(DataGrid, {
        columns: COLUMNS,
        rows: ROWS,
        keyExpr: 'id',
        sortBy: sortBy.value,
        'onUpdate:sortBy': (
          next: readonly { selector: string; desc?: boolean }[],
        ) => {
          sortBy.value = next;
        },
      }),
    );
    await nextTick();

    header(harness.container, 'Nama')?.querySelector('button')?.click();
    await harness.next();

    expect(sortBy.value).toEqual([{ selector: 'name', desc: false }]);
    expect(header(harness.container, 'Nama')?.getAttribute('aria-sort')).toBe(
      'ascending',
    );

    await harness.unmount();
  });

  it('v-model:page-index memperbarui halaman', async () => {
    const pageIndex = ref(0);
    const harness = mount(() =>
      h(DataGrid, {
        columns: COLUMNS,
        rows: ROWS,
        keyExpr: 'id',
        pageIndex: pageIndex.value,
        pageSize: 10,
        totalCount: 50,
        'onUpdate:pageIndex': (next: number) => {
          pageIndex.value = next;
        },
      }),
    );
    await nextTick();

    const next = harness.container.querySelector(
      '[aria-label="Halaman berikutnya"]',
    ) as HTMLButtonElement;
    next.click();
    await harness.next();

    expect(pageIndex.value).toBe(1);
    expect(
      harness.container.querySelector('.sui-grid__pager-status')?.textContent,
    ).toBe('Halaman 2 dari 5 • 50 data');

    await harness.unmount();
  });

  it('v-model:selected-keys memperbarui seleksi', async () => {
    const selected = ref<readonly (string | number)[]>([]);
    const harness = mount(() =>
      h(DataGrid, {
        columns: COLUMNS,
        rows: ROWS,
        keyExpr: 'id',
        selectionMode: 'multiple',
        selectedKeys: selected.value,
        'onUpdate:selectedKeys': (next: readonly (string | number)[]) => {
          selected.value = next;
        },
      }),
    );
    await nextTick();

    const checkbox = harness.container.querySelector(
      '[role="gridcell"] input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.click();
    await harness.next();

    expect(selected.value).toEqual([1]);
    expect(
      (
        harness.container.querySelector(
          '[role="gridcell"] input[type="checkbox"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);

    await harness.unmount();
  });
});

describe('Vue adapter — dispose 100x', () => {
  it('tidak menyisakan DOM, listener global, atau timer', async () => {
    const tracker = createLeakTracker();
    const baseline = tracker.snapshot();
    for (let index = 0; index < 100; index += 1) {
      const harness = mount(() =>
        h(DataGrid, {
          columns: COLUMNS,
          rows: ROWS,
          keyExpr: 'id',
          viewOptions: {
            searchPanel: true,
            filterRow: true,
            headerFilter: true,
            getUniqueValues: () => ['Ani', 'Budi'],
            contextMenu: true,
            columnChooser: true,
          },
        }),
      );
      await nextTick();
      const input = harness.container.querySelector<HTMLInputElement>(
        '.sui-grid__search-input',
      );
      if (input) {
        input.value = 'Ani';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await harness.unmount();
      expect(harness.container.childElementCount).toBe(0);
    }
    const after = tracker.snapshot();
    expect(after.documentListeners).toBe(baseline.documentListeners);
    expect(after.windowListeners).toBe(baseline.windowListeners);
    expect(after.timers).toBe(baseline.timers);
    tracker.dispose();
  });
});
