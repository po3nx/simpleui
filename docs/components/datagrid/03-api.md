# DataGrid 03 — Public API Design

> **Status:** Draft v1.0 · **Owner:** Grid squad · **Reviewer:** Tech Lead
> **Prasyarat:** [01 — Scope](01-scope.md) · [02 — Arsitektur](02-arsitektur.md) ·
> [Adapter](../../02-adapter-cross-framework.md)
> **Aturan:** semua nama opsi/event identik di JavaScript, TypeScript, React,
> Vue, dan Angular. Adapter hanya mengubah konvensi penulisan.

---

## 1. Prinsip API

1. **Sedikit tetapi cukup** — setiap opsi harus punya use case nyata.
2. **Aman secara default** — fitur berisiko opt-in dan diberi nama eksplisit.
3. **Type-safe** — generic `DataGrid<T>` mengalir ke columns, event, template.
4. **Idempoten** — memanggil method berulang tidak merusak state.
5. **Dapat dibatalkan** — operasi async menerima `AbortSignal` internal.
6. **Konsisten** — penamaan `camelCase`, event `pastTense`/`Changed`.
7. **Tidak bocor** — tidak mengekspos objek internal yang bisa dimutasi.

---

## 2. Tipe utama

```ts
export class DataGrid<T = unknown> {
  constructor(element: HTMLElement, options: DataGridOptions<T>);
  readonly isDisposed: boolean;
  // ...
}

export interface VisibleRow<T> {
  readonly key: Key;
  readonly data: T;
  readonly rowIndex: number;
  readonly isGroup?: boolean;
}
```

```ts
export interface DataGridOptions<T> {
  dataSource: DataSourceInput<T>;
  keyExpr?: KeyExpr<T>;
  columns: readonly ColumnOptions<T>[];

  sorting?: SortingOptions;
  filtering?: FilteringOptions;
  paging?: PagingOptions;
  scrolling?: ScrollingOptions;
  selection?: SelectionOptions;
  editing?: EditingOptions;
  grouping?: GroupingOptions;
  groupPanel?: GroupPanelOptions;
  summary?: SummaryOptions<T>;
  masterDetail?: MasterDetailOptions<T>;
  columnChooser?: ColumnChooserOptions;
  columnFixing?: ColumnFixingOptions;
  stateStoring?: StateStoringOptions;
  export?: ExportOptions;

  width?: number | string;
  height?: number | string;
  rtlEnabled?: boolean;
  hoverStateEnabled?: boolean;
  showBorders?: boolean;
  showRowLines?: boolean;
  showColumnLines?: boolean;
  rowAlternationEnabled?: boolean;
  wordWrapEnabled?: boolean;
  focusedRowEnabled?: boolean;
  allowColumnResizing?: boolean;
  allowColumnReordering?: boolean;
  noDataText?: string;
  locale?: string;
  messages?: Readonly<Record<string, string>>;

  onContentReady?: (e: ContentReadyEvent) => void;
  onDataLoading?: (e: DataLoadingEvent) => void;
  onDataLoaded?: (e: DataLoadedEvent<T>) => void;
  onDataError?: (e: DataErrorEvent) => void;
  onOptionChanged?: (e: OptionChangedEvent) => void;
  onSortingChanged?: (e: SortingChangedEvent) => void;
  onFilterChanged?: (e: FilterChangedEvent) => void;
  onPageChanged?: (e: PageChangedEvent) => void;
  onSelectionChanged?: (e: SelectionChangedEvent) => void;
  onFocusedCellChanged?: (e: FocusedCellChangedEvent) => void;
  onRowClick?: (e: RowClickEvent<T>) => void;
  onCellClick?: (e: CellClickEvent<T>) => void;
  onCellDblClick?: (e: CellClickEvent<T>) => void;
  onContextMenu?: (e: ContextMenuEvent<T>) => void;
  onEditingStart?: (e: EditingStartEvent<T>) => void;
  onEditingCanceled?: (e: EditingCanceledEvent) => void;
  onRowUpdating?: (e: RowUpdatingEvent<T>) => void;
  onRowUpdated?: (e: RowUpdatedEvent<T>) => void;
  onSaving?: (e: SavingEvent<T>) => void;
  onSaved?: (e: SavedEvent<T>) => void;
  onSaveFailed?: (e: SaveFailedEvent) => void;
  onExporting?: (e: ExportingEvent) => void;
  onExported?: (e: ExportedEvent) => void;
  onStateChanged?: (e: StateChangedEvent) => void;
  onDisposing?: (e: DisposingEvent) => void;
}
```

Aturan tipe:

- `T` default `unknown`; consumer disarankan memberi tipe.
- `keyExpr` wajib untuk data remote; untuk data lokal default `'id'` bila ada.
- Semua opsi read-only dari sisi consumer; core menormalisasi ke internal.
- `undefined` berarti default; `null` hanya jika didokumentasikan.

---

## 3. Opsi

### 3.1 Data

| Opsi               | Tipe                                | Default         | Catatan                                         |
| ------------------ | ----------------------------------- | --------------- | ----------------------------------------------- |
| `dataSource`       | `T[] \| Store<T> \| DataSource<T>`  | `[]`            | Array disalin dangkal; store dipakai apa adanya |
| `keyExpr`          | `keyof T \| string[] \| (row)=>Key` | `'id'` bila ada | Wajib unik                                      |
| `cacheEnabled`     | `boolean`                           | `true`          | Cache load remote                               |
| `remoteOperations` | `boolean \| object`                 | `'auto'`        | Pushdown filter/sort/group                      |
| `onDataError`      | callback                            | —               | Error tidak boleh ditelan                       |

### 3.2 Kolom

| Opsi                    | Tipe                                                          | Default       | Catatan                      |
| ----------------------- | ------------------------------------------------------------- | ------------- | ---------------------------- |
| `dataField`             | `string`                                                      | —             | Wajib untuk kolom data       |
| `caption`               | `string`                                                      | dari field    | Teks, bukan HTML             |
| `dataType`              | `'string'\|'number'\|'date'\|'datetime'\|'boolean'\|'object'` | `'string'`    | Menentukan filter/format     |
| `width`                 | `number \| 'auto'`                                            | `'auto'`      | Min 40px                     |
| `minWidth` / `maxWidth` | `number`                                                      | 40 / —        |                              |
| `fixed`                 | `'start'\|'end'`                                              | —             | Butuh `columnFixing.enabled` |
| `visible`               | `boolean`                                                     | `true`        |                              |
| `allowSorting`          | `boolean`                                                     | `true`        |                              |
| `allowFiltering`        | `boolean`                                                     | `true`        |                              |
| `allowEditing`          | `boolean`                                                     | `true`        |                              |
| `allowResizing`         | `boolean`                                                     | `true`        |                              |
| `allowReordering`       | `boolean`                                                     | `true`        |                              |
| `format`                | `FormatSpec`                                                  | sesuai tipe   | Number/date/currency         |
| `cellTemplate`          | `TemplateSpec<T>`                                             | —             | Render function              |
| `headerCellTemplate`    | `TemplateSpec<T>`                                             | —             |                              |
| `editorTemplate`        | `TemplateSpec<T>`                                             | editor bawaan | Mode editing                 |
| `calculateCellValue`    | `(row: T) => unknown`                                         | —             | Computed column              |
| `calculateDisplayValue` | `(row: T) => string`                                          | —             | Untuk lookup                 |
| `columns`               | `ColumnOptions<T>[]`                                          | —             | Band/group                   |

### 3.3 Sorting & filtering

| Opsi                                       | Tipe                           | Default    | Catatan    |
| ------------------------------------------ | ------------------------------ | ---------- | ---------- |
| `sorting.mode`                             | `'none'\|'single'\|'multiple'` | `'single'` |            |
| `sorting.sortBy`                           | `SortDescriptor[]`             | `[]`       | Controlled |
| `sorting.ascendingText` / `descendingText` | `string`                       | i18n       |            |
| `filtering.enabled`                        | `boolean`                      | `true`     |            |
| `filtering.filterRow`                      | `boolean \| object`            | `false`    |            |
| `filtering.headerFilter`                   | `boolean \| object`            | `true`     |            |
| `filtering.searchPanel`                    | `boolean \| object`            | `false`    |            |
| `filtering.filterValue`                    | `FilterExpression`             | `null`     | Controlled |
| `filtering.applyFilter`                    | `'auto'\|'onClick'`            | `'auto'`   |            |
| `searchPanel.placeholder`                  | `string`                       | i18n       |            |
| `searchPanel.searchVisibleColumnsOnly`     | `boolean`                      | `false`    |            |

### 3.4 Paging & scrolling

| Opsi                            | Tipe                                | Default          | Catatan  |
| ------------------------------- | ----------------------------------- | ---------------- | -------- |
| `paging.enabled`                | `boolean`                           | `true`           |          |
| `paging.pageSize`               | `number`                            | `20`             | 1–10.000 |
| `paging.pageIndex`              | `number`                            | `0`              |          |
| `paging.pageSizes`              | `number[]`                          | `[10,20,50,100]` |          |
| `scrolling.mode`                | `'standard'\|'virtual'\|'infinite'` | `'virtual'`      |          |
| `scrolling.rowHeight`           | `number`                            | `40`             |          |
| `scrolling.overscan`            | `number`                            | `5`              |          |
| `scrolling.columnRenderingMode` | `'standard'\|'virtual'`             | `'virtual'`      |          |

### 3.5 Selection

| Opsi                        | Tipe                           | Default  | Catatan                 |
| --------------------------- | ------------------------------ | -------- | ----------------------- |
| `selection.mode`            | `'none'\|'single'\|'multiple'` | `'none'` |                         |
| `selection.showCheckBoxes`  | `boolean`                      | `false`  |                         |
| `selection.selectAllMode`   | `'page'\|'allPages'`           | `'page'` | `allPages` butuh server |
| `selection.selectedRowKeys` | `Key[]`                        | `[]`     | Controlled              |
| `selection.allowSelectAll`  | `boolean`                      | `true`   |                         |

### 3.6 Editing

| Opsi                            | Tipe                              | Default | Catatan            |
| ------------------------------- | --------------------------------- | ------- | ------------------ |
| `editing.mode`                  | `'row'\|'cell'\|'batch'\|'popup'` | `'row'` |                    |
| `editing.allowUpdating`         | `boolean`                         | `false` |                    |
| `editing.allowAdding`           | `boolean`                         | `false` |                    |
| `editing.allowDeleting`         | `boolean`                         | `false` |                    |
| `editing.confirmDelete`         | `boolean`                         | `true`  |                    |
| `editing.commitOnBlur`          | `boolean`                         | `false` |                    |
| `editing.selectTextOnEditStart` | `boolean`                         | `true`  |                    |
| `editing.useForm`               | `boolean`                         | `false` | Popup/form         |
| `editing.popup`                 | `object`                          | —       | Width/height/title |

### 3.7 Grouping & summary

| Opsi                             | Tipe                        | Default         | Catatan      |
| -------------------------------- | --------------------------- | --------------- | ------------ |
| `grouping.autoExpandAll`         | `boolean`                   | `true`          |              |
| `grouping.expandMode`            | `'buttonClick'\|'rowClick'` | `'buttonClick'` |              |
| `groupPanel.visible`             | `boolean`                   | `false`         |              |
| `groupPanel.emptyPanelText`      | `string`                    | i18n            |              |
| `summary.totalItems`             | `SummaryItem[]`             | `[]`            |              |
| `summary.groupItems`             | `SummaryItem[]`             | `[]`            |              |
| `summary.calculateCustomSummary` | `(options) => void`         | —               | Fungsi murni |

### 3.8 Tampilan & state

| Opsi                         | Tipe                                     | Default        | Catatan |
| ---------------------------- | ---------------------------------------- | -------------- | ------- |
| `width` / `height`           | `number \| string`                       | `'100%'`       |         |
| `rtlEnabled`                 | `boolean`                                | `false`        |         |
| `hoverStateEnabled`          | `boolean`                                | `true`         |         |
| `showBorders`                | `boolean`                                | `true`         |         |
| `showRowLines`               | `boolean`                                | `false`        |         |
| `showColumnLines`            | `boolean`                                | `true`         |         |
| `rowAlternationEnabled`      | `boolean`                                | `false`        |         |
| `wordWrapEnabled`            | `boolean`                                | `false`        |         |
| `focusedRowEnabled`          | `boolean`                                | `false`        |         |
| `allowColumnResizing`        | `boolean`                                | `true`         |         |
| `allowColumnReordering`      | `boolean`                                | `true`         |         |
| `noDataText`                 | `string`                                 | i18n           |         |
| `stateStoring.enabled`       | `boolean`                                | `false`        |         |
| `stateStoring.type`          | `'memory'\|'session'\|'local'\|'custom'` | `'memory'`     |         |
| `stateStoring.storageKey`    | `string`                                 | `sui-datagrid` |         |
| `stateStoring.savingTimeout` | `number`                                 | `500`          | ms      |

### 3.9 Export

| Opsi                          | Tipe                | Default   | Catatan                           |
| ----------------------------- | ------------------- | --------- | --------------------------------- |
| `export.enabled`              | `boolean`           | `false`   |                                   |
| `export.formats`              | `('csv'\|'xlsx')[]` | `['csv']` |                                   |
| `export.fileName`             | `string`            | `export`  | Disanitasi                        |
| `export.exportSelectedRows`   | `boolean`           | `false`   |                                   |
| `export.exportHiddenColumns`  | `boolean`           | `false`   |                                   |
| `export.csv.delimiter`        | `string`            | `','`     |                                   |
| `export.csv.encoding`         | `string`            | `'utf-8'` |                                   |
| `export.csv.sanitizeFormulas` | `boolean`           | `true`    | **Jangan dimatikan tanpa alasan** |

---

## 4. Method

| Method                      | Signature                                              | Catatan                      |
| --------------------------- | ------------------------------------------------------ | ---------------------------- |
| `option`                    | `option(name)`, `option(name, value)`, `option(patch)` | Get/set; batch via transaksi |
| `beginUpdate`               | `(): void`                                             | Nested-safe                  |
| `endUpdate`                 | `(): void`                                             | Render sekali                |
| `repaint`                   | `(): void`                                             | Render ulang tanpa reload    |
| `refresh`                   | `(): Promise<void>`                                    | Reload data                  |
| `dispose`                   | `(): void`                                             | Idempoten                    |
| `getDataSource`             | `(): DataSource<T>`                                    | Objek publik                 |
| `getSelectedRowKeys`        | `(): Key[]`                                            | Salinan                      |
| `selectRows`                | `(keys: Key[], preserve?: boolean): void`              |                              |
| `deselectRows`              | `(keys: Key[]): void`                                  |                              |
| `clearSelection`            | `(): void`                                             |                              |
| `selectAll`                 | `(scope?: 'page'\|'all'): void`                        |                              |
| `getVisibleRows`            | `(): readonly VisibleRow<T>[]`                         | Snapshot                     |
| `getRowByKey`               | `(key: Key): T \| undefined`                           |                              |
| `getKeyByRowIndex`          | `(index: number): Key \| undefined`                    |                              |
| `focusCell`                 | `(rowKey: Key, columnId: string): void`                |                              |
| `getFocusedCell`            | `(): { rowKey: Key; columnId: string } \| null`        |                              |
| `editRow`                   | `(key: Key): void`                                     |                              |
| `editCell`                  | `(key: Key, columnId: string): void`                   |                              |
| `saveEdit`                  | `(): Promise<void>`                                    |                              |
| `cancelEdit`                | `(): void`                                             |                              |
| `addRow`                    | `(values?: Partial<T>): Promise<void>`                 |                              |
| `deleteRow`                 | `(key: Key): Promise<void>`                            |                              |
| `expandRow` / `collapseRow` | `(key: Key): void`                                     |                              |
| `expandAll` / `collapseAll` | `(groupPath?: string): void`                           |                              |
| `columnOption`              | `(id: string, name: string, value?: unknown)`          |                              |
| `clearFilter`               | `(): void`                                             |                              |
| `clearSorting`              | `(): void`                                             |                              |
| `getState`                  | `(): DataGridStateSnapshot`                            | Serializable                 |
| `state`                     | `(state?: DataGridStateSnapshot)`                      | Get/set                      |
| `resetState`                | `(): void`                                             |                              |
| `exportToCsv`               | `(options?: CsvExportOptions): Promise<void>`          |                              |
| `exportToExcel`             | `(options?: ExcelExportOptions): Promise<void>`        |                              |
| `on` / `off` / `once`       | `(event, handler)`                                     | Untuk vanilla                |

Aturan:

- Method yang mengubah state memicu render yang dijadwalkan, bukan sinkron.
- `refresh()` mengembalikan promise yang resolve setelah data dimuat.
- `getVisibleRows()` mengembalikan snapshot read-only, bukan referensi internal.
- Semua method setelah `dispose()` menjadi no-op (production) atau error
  `SUI-DG-010` (development).

---

## 5. Event

| Event                    | Payload                               | Cancelable |
| ------------------------ | ------------------------------------- | ---------- |
| `contentReady`           | `{ element }`                         | tidak      |
| `dataLoading`            | `{ loadOptions }`                     | tidak      |
| `dataLoaded`             | `{ data, totalCount }`                | tidak      |
| `dataError`              | `{ error }`                           | tidak      |
| `optionChanged`          | `{ name, value, previousValue }`      | tidak      |
| `sortingChanged`         | `{ sortBy }`                          | tidak      |
| `filterChanged`          | `{ filterValue }`                     | tidak      |
| `pageChanged`            | `{ pageIndex, pageSize }`             | tidak      |
| `selectionChanged`       | `{ selectedRowKeys, added, removed }` | tidak      |
| `focusedCellChanged`     | `{ rowKey, columnId }`                | tidak      |
| `rowClick` / `cellClick` | `{ rowKey, columnId, data, event }`   | ya         |
| `cellDblClick`           | sama                                  | ya         |
| `contextMenu`            | `{ rowKey, columnId, event }`         | ya         |
| `editingStart`           | `{ rowKey, columnId }`                | ya         |
| `editingCanceled`        | `{ rowKey }`                          | tidak      |
| `rowUpdating`            | `{ key, values }`                     | ya         |
| `rowUpdated`             | `{ key, data }`                       | tidak      |
| `saving`                 | `{ changes }`                         | ya         |
| `saved`                  | `{ changes }`                         | tidak      |
| `saveFailed`             | `{ error, changes }`                  | tidak      |
| `exporting`              | `{ format }`                          | ya         |
| `exported`               | `{ format, fileName }`                | tidak      |
| `stateChanged`           | `{ state }`                           | tidak      |
| `disposing`              | `{}`                                  | tidak      |

Aturan payload:

- Read-only; `cancel` hanya pada event cancelable.
- `originalEvent` tidak boleh disimpan setelah handler selesai.
- Event dipancarkan setelah state konsisten.
- Tidak ada event setelah `dispose`.

---

## 6. Template

| Template             | Context                                        | Framework                                                                              |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `cellTemplate`       | `{ data, value, column, rowIndex, component }` | React node/render prop; Vue slot `#cell`; Angular `*suiCellTemplate`; vanilla function |
| `headerCellTemplate` | `{ column, component }`                        | sama                                                                                   |
| `rowTemplate`        | `{ data, rowIndex, columns }`                  | sama                                                                                   |
| `detailTemplate`     | `{ data, rowIndex }`                           | sama                                                                                   |
| `editorTemplate`     | `{ data, column, value, setValue, error }`     | sama                                                                                   |
| `groupRowTemplate`   | `{ group, value, count }`                      | sama                                                                                   |
| `noDataTemplate`     | `{}`                                           | sama                                                                                   |

Aturan:

- Template **DILARANG** mengembalikan HTML string mentah.
- Template wajib memiliki `dispose` (ditangani bridge).
- Error template diisolasi; satu sel gagal tidak merusak grid.
- Context tidak boleh memuat objek internal yang dapat dimutasi.

---

## 7. Contoh per framework

### 7.1 JavaScript

```js
const grid = new SimpleUI.DataGrid(document.getElementById('grid'), {
  dataSource: '/api/orders',
  keyExpr: 'id',
  columns: [
    { dataField: 'number', caption: 'No.', width: 120 },
    { dataField: 'customer', caption: 'Customer' },
    {
      dataField: 'total',
      caption: 'Total',
      dataType: 'number',
      format: 'currency',
    },
  ],
  sorting: { mode: 'multiple' },
  selection: { mode: 'multiple', showCheckBoxes: true },
  paging: { pageSize: 20 },
  onSelectionChanged(e) {
    console.log(e.selectedRowKeys);
  },
});

grid.selectRows([1, 2]);
```

### 7.2 TypeScript

```ts
interface Order {
  id: number;
  number: string;
  customer: string;
  total: number;
}

const grid = new DataGrid<Order>(element, {
  dataSource: orders,
  keyExpr: 'id',
  columns: [
    { dataField: 'number', caption: 'No.' },
    { dataField: 'total', dataType: 'number', format: 'currency' },
  ],
  onCellClick(e) {
    const row: Order = e.data; // typed
  },
});
```

### 7.3 React

```tsx
<DataGrid<Order>
  dataSource={orders}
  keyExpr="id"
  columns={columns}
  selection={{ mode: 'multiple', showCheckBoxes: true }}
  selectedRowKeys={selected}
  onSelectionChanged={(e) => setSelected(e.selectedRowKeys)}
/>
```

### 7.4 Vue

```vue
<DataGrid
  :data-source="orders"
  key-expr="id"
  :columns="columns"
  :selection="{ mode: 'multiple', showCheckBoxes: true }"
  v-model:selected-row-keys="selected"
/>
```

### 7.5 Angular

```html
<sui-data-grid
  [dataSource]="orders"
  keyExpr="id"
  [columns]="columns"
  [selection]="{ mode: 'multiple', showCheckBoxes: true }"
  [(selectedRowKeys)]="selected"
  (selectionChanged)="onSelection($event)"
/>
```

---

## 8. Keyboard map

| Tombol                    | Aksi                         |
| ------------------------- | ---------------------------- |
| `Tab` / `Shift+Tab`       | Masuk/keluar grid            |
| `ArrowUp/Down/Left/Right` | Pindah sel                   |
| `Home` / `End`            | Awal/akhir baris             |
| `Ctrl+Home` / `Ctrl+End`  | Awal/akhir grid              |
| `PageUp` / `PageDown`     | Halaman atas/bawah           |
| `Space`                   | Toggle selection baris       |
| `Shift+Space`             | Pilih range baris            |
| `Enter`                   | Edit / commit                |
| `F2`                      | Mulai edit                   |
| `Esc`                     | Batal edit / tutup overlay   |
| `Ctrl+A`                  | Pilih semua (jika diizinkan) |
| `Ctrl+C`                  | Copy sel/baris               |
| `Alt+ArrowDown`           | Buka header filter           |
| `Shift+Click` header      | Multi-sort                   |
| `Shift+Click` baris       | Range selection              |

Aturan:

- Fokus DOM berada pada sel aktif (roving `tabindex="0"`).
- `aria-activedescendant` hanya jika fokus tetap di container; pilih satu
  strategi dan konsisten.
- Sel yang dapat diedit memiliki `aria-readonly="false"`.
- Header yang dapat disortir memiliki `aria-sort`.

---

## 9. Error codes

| Code         | Arti                      | Perilaku                             |
| ------------ | ------------------------- | ------------------------------------ |
| `SUI-DG-001` | Opsi tidak valid          | Dev: throw; prod: fallback + warning |
| `SUI-DG-002` | Duplicate column id / key | Error state                          |
| `SUI-DG-003` | `keyExpr` tidak ditemukan | Error state                          |
| `SUI-DG-004` | Load data gagal           | State error + retry                  |
| `SUI-DG-005` | Edit conflict             | Dialog konflik                       |
| `SUI-DG-006` | Template error            | Fallback per sel                     |
| `SUI-DG-007` | Export gagal              | Toast/error                          |
| `SUI-DG-008` | State tidak valid         | Abaikan + warning                    |
| `SUI-DG-009` | Operasi tidak didukung    | Error terklasifikasi                 |
| `SUI-DG-010` | Instance sudah disposed   | Dev: throw; prod: no-op              |

---

## 10. Controlled vs uncontrolled

Suatu state dianggap **controlled** jika callback perubahannya disediakan;
tanpa callback, core menyimpan state internal.

| State     | Uncontrolled                     | Controlled                                         |
| --------- | -------------------------------- | -------------------------------------------------- |
| Sorting   | `sorting.sortBy` awal            | `sorting.sortBy` + `onSortingChanged`              |
| Filter    | `filtering.filterValue` awal     | `filtering.filterValue` + `onFilterChanged`        |
| Selection | `selection.selectedRowKeys` awal | `selection.selectedRowKeys` + `onSelectionChanged` |
| Paging    | `paging.pageIndex` awal          | `paging.pageIndex` + `onPageChanged`               |
| Editing   | internal (tidak dikontrol)       | —                                                  |

Aturan:

- Untuk React/Vue/Angular, state yang dikontrol harus disertai callback.
- Jangan mencampur controlled dan uncontrolled pada properti yang sama.
- Jika callback tidak memperbarui nilai, UI menampilkan nilai lama
  (bukan optimistically berubah).
- Core tetap menyimpan state internal untuk hal yang tidak dikontrol.

### 10.1 Adapter sugar

Adapter boleh menyediakan alias top-level untuk state yang sering dipakai,
tanpa mengubah opsi core:

| Opsi core                   | React/Angular prop | Vue                         |
| --------------------------- | ------------------ | --------------------------- |
| `selection.selectedRowKeys` | `selectedRowKeys`  | `v-model:selected-row-keys` |
| `sorting.sortBy`            | `sortBy`           | `v-model:sort-by`           |
| `filtering.filterValue`     | `filterValue`      | `v-model:filter-value`      |
| `paging.pageIndex`          | `pageIndex`        | `v-model:page-index`        |

Aturan:

- Sugar **hanya** alias; mapping dilakukan adapter dan diuji di parity suite.
- Nama opsi core tetap menjadi sumber kebenaran.
- Jika alias dan opsi core diberikan bersamaan, alias menang dengan peringatan
  di development.
- Dokumentasi setiap adapter mencantumkan alias yang didukung.

---

## 11. Aksesibilitas kontrak

- `role="grid"`, `aria-rowcount`, `aria-colcount`.
- Baris: `role="row"`, `aria-rowindex` absolut, `aria-selected` bila selection.
- Sel: `role="gridcell"`, `aria-colindex` absolut, `aria-readonly` bila perlu.
- Header: `role="columnheader"`, `aria-sort` (`ascending`/`descending`/`none`).
- Live region: perubahan sort/filter/page/selection.
- Fokus terlihat, tidak ada trap, `Esc` menutup overlay.
- Semua kontrol punya nama aksesibel.

---

## 12. API review checklist

- [ ] Nama konsisten dengan konvensi.
- [ ] Default aman.
- [ ] Tipe generic benar dan tidak ada `any`.
- [ ] Setiap opsi punya TSDoc + contoh.
- [ ] Event payload read-only dan terdokumentasi.
- [ ] Method idempoten / terdokumentasi jika tidak.
- [ ] Tidak ada kebocoran objek internal.
- [ ] Error code Stabil.
- [ ] Ada test untuk perilaku default dan edge case.
- [ ] Ada changeset + `.api.md`.
- [ ] Tidak ada breaking change tanpa major.

---

_Untuk ancaman keamanan spesifik, lihat [04-security.md](04-security.md)._
