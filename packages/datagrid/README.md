# @simpleui/datagrid

DataGrid enterprise SimpleUI. Status: **DG-1 (model & data)** — kontrak API dan
normalisasi opsi sudah tersedia; renderer menyusul DG-2.

```ts
import { normalizeDataGridOptions } from '@simpleui/datagrid';

const options = normalizeDataGridOptions({
  dataSource: rows,
  keyExpr: 'id',
  columns: [{ dataField: 'name', caption: 'Nama' }],
  paging: { enabled: true, pageSize: 20 },
});
```

- `normalizeDataGridOptions` memberi default aman, memvalidasi tipe/rentang, dan
  menolak opsi tak dikenal (`SUI-DG-001`).
- Mode dev melempar error; mode produksi memakai fallback dan melaporkan lewat
  `onValidationError`.
- `normalizeColumnModel` membentuk pohon kolom dengan **id stabil** (default
  `dataField`, atau `col-<index>`), band, visibility, dan resolusi lebar
  (`auto`, min/max). Id duplikat menghasilkan `SUI-DG-002`.
- Helper: `flattenColumns`, `getVisibleColumns`, `findColumnById`,
  `countHeaderRows`.
- `createGridStateStore` menyimpan sorting/filter/page/selection/kolom/group
  secara immutable: filter/sort/pageSize mereset halaman, transaksi
  mengirim satu notifikasi, transisi status data dijaga (`SUI-DG-009`),
  snapshot versioned dengan `restore` tervalidasi (`SUI-DG-008`).
- `createDataController` menjembatani state dan Store core: memuat sesuai
  sort/filter/page, membatalkan permintaan lama, memetakan error store menjadi
  `SUI-DG-004`, dan memancarkan `onDataLoading`/`onDataLoaded`/`onDataError`.
- Filter pipeline: operator per tipe kolom (`operatorsForType`), filter row
  (`buildFilterRow`) dan pencarian (`buildSearchFilter`) menghasilkan AST
  tertutup; batas kedalaman/node/`in` ditegakkan dan error menjadi
  `SUI-DG-001`. `applyGridFilter` memakai pipeline core (tanpa duplikasi).
- Sort model: `toggleSort` (siklus asc → desc → none; `multi` untuk Shift+klik),
  `sortIndexFor`/`sortDirectionFor` untuk indikator, `applyGridSort` memakai
  pipeline core (collator, null selalu di akhir).
- Paging & virtual scroll: `pageCountFor`, `createPageInfo`, `pageRange`,
  `clampPageIndex`, dan `createVirtualScroll` (di atas `Virtualizer` core:
  rentang O(1), offset baris/halaman, total tinggi).
- Key identity: `createKeyResolver` (field tunggal, composite, fungsi),
  `encodeKey`/`keyToDomId` stabil dan membedakan `1` vs `"1"`,
  `buildKeyIndex`/`assertUniqueKeys` menolak key duplikat (`SUI-DG-002`) atau
  hilang (`SUI-DG-003`).
- Selection model: `createSelectionModel` (mode none/single/multiple, range
  inklusif, select-all halaman/semua, rekonsiliasi key setelah reload, event
  `selectionChanged` berisi added/removed).
- Focus model: `createFocusModel` — sel aktif, navigasi panah dengan clamp,
  Home/End per baris/grid, roving tabindex, `cellDomId` untuk
  `aria-activedescendant`, dan pemulihan fokus setelah reload.
- Error: `toGridError`/`classifyError` memetakan `DataError`, 409, dan error
  asing ke kode `SUI-DG-*` dengan pesan aman; `describeGridError` memberi
  `retryable`; DataController punya `getError`/`canRetry`/`retry` (abort tidak
  dihitung sebagai error).
- Grouping: `groupRows` membentuk pohon multi-field dengan `groupKey` stabil
  dan batas `maxGroupCount` per level (`SUI-DG-009`); `flattenGroups`
  menghasilkan header grup + baris sesuai state ekspansi.
- Summary: `computeSummary` (total), `computeGroupSummary` (per grup termasuk
  anak), dan `formatSummary` (locale, `displayFormat`, `customizeText`).
  Nilai dikunci per kolom — satu summary per kolom. Formatter yang melempar
  error menghasilkan `—` dan dilaporkan lewat `onError`.
- Persistensi: `createStatePersistence` menyimpan snapshot versioned dengan
  **migrasi** (v0 → v1), autosave debounce, batas ukuran, serta menolak state
  korup/versi lebih baru sebagai `SUI-DG-008`. Selection tidak dipersistenkan.
- Renderer skeleton: `createGridView` membentuk DOM grid (header sticky,
  viewport + spacer, footer, live region, RTL) — renderer baris menyusul.
  Impor `@simpleui/datagrid/styles.css` untuk layout; semua warna/ukuran dari
  token `@simpleui/theme`. Header sudah mendukung sort (klik/shift+klik,
  `aria-sort`, indikator multi-sort) dan penanda filter.
- `createRowRenderer` memvirtualkan baris: hanya baris di viewport + overscan
  yang ada di DOM, node didaur ulang, `aria-rowindex` absolut, dan **scroll
  anchoring** mempertahankan baris terlihat saat data berubah.
- Kolom: `computeColumnLayout` (prefix sum + binary search) memvirtualkan kolom,
  kolom `fixed: 'start' | 'end'` sticky, dengan penanda shadow tepi dan
  `aria-colcount` absolut.
- Sel: `formatCellValue`/`formatRowCell` memformat angka, persen, mata uang,
  tanggal, dan boolean sesuai locale + `ColumnFormat`; `null`/`undefined`
  menjadi placeholder `—`; konten selalu ditulis sebagai **teks murni**
  (`setCellText`), tidak pernah `innerHTML`.
- Template: `cellTemplate`/`headerCellTemplate` (kontrak `TemplateRenderer`
  core) di-mount per sel/header, di-`update` saat baris didaur ulang, dan
  di-`dispose` saat kolom berubah/grid dilepas. Error template dilaporkan lewat
  `onTemplateError` tanpa menghentikan render.
- Status: `setStatus('loading' | 'empty' | 'no-data' | 'error')` menampilkan
  overlay (spinner, pesan, tombol retry untuk error retryable) tanpa menghapus
  baris lama; pesan dapat dioverride lewat `messages`.
- Tipe publik lengkap ada di `src/api/types.ts` (DG-002).

Implementasi bertahap mengikuti `07-tasks.md` di repositori dokumen privat.
