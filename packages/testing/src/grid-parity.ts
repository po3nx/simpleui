/* eslint-disable max-lines -- registry 40 skenario parity; urutan skenario sengaja satu berkas. */
import type { Key, SortDescriptor } from '@simpleui/core';
import { describe, expect, it } from 'vitest';

/**
 * Parity harness adapter (DG-054): skenario inti yang sama dijalankan untuk
 * setiap framework. Skenario lanjutan (editing/export/SSR/persistence)
 * menunggu adapter mengekspos opsi terkait.
 */

export type ParityRow = Record<string, unknown>;

export interface ParityColumn {
  readonly dataField: string;
  readonly caption?: string;
  readonly width?: number;
  readonly visible?: boolean;
  readonly dataType?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ParityOptions {
  readonly columns: readonly ParityColumn[];
  readonly rows: readonly ParityRow[];
  readonly keyExpr?: string;
  readonly sortBy?: readonly SortDescriptor[];
  readonly selectedKeys?: readonly Key[];
  readonly pageIndex?: number;
  readonly pageSize?: number;
  readonly totalCount?: number;
  readonly selectionMode?: 'none' | 'single' | 'multiple';
  readonly onSortChange?: (sortBy: readonly SortDescriptor[]) => void;
  readonly onSelectionChange?: (keys: readonly Key[]) => void;
  readonly onPageChange?: (state: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  readonly viewOptions?: Readonly<Record<string, unknown>> | undefined;
  readonly locale?: string | undefined;
  readonly status?:
    'loading' | 'empty' | 'no-data' | 'error' | null | undefined;
  readonly statusMessage?: string | undefined;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface GridHarness {
  readonly container: HTMLElement;
  mount(options: ParityOptions): Promise<void>;
  update(options: ParityOptions): Promise<void>;
  destroy(): void;
}

export type GridHarnessFactory = (container: HTMLElement) => GridHarness;

export const COLUMNS: readonly ParityColumn[] = [
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100 },
];

export function makeRows(count: number): ParityRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Nama ${index + 1}`,
    total: index * 10,
  }));
}

function baseOptions(extra: Partial<ParityOptions> = {}): ParityOptions {
  return { columns: COLUMNS, rows: makeRows(10), keyExpr: 'id', ...extra };
}

function dataRows(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[role="row"]')].filter(
    (row) => row.querySelector('[role="gridcell"]') !== null && !row.hidden,
  );
}

function cellTexts(container: HTMLElement): string[][] {
  return dataRows(container).map((row) =>
    [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].map(
      (cell) => cell.textContent ?? '',
    ),
  );
}

function headerAriaSort(
  container: HTMLElement,
  caption: string,
): string | null {
  const header = [
    ...container.querySelectorAll<HTMLElement>('[role="columnheader"]'),
  ].find((cell) => cell.textContent?.includes(caption));
  return header?.getAttribute('aria-sort') ?? null;
}

interface Scenario {
  readonly name: string;
  run(harness: GridHarness, container: HTMLElement): Promise<void>;
}

async function scenarioRender(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  expect(cellTexts(container)).toHaveLength(10);
  expect(cellTexts(container)[0]).toEqual(['Nama 1', '0']);
}

async function scenarioEmpty(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions({ rows: [] }));
  expect(cellTexts(container)).toHaveLength(0);
  expect(container.querySelector('[role="grid"]')).not.toBeNull();
}

async function scenarioUpdateRows(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  await harness.update(baseOptions({ rows: makeRows(2) }));
  expect(cellTexts(container)).toHaveLength(2);
  expect(container.querySelectorAll('[role="grid"]')).toHaveLength(1);
}

async function scenarioUpdateColumns(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  await harness.update(
    baseOptions({
      columns: [
        { dataField: 'name', caption: 'Nama Lengkap' },
        { dataField: 'total', caption: 'Total' },
      ],
    }),
  );
  expect(
    container.querySelector('[role="columnheader"]')?.textContent,
  ).toContain('Nama Lengkap');
}

async function scenarioSortSnapback(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: (readonly SortDescriptor[])[] = [];
  await harness.mount(
    baseOptions({ sortBy: [], onSortChange: (next) => calls.push(next) }),
  );
  container.querySelector<HTMLElement>('[role="columnheader"] button')?.click();
  expect(calls).toEqual([[{ selector: 'name', desc: false }]]);
  expect(headerAriaSort(container, 'Nama')).toBe('none');
}

async function scenarioSortApplied(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(
    baseOptions({ sortBy: [{ selector: 'name', desc: false }] }),
  );
  expect(headerAriaSort(container, 'Nama')).toBe('ascending');
}

async function scenarioSelectionSnapback(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: (readonly Key[])[] = [];
  await harness.mount(
    baseOptions({
      selectionMode: 'multiple',
      selectedKeys: [],
      onSelectionChange: (keys) => calls.push(keys),
    }),
  );
  container
    .querySelector<HTMLInputElement>('[role="gridcell"] input[type="checkbox"]')
    ?.click();
  expect(calls).toEqual([[1]]);
  expect(
    container.querySelector<HTMLInputElement>(
      '[role="gridcell"] input[type="checkbox"]',
    )?.checked,
  ).toBe(false);
}

async function scenarioSelectionApplied(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(
    baseOptions({ selectionMode: 'multiple', selectedKeys: [1] }),
  );
  expect(
    container.querySelector<HTMLInputElement>(
      '[role="gridcell"] input[type="checkbox"]',
    )?.checked,
  ).toBe(true);
}

async function scenarioPage(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: { pageIndex: number; pageSize: number }[] = [];
  await harness.mount(
    baseOptions({
      pageIndex: 0,
      pageSize: 10,
      totalCount: 50,
      onPageChange: (state) => calls.push(state),
    }),
  );
  container
    .querySelector<HTMLButtonElement>('[aria-label="Halaman berikutnya"]')
    ?.click();
  expect(calls).toEqual([{ pageIndex: 1, pageSize: 10 }]);
  expect(container.querySelector('.sui-grid__pager-status')?.textContent).toBe(
    'Halaman 1 dari 5 • 50 data',
  );
}

async function scenarioDestroy(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  harness.destroy();
  expect(container.querySelector('[role="grid"]')).toBeNull();
  expect(() => harness.destroy()).not.toThrow();
}

async function scenarioFilterRow(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: unknown[] = [];
  await harness.mount(
    baseOptions({
      viewOptions: {
        filterRow: true,
        onFilterChange: (filter: unknown) => calls.push(filter),
      },
    }),
  );
  const input = container.querySelector<HTMLInputElement>(
    '.sui-grid__filter-input',
  );
  if (!input) throw new Error('filter input tidak ditemukan');
  input.value = 'A';
  input.dispatchEvent(new Event('change'));
  expect(calls[0]).toEqual(['name', 'contains', 'A']);
}

async function scenarioSearch(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: [string, readonly string[]][] = [];
  await harness.mount(
    baseOptions({
      viewOptions: {
        searchPanel: true,
        searchDebounceMs: 10,
        onSearchChange: (query: string, fields: readonly string[]) =>
          calls.push([query, fields]),
      },
    }),
  );
  const input = container.querySelector<HTMLInputElement>(
    '.sui-grid__search-input',
  );
  if (!input) {
    console.log('DEBUG no search', container.innerHTML.slice(0, 500));
    throw new Error('search input tidak ditemukan');
  }
  input.value = 'ani';
  input.dispatchEvent(new Event('input'));
  await sleep(40);
  expect(calls.at(-1)?.[0]).toBe('ani');
  expect(calls.at(-1)?.[1]).toContain('name');
}

async function scenarioContextMenu(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions({ viewOptions: { contextMenu: true } }));
  container
    .querySelector<HTMLElement>('[role="gridcell"]')
    ?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 5, clientY: 5 }),
    );
  expect(document.querySelector('.sui-grid__context-menu')).not.toBeNull();
  document.querySelector('.sui-grid__context-menu')?.remove();
}

async function scenarioRtl(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions({ viewOptions: { rtl: true } }));
  expect(container.querySelector('[role="grid"]')?.getAttribute('dir')).toBe(
    'rtl',
  );
}

async function scenarioHeaderFilter(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  container
    .querySelector<HTMLButtonElement>('.sui-grid__header-filter')
    ?.click();
  expect(document.querySelector('.sui-grid__filter-panel')).not.toBeNull();
  document.querySelector('.sui-grid__filter-panel')?.remove();
}

async function scenarioKeyboard(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  container
    .querySelector<HTMLElement>('[role="grid"]')
    ?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
  expect((document.activeElement as HTMLElement | null)?.className).toContain(
    'sui-grid__cell',
  );
}

async function scenarioMultiSort(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: unknown[] = [];
  await harness.mount(
    baseOptions({ onSortChange: (next) => calls.push(next) }),
  );
  const buttons = [
    ...container.querySelectorAll<HTMLButtonElement>(
      '[role="columnheader"] .sui-grid__header-button',
    ),
  ];
  buttons[0]?.click();
  buttons[1]?.dispatchEvent(
    new MouseEvent('click', { shiftKey: true, bubbles: true }),
  );
  expect(calls.at(-1)).toEqual([
    { selector: 'name', desc: false },
    { selector: 'total', desc: false },
  ]);
}

async function scenarioLiveRegion(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  container
    .querySelector<HTMLButtonElement>(
      '[role="columnheader"] .sui-grid__header-button',
    )
    ?.click();
  expect(container.querySelector('.sui-grid__live')?.textContent).toContain(
    'Diurutkan',
  );
}

async function scenarioLarge(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions({ rows: makeRows(1000) }));
  expect(dataRows(container).length).toBeLessThan(50);
  expect(dataRows(container).length).toBeGreaterThan(0);
}

async function scenarioRemount(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    await harness.mount(baseOptions());
    harness.destroy();
  }
  expect(container.querySelector('[role="grid"]')).toBeNull();
}

async function scenarioXss(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const payload = '<img src=x onerror="window.__xss=1">';
  await harness.mount(
    baseOptions({ rows: [{ id: 1, name: payload, total: 0 }] }),
  );
  expect(cellTexts(container)[0]?.[0]).toBe(payload);
  expect(container.querySelector('img')).toBeNull();
}

async function scenarioInvalidColumn(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(
    baseOptions({ columns: [{ dataField: 'missing' }], rows: makeRows(1) }),
  );
  expect(cellTexts(container)).toHaveLength(1);
  expect(cellTexts(container)[0]?.[0]).toBe('—');
}

async function scenarioConcurrent(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  await harness.update(baseOptions({ rows: makeRows(1) }));
  await harness.update(baseOptions({ rows: makeRows(3) }));
  expect(cellTexts(container)).toHaveLength(3);
}

async function scenarioSelectAll(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: unknown[] = [];
  await harness.mount(
    baseOptions({
      selectionMode: 'multiple',
      selectedKeys: [],
      onSelectionChange: (keys) => calls.push(keys),
    }),
  );
  container
    .querySelector<HTMLInputElement>(
      '[role="columnheader"] input[type="checkbox"]',
    )
    ?.click();
  expect((calls.at(-1) as unknown[] | undefined)?.length).toBe(10);
}

async function scenarioResize(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  const handle = container.querySelector<HTMLElement>(
    '.sui-grid__resize-handle',
  );
  if (!handle) throw new Error('resize handle tidak ditemukan');
  const before = Number(handle.getAttribute('aria-valuenow'));
  handle.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
  );
  expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 10);
}

async function scenarioEventOrder(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const order: string[] = [];
  await harness.mount(
    baseOptions({
      onSortChange: () => order.push('sort'),
      onPageChange: () => order.push('page'),
      pageIndex: 0,
      pageSize: 10,
      totalCount: 50,
    }),
  );
  container
    .querySelector<HTMLButtonElement>(
      '[role="columnheader"] .sui-grid__header-button',
    )
    ?.click();
  container
    .querySelector<HTMLButtonElement>('[aria-label="Halaman berikutnya"]')
    ?.click();
  expect(order).toEqual(['sort', 'page']);
}

async function scenarioUncontrolled(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: unknown[] = [];
  await harness.mount(
    baseOptions({ onSortChange: (next) => calls.push(next) }),
  );
  container
    .querySelector<HTMLButtonElement>(
      '[role="columnheader"] .sui-grid__header-button',
    )
    ?.click();
  expect(calls).toHaveLength(1);
  expect(headerAriaSort(container, 'Nama')).toBe('ascending');
}

async function scenarioUnmountListeners(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  harness.destroy();
  expect(() => {
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    container.dispatchEvent(new Event('scroll'));
  }).not.toThrow();
  expect(container.querySelector('[role="grid"]')).toBeNull();
}

async function scenarioDoubleMount(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  harness.destroy();
  await harness.mount(baseOptions());
  expect(container.querySelectorAll('[role="grid"]')).toHaveLength(1);
  expect(cellTexts(container)).toHaveLength(10);
}

async function scenarioErrorState(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(
    baseOptions({ status: 'error', statusMessage: 'Gagal memuat' }),
  );
  const status = container.querySelector('.sui-grid__status');
  expect(status?.getAttribute('role')).toBe('alert');
  expect(status?.textContent).toContain('Gagal memuat');
}

async function scenarioLoadingState(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions({ status: 'loading' }));
  expect(
    container.querySelector('[role="grid"]')?.getAttribute('aria-busy'),
  ).toBe('true');
  expect(
    container.querySelector('.sui-grid__status')?.getAttribute('role'),
  ).toBe('status');
  await harness.update(baseOptions({ status: null }));
  expect(
    container.querySelector('[role="grid"]')?.hasAttribute('aria-busy'),
  ).toBe(false);
}

async function scenarioRoles(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  expect(container.querySelector('[role="grid"]')).not.toBeNull();
  expect(
    container.querySelectorAll('[role="rowgroup"]').length,
  ).toBeGreaterThan(0);
  expect(container.querySelector('[role="columnheader"]')).not.toBeNull();
  expect(
    container.querySelector('[role="gridcell"]')?.getAttribute('aria-colindex'),
  ).toBe('1');
  expect(
    container
      .querySelector('[role="row"][aria-rowindex]')
      ?.getAttribute('aria-rowindex'),
  ).toBe('1');
}

async function scenarioDestroyLoading(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions({ status: 'loading' }));
  expect(() => harness.destroy()).not.toThrow();
  expect(container.querySelector('[role="grid"]')).toBeNull();
}

async function scenarioReorder(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const calls: unknown[] = [];
  await harness.mount(
    baseOptions({
      viewOptions: { onColumnReorder: (order: unknown) => calls.push(order) },
    }),
  );
  const button = container.querySelector<HTMLButtonElement>(
    '[role="columnheader"] .sui-grid__header-button',
  );
  if (!button) throw new Error('header button tidak ditemukan');
  button.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      altKey: true,
      bubbles: true,
    }),
  );
  expect((calls.at(-1) as string[]).slice(0, 2)).toEqual(['total', 'name']);
}

async function scenarioLocale(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  const rows = [{ id: 1, name: 'A', total: 1234.5 }];
  await harness.mount(
    baseOptions({
      columns: [
        { dataField: 'name', caption: 'Nama' },
        { dataField: 'total', caption: 'Total', dataType: 'number' },
      ],
      rows,
      locale: 'en',
    }),
  );
  expect(cellTexts(container)[0]?.[1]).toBe('1,234.5');
  await harness.update(
    baseOptions({
      columns: [
        { dataField: 'name', caption: 'Nama' },
        { dataField: 'total', caption: 'Total', dataType: 'number' },
      ],
      rows,
      locale: 'id-ID',
    }),
  );
  expect(cellTexts(container)[0]?.[1]).toBe('1.234,5');
}

async function scenarioTheme(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  container.classList.add('sui-theme');
  await harness.mount(baseOptions());
  const grid = container.querySelector<HTMLElement>('.sui-grid');
  if (!grid) throw new Error('grid tidak ditemukan');
  const light = getComputedStyle(grid).backgroundColor;
  container.setAttribute('data-theme', 'dark');
  const dark = getComputedStyle(grid).backgroundColor;
  expect(dark).not.toBe(light);
}

async function scenarioReloadSelection(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(
    baseOptions({ selectionMode: 'multiple', selectedKeys: [1] }),
  );
  await harness.update(
    baseOptions({
      selectionMode: 'multiple',
      selectedKeys: [1],
      rows: makeRows(10),
    }),
  );
  expect(
    container.querySelector<HTMLInputElement>(
      '[role="gridcell"] input[type="checkbox"]',
    )?.checked,
  ).toBe(true);
}

async function scenarioDuplicateKeys(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(
    baseOptions({
      rows: [
        { id: 1, name: 'A', total: 0 },
        { id: 1, name: 'B', total: 1 },
      ],
    }),
  );
  expect(cellTexts(container)).toHaveLength(2);
}

async function scenarioPrototype(
  harness: GridHarness,
  _container: HTMLElement,
): Promise<void> {
  const rows = [
    JSON.parse(
      '{"id":1,"name":"A","total":0,"__proto__":{"polluted":true}}',
    ) as ParityRow,
  ];
  await harness.mount(baseOptions({ rows }));
  expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
}

async function scenarioFocusRestore(
  harness: GridHarness,
  container: HTMLElement,
): Promise<void> {
  await harness.mount(baseOptions());
  container
    .querySelector<HTMLElement>('[role="grid"]')
    ?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
  const before = document.activeElement;
  await harness.update(baseOptions());
  expect(document.activeElement).toBe(before);
  expect((document.activeElement as HTMLElement | null)?.className).toContain(
    'sui-grid__cell',
  );
}

const SCENARIOS: readonly Scenario[] = [
  { name: '1. mount 10 baris merender sel', run: scenarioRender },
  { name: '2. mount data kosong tidak merender baris', run: scenarioEmpty },
  { name: '3. update rows tanpa re-mount', run: scenarioUpdateRows },
  {
    name: '4. update columns mengubah caption header',
    run: scenarioUpdateColumns,
  },
  { name: '5. sort controlled kembali ke props', run: scenarioSortSnapback },
  {
    name: '6. sort controlled diterapkan dari props',
    run: scenarioSortApplied,
  },
  {
    name: '7. selection controlled kembali ke props',
    run: scenarioSelectionSnapback,
  },
  {
    name: '8. selection controlled diterapkan dari props',
    run: scenarioSelectionApplied,
  },
  { name: '9. page callback tanpa optimistic update', run: scenarioPage },
  { name: '10. destroy idempoten membersihkan grid', run: scenarioDestroy },
  { name: '11. filter row mengirim kondisi', run: scenarioFilterRow },
  { name: '12. search panel debounce mengirim query', run: scenarioSearch },
  { name: '13. context menu terbuka', run: scenarioContextMenu },
  { name: '14. RTL diterapkan', run: scenarioRtl },
  { name: '15. header filter membuka panel', run: scenarioHeaderFilter },
  { name: '16. keyboard memfokuskan sel', run: scenarioKeyboard },
  { name: '17. multi-sort dua descriptor', run: scenarioMultiSort },
  { name: '18. live region mengumumkan sort', run: scenarioLiveRegion },
  { name: '19. dataset 1000 baris tervirtualisasi', run: scenarioLarge },
  { name: '20. remount 100x bersih', run: scenarioRemount },
  { name: '21. payload XSS dirender literal', run: scenarioXss },
  { name: '22. kolom tidak dikenal tidak crash', run: scenarioInvalidColumn },
  {
    name: '23. update berurutan berakhir pada data terakhir',
    run: scenarioConcurrent,
  },
  { name: '24. select-all memilih semua baris', run: scenarioSelectAll },
  { name: '25. resize keyboard memperbarui lebar', run: scenarioResize },
  { name: '26. event payload dan urutan', run: scenarioEventOrder },
  { name: '27. uncontrolled sort memperbarui UI', run: scenarioUncontrolled },
  { name: '28. unmount membersihkan listener', run: scenarioUnmountListeners },
  { name: '29. double mount bersih', run: scenarioDoubleMount },
  { name: '30. error state alert', run: scenarioErrorState },
  { name: '31. loading state aria-busy', run: scenarioLoadingState },
  { name: '32. role dan aria grid', run: scenarioRoles },
  { name: '33. destroy saat loading', run: scenarioDestroyLoading },
  { name: '34. reorder callback', run: scenarioReorder },
  { name: '35. locale change memformat ulang', run: scenarioLocale },
  { name: '36. theme change mengubah warna', run: scenarioTheme },
  { name: '37. reload mempertahankan seleksi', run: scenarioReloadSelection },
  { name: '38. duplicate key tidak crash', run: scenarioDuplicateKeys },
  { name: '39. prototype pollution tidak bocor', run: scenarioPrototype },
  { name: '40. focus restoration setelah update', run: scenarioFocusRestore },
];

function registerScenarios(
  label: string,
  createHarness: GridHarnessFactory,
): void {
  describe(`${label} — grid parity (40 skenario)`, () => {
    for (const scenario of SCENARIOS) {
      it(scenario.name, async () => {
        const container = document.createElement('div');
        container.style.width = '600px';
        container.style.height = '300px';
        document.body.append(container);
        const harness = createHarness(container);
        try {
          await scenario.run(harness, container);
        } finally {
          harness.destroy();
          container.remove();
        }
      });
    }
  });
}

export function describeGridParity(
  label: string,
  createHarness: GridHarnessFactory,
): void {
  registerScenarios(label, createHarness);
}
