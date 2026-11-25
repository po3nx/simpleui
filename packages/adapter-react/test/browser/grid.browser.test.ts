import { act, createElement, StrictMode, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import '../../../datagrid/src/styles/grid.css';
import { DataGrid, type DataGridProps } from '../../src/index.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
  {
    dataField: 'total' as const,
    caption: 'Total',
    width: 100,
    dataType: 'number' as const,
  },
];

function render(props: DataGridProps<Row>, strict = true) {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.append(container);
  const root: Root = createRoot(container);
  const element = createElement(
    (strict ? StrictMode : 'div') as ComponentType<{ children?: unknown }>,
    strict ? { children: createElement(DataGrid, props) } : {},
  );
  const renderWith = async (next: DataGridProps<Row>): Promise<void> => {
    await act(async () => {
      root.render(
        strict
          ? createElement(StrictMode, null, createElement(DataGrid, next))
          : createElement(DataGrid, next),
      );
    });
  };
  void element;
  return {
    container,
    root,
    renderWith,
    async mount(): Promise<void> {
      await renderWith(props);
    },
    async unmount(): Promise<void> {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function header(
  container: HTMLElement,
  caption: string,
): HTMLElement | undefined {
  return [
    ...container.querySelectorAll<HTMLElement>('[role="columnheader"]'),
  ].find((cell) => cell.textContent?.includes(caption));
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

describe('React adapter — mount/StrictMode', () => {
  it('mount di StrictMode menghasilkan satu grid tanpa duplikasi', async () => {
    const harness = render({ columns: COLUMNS, rows: ROWS });
    await harness.mount();

    expect(harness.container.querySelectorAll('[role="grid"]')).toHaveLength(1);
    expect(cells(harness.container)[0]).toEqual(['Ani', '10']);
    expect(cells(harness.container)[1]).toEqual(['Budi', '20']);

    await harness.unmount();
    expect(harness.container.childElementCount).toBe(0);
  });

  it('update rows memperbarui sel tanpa mount ulang', async () => {
    const harness = render({ columns: COLUMNS, rows: ROWS });
    await harness.mount();

    await harness.renderWith({
      columns: COLUMNS,
      rows: [{ id: 3, name: 'Cici', total: 30 }],
    });

    expect(cells(harness.container)[0]).toEqual(['Cici', '30']);
    expect(harness.container.querySelectorAll('[role="grid"]')).toHaveLength(1);

    await harness.unmount();
  });
});

describe('React adapter — controlled props', () => {
  it('sort controlled kembali ke props bila parent tidak mengubah', async () => {
    const onSortChange = vi.fn();
    const harness = render({
      columns: COLUMNS,
      rows: ROWS,
      sortBy: [],
      onSortChange,
    });
    await harness.mount();

    const button = header(harness.container, 'Nama')?.querySelector('button');
    await act(async () => {
      button?.click();
    });

    expect(onSortChange).toHaveBeenCalledWith([
      { selector: 'name', desc: false },
    ]);
    expect(header(harness.container, 'Nama')?.getAttribute('aria-sort')).toBe(
      'none',
    );

    await harness.renderWith({
      columns: COLUMNS,
      rows: ROWS,
      sortBy: [{ selector: 'name', desc: false }],
      onSortChange,
    });
    expect(header(harness.container, 'Nama')?.getAttribute('aria-sort')).toBe(
      'ascending',
    );

    await harness.unmount();
  });

  it('page controlled menunggu props baru', async () => {
    const onPageChange = vi.fn();
    const props: DataGridProps<Row> = {
      columns: COLUMNS,
      rows: ROWS,
      pageIndex: 0,
      pageSize: 10,
      totalCount: 50,
      onPageChange,
    };
    const harness = render(props);
    await harness.mount();

    const next = harness.container.querySelector(
      '[aria-label="Halaman berikutnya"]',
    ) as HTMLButtonElement;
    await act(async () => {
      next.click();
    });

    expect(onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    expect(
      harness.container.querySelector('.sui-grid__pager-status')?.textContent,
    ).toBe('Halaman 1 dari 5 • 50 data');

    await harness.renderWith({ ...props, pageIndex: 1 });
    expect(
      harness.container.querySelector('.sui-grid__pager-status')?.textContent,
    ).toBe('Halaman 2 dari 5 • 50 data');

    await harness.unmount();
  });

  it('selection controlled kembali ke props bila parent tidak mengubah', async () => {
    const onSelectionChange = vi.fn();
    const props: DataGridProps<Row> = {
      columns: COLUMNS,
      rows: ROWS,
      selectionMode: 'multiple',
      selectedKeys: [],
      onSelectionChange,
    };
    const harness = render(props);
    await harness.mount();

    const checkbox = harness.container.querySelector(
      '[role="gridcell"] input[type="checkbox"]',
    ) as HTMLInputElement;
    await act(async () => {
      checkbox.click();
    });

    expect(onSelectionChange).toHaveBeenCalledWith([1]);
    expect(
      (
        harness.container.querySelector(
          '[role="gridcell"] input[type="checkbox"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(false);

    await harness.renderWith({ ...props, selectedKeys: [1] });
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
