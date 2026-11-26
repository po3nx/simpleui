import '@angular/compiler';
import { createLeakTracker } from '@simpleui/testing';
import {
  ApplicationRef,
  createComponent,
  provideZonelessChangeDetection,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import '../../../datagrid/src/styles/grid.css';
import { DataGridComponent, isBrowserEnvironment } from '../../src/index.js';

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

interface Inputs {
  columns?: unknown;
  rows?: unknown;
  keyExpr?: unknown;
  pageIndex?: unknown;
  pageSize?: unknown;
  totalCount?: unknown;
  sortBy?: unknown;
  selectionMode?: unknown;
  selectedKeys?: unknown;
}

async function mount(initial: Inputs) {
  const host = document.createElement('div');
  host.style.width = '600px';
  host.style.height = '300px';
  document.body.append(host);
  const app = await createApplication({
    providers: [provideZonelessChangeDetection()],
  });
  const appRef = app.injector.get(ApplicationRef);
  const ref: ComponentRef<DataGridComponent> = createComponent(
    DataGridComponent,
    { environmentInjector: app.injector, hostElement: host },
  );
  appRef.attachView(ref.hostView);

  const setInputs = (next: Inputs): void => {
    for (const [key, value] of Object.entries(next)) {
      ref.setInput(key, value);
    }
    ref.changeDetectorRef.detectChanges();
  };
  setInputs(initial);

  return {
    host,
    ref,
    setInputs,
    destroy(): void {
      ref.destroy();
      appRef.detachView(ref.hostView);
      app.destroy();
      host.remove();
    },
  };
}

function cells(host: HTMLElement): string[][] {
  return [...host.querySelectorAll<HTMLElement>('[role="row"]')]
    .filter((row) => row.querySelector('[role="gridcell"]'))
    .slice(0, 2)
    .map((row) =>
      [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].map(
        (cell) => cell.textContent ?? '',
      ),
    );
}

function header(host: HTMLElement, caption: string): HTMLElement | undefined {
  return [...host.querySelectorAll<HTMLElement>('[role="columnheader"]')].find(
    (cell) => cell.textContent?.includes(caption),
  );
}

describe('Angular adapter — mount', () => {
  it('merender grid dan membersihkan DOM saat destroy', async () => {
    const harness = await mount({
      columns: COLUMNS,
      rows: ROWS,
      keyExpr: 'id',
    });

    expect(harness.host.querySelectorAll('[role="grid"]')).toHaveLength(1);
    expect(cells(harness.host)[0]).toEqual(['Ani', '10']);

    harness.destroy();
    expect(harness.host.querySelector('[role="grid"]')).toBeNull();
    expect(
      harness.host.querySelector('.simpleui-angular-grid')?.childElementCount ??
        0,
    ).toBe(0);
  });

  it('update rows tanpa mount ulang', async () => {
    const harness = await mount({
      columns: COLUMNS,
      rows: ROWS,
      keyExpr: 'id',
    });

    harness.setInputs({ rows: [{ id: 3, name: 'Cici', total: 30 }] });

    expect(cells(harness.host)[0]).toEqual(['Cici', '30']);
    expect(harness.host.querySelectorAll('[role="grid"]')).toHaveLength(1);

    harness.destroy();
  });

  it('guard SSR mendeteksi lingkungan browser', () => {
    expect(isBrowserEnvironment()).toBe(true);
  });
});

describe('Angular adapter — output controlled', () => {
  it('sortByChange dikirim dan UI kembali ke props', async () => {
    const harness = await mount({
      columns: COLUMNS,
      rows: ROWS,
      keyExpr: 'id',
      sortBy: [],
    });
    const handler = vi.fn();
    harness.ref.instance.sortByChange.subscribe(handler);

    header(harness.host, 'Nama')?.querySelector('button')?.click();

    expect(handler).toHaveBeenCalledWith([{ selector: 'name', desc: false }]);
    expect(header(harness.host, 'Nama')?.getAttribute('aria-sort')).toBe(
      'none',
    );

    harness.destroy();
  });

  it('pageChange dikirim tanpa optimistic update', async () => {
    const harness = await mount({
      columns: COLUMNS,
      rows: ROWS,
      keyExpr: 'id',
      pageIndex: 0,
      pageSize: 10,
      totalCount: 50,
    });
    const handler = vi.fn();
    harness.ref.instance.pageChange.subscribe(handler);

    const next = harness.host.querySelector(
      '[aria-label="Halaman berikutnya"]',
    ) as HTMLButtonElement;
    next.click();

    expect(handler).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    expect(
      harness.host.querySelector('.sui-grid__pager-status')?.textContent,
    ).toBe('Halaman 1 dari 5 • 50 data');

    harness.destroy();
  });

  it('selectedKeysChange dikirim dan checkbox kembali ke props', async () => {
    const harness = await mount({
      columns: COLUMNS,
      rows: ROWS,
      keyExpr: 'id',
      selectionMode: 'multiple',
      selectedKeys: [],
    });
    const handler = vi.fn();
    harness.ref.instance.selectedKeysChange.subscribe(handler);

    const checkbox = harness.host.querySelector(
      '[role="gridcell"] input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.click();

    expect(handler).toHaveBeenCalledWith([1]);
    expect(
      (
        harness.host.querySelector(
          '[role="gridcell"] input[type="checkbox"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(false);

    harness.setInputs({ selectedKeys: [1] });
    expect(
      (
        harness.host.querySelector(
          '[role="gridcell"] input[type="checkbox"]',
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);

    harness.destroy();
  });
});

describe('Angular adapter — dispose 100x', () => {
  it('tidak menyisakan DOM, listener global, atau timer', async () => {
    const app = await createApplication({
      providers: [provideZonelessChangeDetection()],
    });
    const appRef = app.injector.get(ApplicationRef);
    const cycle = (): void => {
      const host = document.createElement('div');
      host.style.width = '700px';
      host.style.height = '320px';
      document.body.append(host);
      const ref: ComponentRef<DataGridComponent> = createComponent(
        DataGridComponent,
        { environmentInjector: app.injector, hostElement: host },
      );
      appRef.attachView(ref.hostView);
      ref.setInput('columns', COLUMNS);
      ref.setInput('rows', ROWS);
      ref.setInput('keyExpr', 'id');
      ref.setInput('viewOptions', {
        searchPanel: true,
        filterRow: true,
        headerFilter: true,
        getUniqueValues: () => ['Ani', 'Budi'],
        contextMenu: true,
        columnChooser: true,
      });
      ref.changeDetectorRef.detectChanges();
      const input = host.querySelector<HTMLInputElement>(
        '.sui-grid__search-input',
      );
      if (input) {
        input.value = 'Ani';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      ref.destroy();
      appRef.detachView(ref.hostView);
      expect(host.querySelector('.sui-grid')).toBeNull();
      host.remove();
    };

    // Satu siklus pemanasan: listener level aplikasi Angular (jika ada) masuk
    // baseline, sehingga yang diukur hanya kebocoran per-komponen.
    cycle();
    const tracker = createLeakTracker();
    const baseline = tracker.snapshot();
    for (let index = 0; index < 100; index += 1) cycle();

    const after = tracker.snapshot();
    expect(after.documentListeners).toBe(baseline.documentListeners);
    expect(after.windowListeners).toBe(baseline.windowListeners);
    expect(after.timers).toBe(baseline.timers);
    app.destroy();
    tracker.dispose();
  });
});
