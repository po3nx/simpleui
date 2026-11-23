# DataGrid 02 — Arsitektur Internal

> **Status:** Draft v1.0 · **Owner:** Grid squad · **Reviewer:** Tech Lead
> **Prasyarat:** [01 — Scope](01-scope.md) · [01 — Arsitektur umum](../../01-arsitektur.md) ·
> [03 — Data Layer](../../03-data-layer.md)

---

## 1. Tujuan teknis

- Satu model state yang deterministik untuk semua fitur.
- Renderer yang dapat merender 100.000 baris pada 60 fps.
- Pemisahan tegas antara model, data, view, dan interaksi.
- Adapter tidak perlu mengetahui internal grid.
- Semua fitur dapat diuji tanpa browser (model) dan dengan browser (DOM).

---

## 2. Peta modul

```text
┌──────────────────────────────────────────────────────────────────┐
│ DataGrid (api/data-grid.ts)                                      │
│  - public options/methods/events                                 │
│  - membuat dan memiliki semua modul di bawah                     │
└───────────────┬──────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────┐
│ GridModel (model/grid-model.ts)                                  │
│  - state machine: idle | loading | ready | error | disposed      │
│  - slices: columns, sorting, filter, paging, selection, focus,   │
│    editing, grouping, viewport                                   │
│  - transaction & selector                                        │
└───────┬───────────────────────┬───────────────────────┬──────────┘
        │                       │                       │
┌───────▼────────┐    ┌─────────▼─────────┐    ┌────────▼─────────┐
│ ColumnModel    │    │ SelectionModel    │    │ FocusModel       │
│ width, order,  │    │ keys, mode,       │    │ row/col, roving  │
│ visibility,    │    │ anchor, preserve  │    │ tabindex         │
│ bands, fixed   │    └───────────────────┘    └──────────────────┘
└───────┬────────┘
        │
┌───────▼─────────────┐    ┌──────────────────────────────────────┐
│ DataController      │───►│ Store / DataSource                   │
│ load, cache, cancel │    │ local / remote / OData / custom      │
│ query pipeline      │    └──────────────────────────────────────┘
└───────┬─────────────┘
        │
┌───────▼─────────────┐
│ ViewModel           │  rows, visible columns, viewport, summaries
└───────┬─────────────┘
        │
┌───────▼─────────────┐    ┌──────────────────────────────────────┐
│ Renderer            │───►│ DOM: header, body, footer, overlays  │
│ Virtualizer         │    └──────────────────────────────────────┘
└───────▲─────────────┘
        │
┌───────┴─────────────┐
│ Interaction         │ keyboard, pointer, resize, reorder, edit
└─────────────────────┘
```

Aturan dependensi:

- `model` tidak mengimpor `view`/`interaction`.
- `view` membaca `ViewModel` dan memanggil callback; tidak memutasi state.
- `interaction` memanggil method model/controller.
- `api` merangkai semuanya dan mengekspos public API.

---

## 3. State

### 3.1 Bentuk state

```ts
export interface DataGridState<T> {
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly error: SimpleUIError | null;
  readonly columns: readonly ColumnState[];
  readonly sorting: readonly SortDescriptor[];
  readonly filter: FilterExpression | null;
  readonly search: string;
  readonly paging: { readonly pageIndex: number; readonly pageSize: number };
  readonly selection: ReadonlySet<Key>;
  readonly focus: { readonly rowKey?: Key; readonly columnId?: string };
  readonly editing: EditState<T> | null;
  readonly grouping: readonly GroupDescriptor[];
  readonly rows: readonly RowState<T>[];
  readonly totalCount: number | null;
  readonly summaries: Readonly<Record<string, number>>;
  readonly viewport: { readonly scrollTop: number; readonly height: number };
  readonly density: 'comfortable' | 'compact' | 'spacious';
  readonly rtl: boolean;
}
```

### 3.2 Aturan state

- Semua slice immutable; update melalui `setState`.
- `transaction()` menunda render dan notifikasi sampai selesai.
- Render dijadwalkan sekali per frame; perubahan beruntun digabung.
- Selector yang mahal (visible rows, column offsets) dimemoize berdasarkan
  referensi slice.
- State tidak menyimpan DOM node, promise, atau `AbortController`; itu di
  service/controller.

### 3.3 State machine

```text
idle ──load()──► loading ──success──► ready
                    │                 │
                    ├──error──► error │
                    │                 ├──reload──► loading
                    │                 └──edit──► editing substate
                    └──cancel──► idle

any ──dispose()──► disposed (final)
```

Aturan:

- `disposed` tidak dapat kembali.
- `editing` adalah substate dari `ready`, bukan state terpisah di top-level.
- `loading` selama reload tidak menghapus data lama; UI menampilkan overlay
  tipis (stale-while-revalidate).

---

## 4. Column model

### 4.1 Normalisasi

Input kolom dapat berupa:

```ts
type ColumnInput<T> =
  | string
  | { dataField: keyof T & string; caption?: string; width?: number; ... }
  | { columns: ColumnInput<T>[]; caption?: string }; // band
```

Normalisasi menghasilkan `ColumnState`:

```ts
interface ColumnState {
  readonly id: string; // stabil, tidak berubah saat reorder
  readonly dataField?: string;
  readonly caption: string;
  readonly dataType:
    'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object';
  readonly width: number | 'auto';
  readonly minWidth: number;
  readonly maxWidth?: number;
  readonly fixed?: 'start' | 'end';
  readonly visible: boolean;
  readonly allowSorting: boolean;
  readonly allowFiltering: boolean;
  readonly allowEditing: boolean;
  readonly allowResizing: boolean;
  readonly allowReordering: boolean;
  readonly format?: FormatSpec;
  readonly cellTemplate?: TemplateRef;
  readonly headerCellTemplate?: TemplateRef;
  readonly bandId?: string;
}
```

Aturan:

- `id` default = `dataField` (atau `col-<index>` untuk kolom tanpa field).
- `id` duplikat → error `SUI-DG-002`.
- `dataField` tidak harus ada di tipe data (boleh computed), tetapi validasi
  runtime hanya memperingatkan.
- Lebar `auto` dihitung dari konten dengan batas min/max; hasil di-cache.
- Band membentuk tree; renderer menghitung span.

### 4.2 Width resolution

1. Fixed width jika ditentukan.
2. `minWidth`/`maxWidth` menjepit.
3. `auto` diukur dari sampel konten (maksimum 50 baris) + header.
4. Sisa lebar container dibagi ke kolom `auto`/star.
5. Total lebar < container → kolom terakhir mengisi sisa (opsional).

Pengukuran dilakukan sekali per perubahan data/kolom, bukan per frame.

### 4.3 Fixed columns

- Dua layer: fixed-start, scrollable, fixed-end.
- Sinkronisasi horizontal scroll via transform.
- Shadow muncul saat ada konten tersembunyi.
- Lebar total fixed tidak boleh > 70% container; jika ya, turunkan menjadi
  scrollable dengan peringatan.

---

## 5. Data flow

### 5.1 Load

```text
init/refresh
  → buildLoadOptions() dari state (sort, filter, paging, group)
  → DataController.load(options, signal)
      → cache hit? return
      → store.load(options)
      → normalize LoadResult
      → simpan cache
  → setState({ rows, totalCount, status: 'ready' })
  → scheduleRender()
```

- Request lama dibatalkan saat parameter berubah.
- Jika `dispose` saat loading, hasil diabaikan.
- Error dinormalisasi dan ditampilkan; retry tersedia.
- Reload karena CRUD menginvalidasi cache terkait.

### 5.2 Sort/filter

```text
user action → model.setSorting()/setFilter()
  → transaction:
      - reset pageIndex ke 0
      - preserve selection (key-based)
      - build load options
  → load (remote) atau pipeline lokal
  → render
```

### 5.3 Selection

```text
pointer/keyboard → SelectionModel.toggle/range/clear
  → setState({ selection })
  → update DOM classes & aria-selected (targeted, tanpa rebuild)
  → emit selectionChanged (setelah state konsisten)
```

---

## 6. Rendering

### 6.1 Struktur DOM

```html
<div class="sui-grid" role="grid" aria-rowcount="100000" aria-colcount="12">
  <div class="sui-grid__header" role="rowgroup">
    <div class="sui-grid__row" role="row">...</div>
  </div>
  <div class="sui-grid__viewport">
    <div class="sui-grid__spacer" style="height: 3.6e6px"></div>
    <div class="sui-grid__rows" style="transform: translateY(...)">
      <div class="sui-grid__row" role="row" aria-rowindex="42">...</div>
    </div>
  </div>
  <div class="sui-grid__footer" role="rowgroup">...</div>
  <div class="sui-grid__live" aria-live="polite" aria-atomic="true"></div>
</div>
```

- Header dan footer sticky.
- Spacer menentukan tinggi total; rows diposisikan dengan transform.
- Hanya baris visible + overscan yang ada di DOM.
- `role="grid"` + `aria-rowcount`/`aria-colcount` absolut.

### 6.2 Row recycling

```ts
class RowPool {
  private pool: RowNode[] = [];

  acquire(): RowNode {
    return this.pool.pop() ?? this.create();
  }

  release(node: RowNode): void {
    node.reset();
    this.pool.push(node);
  }
}
```

Aturan:

- Node baris tidak dihapus/dibuat per scroll; diambil dari pool.
- Konten sel di-update hanya jika `rowKey` berubah.
- Template handle di-dispose saat baris didaur ulang.
- Selection/focus di-update via class/atribut, bukan render ulang.

### 6.3 Virtualizer

```ts
function visibleRange(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan: number,
  count: number,
) {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(
    count,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan,
  );
  return { start, end };
}
```

- Tinggi total = `count * rowHeight` (fixed) atau prefix sum (variable).
- Posisi baris = `index * rowHeight` (fixed) atau prefix sum.
- Variable height: ukur saat render, simpan di cache, invalidasi saat konten
  berubah; gunakan estimasi awal agar scroll tidak melompat.
- Column virtualization: prefix sum lebar kolom + binary search.
- Sticky columns dirender terpisah dan disinkronkan.

### 6.4 Scheduling

- `requestAnimationFrame` untuk render.
- Scroll handler hanya memperbarui `scrollTop` dan menjadwalkan render; tidak
  melakukan layout read di handler.
- Gunakan `ResizeObserver` untuk perubahan ukuran container.
- Batalkan frame saat dispose.

---

## 7. Selection model

```ts
interface SelectionModel {
  readonly mode: 'none' | 'single' | 'multiple';
  isSelected(key: Key): boolean;
  toggle(key: Key, event?: SelectionEvent): void;
  selectRange(from: Key, to: Key): void;
  selectAll(scope: 'page' | 'all'): void;
  clear(): void;
  retain(keys: ReadonlySet<Key>): void;
}
```

Aturan:

- Berbasis key, bukan indeks.
- Anchor untuk range disimpan di model, bukan DOM.
- `selectAll('all')` hanya jika `store.capabilities` mendukung; jika tidak,
  fallback ke halaman dengan peringatan.
- Saat reload, key yang tidak ada lagi dibuang dan event dipancarkan.
- Selection tidak memicu reload data.

---

## 8. Editing

### 8.1 Edit state

```ts
interface EditState<T> {
  readonly mode: 'row' | 'cell' | 'batch' | 'popup';
  readonly rowKey: Key;
  readonly columnId?: string;
  readonly original: Readonly<T>;
  readonly draft: Partial<T>;
  readonly errors: Readonly<Record<string, string>>;
  readonly saving: boolean;
}
```

### 8.2 Alur

```text
startEdit(rowKey, columnId?)
  → validasi allowEditing
  → buat draft
  → render editor (template/editor bawaan)
  → focus ke editor

commit()
  → validasi sinkron
  → validasi async (dengan signal)
  → onSaving (cancelable)
  → store.update/insert
  → sukses: update row + cache; emit rowUpdated/saved
  → gagal: tetap di edit; tampilkan error; emit saveFailed

cancel()
  → buang draft; restore fokus; emit editingCanceled
```

Aturan:

- Editor memiliki `dispose` dan tidak boleh leak.
- Validasi async dibatalkan saat edit dibatalkan.
- Perubahan batch disimpan di `Map<Key, Partial<T>>`.
- Konflik 409 menampilkan dialog/opsi reload; tidak menimpa diam-diam.
- Fokus kembali ke sel setelah commit/cancel.

---

## 9. Grouping

- Group descriptor menghasilkan tree `GroupRow` + leaf rows.
- Group row memiliki `key` sintetis (`group:<path>`) yang tidak bertabrakan
  dengan key data.
- Expand state disimpan di `Set<string>`; persist opsional.
- Group summary dihitung dari leaf yang lolos filter.
- Remote grouping: server mengirim struktur group; core menormalisasi.
- Group row dirender dengan `role="row"` dan `aria-expanded`; fokus keyboard
  dapat berpindah ke group row.

---

## 10. Events

| Event                    | Kapan                  | Payload                               | Cancelable |
| ------------------------ | ---------------------- | ------------------------------------- | ---------- |
| `contentReady`           | Render pertama selesai | `{ element }`                         | tidak      |
| `dataLoading`            | Sebelum load           | `{ loadOptions }`                     | tidak      |
| `dataLoaded`             | Setelah load           | `{ data, totalCount }`                | tidak      |
| `dataError`              | Load gagal             | `{ error }`                           | tidak      |
| `optionChanged`          | Opsi berubah           | `{ name, value, previousValue }`      | tidak      |
| `sortingChanged`         | Sorting berubah        | `{ sortBy }`                          | tidak      |
| `filterChanged`          | Filter berubah         | `{ filterValue }`                     | tidak      |
| `pageChanged`            | Halaman berubah        | `{ pageIndex, pageSize }`             | tidak      |
| `selectionChanged`       | Selection berubah      | `{ selectedRowKeys, added, removed }` | tidak      |
| `focusedCellChanged`     | Fokus pindah           | `{ rowKey, columnId }`                | tidak      |
| `rowClick` / `cellClick` | Klik                   | `{ rowKey, columnId, data, event }`   | ya         |
| `cellDblClick`           | Double click           | sama                                  | ya         |
| `contextMenu`            | Klik kanan             | `{ rowKey, columnId, event }`         | ya         |
| `editingStart`           | Mulai edit             | `{ rowKey, columnId }`                | ya         |
| `editingCanceled`        | Batal edit             | `{ rowKey }`                          | tidak      |
| `rowUpdating`            | Sebelum simpan         | `{ key, values }`                     | ya         |
| `rowUpdated`             | Setelah simpan         | `{ key, data }`                       | tidak      |
| `saving`                 | Sebelum request        | `{ changes }`                         | ya         |
| `saved`                  | Setelah sukses         | `{ changes }`                         | tidak      |
| `saveFailed`             | Gagal                  | `{ error, changes }`                  | tidak      |
| `exporting`              | Sebelum export         | `{ format }`                          | ya         |
| `exported`               | Setelah export         | `{ format, fileName }`                | tidak      |
| `stateChanged`           | State persist berubah  | `{ state }`                           | tidak      |
| `disposing`              | Sebelum dispose        | `{ }`                                 | tidak      |

Urutan event adalah kontrak; diuji di parity suite.

---

## 11. Lifecycle dan disposal

```ts
class DataGrid<T> {
  constructor(element: HTMLElement, options: DataGridOptions<T>) {
    this.element = element;
    this.services = createServices(options);
    this.model = new GridModel(normalizeOptions(options), this.services);
    this.dataController = new DataController(this.model, this.services);
    this.renderer = new GridRenderer(this.element, this.model, this.services);
    this.interaction = new InteractionManager(this.element, this.model);
    this.model.mount();
    this.dataController.loadInitial();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.interaction.dispose();
    this.dataController.dispose();
    this.renderer.dispose();
    this.model.dispose();
    this.services.dispose();
    this.element.replaceChildren();
  }
}
```

- Semua modul menerima `DisposableBag`.
- `dispose` idempoten.
- Event `disposing` dipancarkan sebelum cleanup.
- Setelah dispose, method publik menjadi no-op (production) atau error
  (development).

---

## 12. Performance

| Teknik                | Detail                            |
| --------------------- | --------------------------------- |
| Row recycling         | Pool node, update minimal         |
| Column virtualization | Prefix sum + binary search        |
| Batching              | Satu render per frame             |
| Targeted update       | Selection/focus via class         |
| Passive scroll        | `{ passive: true }`               |
| Memoized selectors    | Berdasarkan referensi slice       |
| Avoid layout thrash   | Batch read/write                  |
| Worker (opsional)     | Filter/sort/group besar di worker |
| Cancel                | Abort request lama                |

Benchmark wajib:

- mount 10k/100k;
- scroll 5 detik;
- sort/filter/group 100k;
- selection 1.000;
- edit commit;
- 100× mount/unmount.

---

## 13. SSR

- Modul tidak mengakses `window`/`document` saat import.
- `DataGrid` constructor hanya dipanggil di client.
- Adapter merender host kosong di server.
- `renderToString` test untuk setiap adapter.
- Tidak ada `useLayoutEffect` di React.

---

## 14. Error handling

| Skenario          | Perilaku                                             |
| ----------------- | ---------------------------------------------------- |
| Store error       | State error + retry; data lama tetap tampil jika ada |
| Invalid option    | Error development; fallback default di production    |
| Duplicate key     | Error `SUI-DG-002`; baris duplikat ditandai          |
| Template error    | Sel menampilkan fallback; error dilaporkan           |
| Edit conflict     | Dialog konflik; tidak menimpa                        |
| Dispose saat load | Hasil diabaikan; tidak ada state update              |

---

## 15. Struktur file

```text
src/
├─ api/
│  ├─ data-grid.ts
│  ├─ options.ts
│  ├─ events.ts
│  └─ types.ts
├─ model/
│  ├─ grid-model.ts
│  ├─ column-model.ts
│  ├─ selection-model.ts
│  ├─ focus-model.ts
│  ├─ edit-model.ts
│  └─ state.ts
├─ data/
│  ├─ data-controller.ts
│  ├─ load-options.ts
│  ├─ query-pipeline.ts
│  ├─ summary-engine.ts
│  └─ cache.ts
├─ view/
│  ├─ grid-renderer.ts
│  ├─ header-renderer.ts
│  ├─ row-renderer.ts
│  ├─ cell-renderer.ts
│  ├─ virtualizer.ts
│  ├─ row-pool.ts
│  └─ styles/
├─ interaction/
│  ├─ keyboard-controller.ts
│  ├─ pointer-controller.ts
│  ├─ resize-controller.ts
│  ├─ reorder-controller.ts
│  ├─ edit-controller.ts
│  └─ context-menu.ts
├─ export/
│  ├─ csv-exporter.ts
│  └─ excel-exporter.ts
├─ a11y/
│  ├─ grid-aria.ts
│  └─ announcer.ts
└─ index.ts
```

---

## 16. Testing hooks

- `GridModel` dapat diuji tanpa DOM.
- Renderer menerima `DomAdapter` yang dapat di-mock.
- `DataController` menerima `Store` dan `Clock`.
- Benchmark memakai data generator seeded.
- Test browser memakai `data-testid` yang stabil dan role ARIA.

---

_Untuk API publik, lihat [03-api.md](03-api.md)._
