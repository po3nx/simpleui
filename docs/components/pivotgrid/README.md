# PivotGrid — Plan Komponen

> **Status:** Planned · **Target:** PivotGrid 1.0 (M5) · **Paket:**
> `@simpleui/pivotgrid` + 4 adapter
> **Owner:** Pivot squad · **Mulai:** setelah DataGrid beta (2027-06-21)

PivotGrid mengubah data tabular menjadi tabel silang (cross-tab) dengan
agregasi multi-dimensi. Komponen ini berbagi core, adapter, dan pola test
dengan DataGrid, tetapi memiliki model data, layout, dan interaksi sendiri.

---

## 1. Posisi dalam roadmap

- **Mengapa setelah DataGrid:** PivotGrid memakai core, virtualizer, template
  bridge, dan pola adapter yang sama; DataGrid memvalidasi fondasi tersebut.
- **Mengapa tidak digabung ke DataGrid:** model data dan UI berbeda; menggabung
  akan membuat DataGrid terlalu besar dan sulit diuji.
- **Target pasar:** analis data, laporan keuangan, operasi, dashboard internal.

---

## 2. Scope

### 2.1 P0 — MVP

| Fitur                         | Acceptance criteria                        |
| ----------------------------- | ------------------------------------------ |
| Data binding lokal            | Array/`ArrayStore`; 100.000 baris sumber   |
| Fields row/column/data/filter | Konfigurasi dasar; validasi field          |
| Agregasi                      | sum, count, min, max, avg                  |
| Layout cross-tab              | Header baris/kolom bertingkat; grand total |
| Expand/collapse               | Klik, keyboard, `aria-expanded`            |
| Sorting/filtering member      | Urut abjad/nilai; filter nilai             |
| Virtual scrolling             | 100.000 sel tanpa lag                      |
| Field chooser                 | Pindah field antar area                    |
| CSV export                    | Formula guard; hormati field tersembunyi   |
| Keyboard & a11y               | Navigasi grid/tree; screen reader          |
| Template/format sel           | Teks, angka, tanggal, custom               |
| 4 adapter                     | Parity suite                               |

### 2.2 P1 — GA 1.0

| Fitur                  | Acceptance criteria                               |
| ---------------------- | ------------------------------------------------- |
| Remote pivot           | Protokol `load` dengan row/column paths; fallback |
| Custom aggregation     | Fungsi murni; error terisolasi                    |
| Subtotals per level    | Konfigurasi; konsisten dengan grand total         |
| Drill-down             | Menampilkan baris sumber; aman & terbatas         |
| Conditional formatting | Berdasarkan nilai; tanpa HTML                     |
| Excel export           | OOXML minimal; tanpa formula                      |
| State persistence      | Fields, sorting, filter, expand; versioned        |
| Printing               | Semua sel; header berulang                        |
| RTL                    | Layout mirror; angka tetap LTR                    |
| Performance            | 1.000.000 sel; interaksi < 100 ms                 |

### 2.3 P2 — Pasca-GA

- Calculated field dengan ekspresi aman (AST, tanpa eval).
- Pivot chart (integrasi Charts).
- Server-side pagination untuk drill-down.
- Export PDF.
- Saved views.
- Multi-measure dengan format berbeda.
- Kolom/row grouping lanjutan (hierarchy, parent-child).

---

## 3. Non-goals (1.0)

- OLAP server/MDX.
- In-memory columnar engine untuk miliaran baris.
- Real-time pivot.
- Formula spreadsheet.
- Editing data langsung dari PivotGrid (read-only).
- Pivot di dalam sel DataGrid.
- AI insight.

---

## 4. Model data

### 4.1 Field

```ts
interface PivotField<T> {
  id: string;
  dataField?: keyof T & string;
  caption: string;
  area: 'row' | 'column' | 'data' | 'filter' | 'hidden';
  dataType: 'string' | 'number' | 'date' | 'boolean';
  summaryType?: 'sum' | 'count' | 'min' | 'max' | 'avg' | 'custom';
  calculateSummary?: (values: readonly unknown[]) => number;
  format?: FormatSpec;
  sortOrder?: 'asc' | 'desc';
  filterValues?: readonly unknown[];
  allowSorting?: boolean;
  allowFiltering?: boolean;
  visible?: boolean;
}
```

Aturan:

- `id` unik; perubahan area tidak mengubah id.
- Field `data` minimal satu; jika tidak ada, error `SUI-PV-001`.
- Field `row`/`column` maksimal 10 level total.
- Field `data` maksimal 20 measure (batas UI).
- `calculateSummary` murni dan tidak boleh mengakses DOM.

### 4.2 Cube

- Cube dibangun dari data sumber + fields.
- Representasi sparse:

```ts
interface CubeKey {
  readonly rowPath: readonly string[];
  readonly columnPath: readonly string[];
}

interface CubeCell {
  readonly value: number | null;
  readonly count: number;
}

type Cube = Map<string, CubeCell>; // key = encode(rowPath) + '|' + encode(columnPath)
```

- Key di-encode dengan delimiter yang di-escape; jangan memakai JSON mentah
  untuk performa.
- Grand total disimpan sebagai path kosong.
- Subtotals dihitung saat build, bukan saat render.
- Memory: 1.000.000 sel × 2 angka ≈ 16 MB (target).
- Build di worker jika > 50.000 baris (opsional, diukur).

### 4.3 Agregasi

| Tipe        | Rumus              | Catatan                                |
| ----------- | ------------------ | -------------------------------------- |
| `sum`       | Σ nilai valid      | Abaikan null/NaN                       |
| `count`     | jumlah nilai valid | Termasuk 0                             |
| `min`/`max` | nilai ekstrem      | Null jika kosong                       |
| `avg`       | sum / count        | Count 0 → null                         |
| `custom`    | fungsi             | Harus mengembalikan finite number/null |

Aturan:

- Nilai non-finite dinormalisasi ke `null` dan dilaporkan di dev.
- `count` menghitung baris, bukan sel unik.
- Distinct count tidak didukung 1.0 (butuh struktur khusus).

---

## 5. Arsitektur

```text
PivotGrid (api)
 ├─ FieldModel (area, sorting, filter, format)
 ├─ CubeBuilder (local/remote)
 ├─ LayoutEngine (row tree, column tree, spans, totals)
 ├─ PivotViewModel (visible cells, headers, viewport)
 ├─ Renderer + Virtualizer (row/column)
 ├─ Interaction (expand, sort, filter, field chooser, drill-down)
 └─ Export (CSV/Excel)
```

Prinsip sama dengan DataGrid:

- Model murni tanpa DOM.
- Renderer membaca view model.
- Adapter hanya menerjemahkan props/event/template.
- Tidak ada import ke `@simpleui/datagrid`.

### 5.1 Layout engine

- Row tree: level → member → children.
- Column tree: level → member → children, dengan span.
- Header sel memiliki `rowSpan`/`colSpan` yang dihitung dari tree.
- Grand total berada di akhir (configurable: start/end).
- Subtotals dirender sebagai baris/kolom tambahan.
- Layout dihitung ulang hanya saat fields/expand/sort/filter berubah.

### 5.2 Virtualisasi

- Virtualisasi baris dan kolom secara independen.
- Header baris/kolom sticky; corner sticky.
- Prefix sum untuk tinggi baris/lebar kolom.
- Hanya sel visible + overscan yang dirender.
- `aria-rowindex`/`aria-colindex` absolut.

### 5.3 Remote

Kontrak `PivotStore`:

```ts
interface PivotLoadOptions {
  readonly rows: readonly string[];
  readonly columns: readonly string[];
  readonly measures: readonly string[];
  readonly filter?: FilterExpression;
  readonly signal?: AbortSignal;
}

interface PivotLoadResult {
  readonly cells: readonly {
    rowPath: readonly string[];
    columnPath: readonly string[];
    values: Readonly<Record<string, number | null>>;
  }[];
  readonly rowMembers?: Readonly<Record<string, readonly string[]>>;
  readonly columnMembers?: Readonly<Record<string, readonly string[]>>;
}
```

- Jika server tidak mendukung, fallback ke cube lokal dengan batas baris.
- Path divalidasi; tidak ada query mentah.
- Request dibatalkan saat fields berubah.

---

## 6. API ringkas

```ts
interface PivotGridOptions<T> {
  dataSource: DataSourceInput<T>;
  fields: readonly PivotField<T>[];
  showGrandTotals?: 'both' | 'rows' | 'columns' | 'none';
  showSubtotals?: boolean;
  expandAll?: boolean;
  fieldChooser?: { enabled: boolean };
  export?: { enabled: boolean; formats: ('csv' | 'xlsx')[] };
  stateStoring?: StateStoringOptions;
  rtlEnabled?: boolean;
  onCellClick?: (e: PivotCellClickEvent<T>) => void;
  onCellPrepared?: (e: PivotCellPreparedEvent) => void;
  onFieldValueExpanded?: (e: PivotExpandEvent) => void;
  onExported?: (e: PivotExportedEvent) => void;
}
```

Method:

- `getDataSource()`, `refresh()`, `dispose()`
- `getFieldValues(fieldId)`, `getFieldArea(fieldId)`
- `expandAll()`, `collapseAll()`, `expandRow(path)`, `collapseRow(path)`
- `drillDown(rowPath, columnPath)`
- `exportToCsv()`, `exportToExcel()`
- `getState()`, `state(state)`, `resetState()`
- `option()`, `beginUpdate()`, `endUpdate()`, `repaint()`

Event:

- `cellClick`, `cellPrepared`, `fieldValueExpanded`, `fieldValueCollapsed`,
  `fieldChooserOpened`, `exporting`, `exported`, `stateChanged`, `disposing`.

Aturan API sama dengan DataGrid: nama identik lintas framework, payload
read-only, event setelah state konsisten.

---

## 7. Keamanan

| Ancaman                     | Kontrol                                  |
| --------------------------- | ---------------------------------------- |
| XSS di header/nilai         | Teks default; sanitizer opt-in           |
| XSS di format/custom        | Format mengembalikan teks, bukan HTML    |
| Formula injection export    | Prefix `'`; tanpa formula                |
| Drill-down membocorkan data | Hormati filter & izin; batas baris       |
| Filter/path injection       | Validasi field/path; encoding            |
| DoS cube                    | Batas baris/field/sel; worker            |
| State poisoning             | Schema + version + batas                 |
| Remote URL                  | `safeUrl`, HTTPS, timeout, batas respons |
| Prototype pollution         | `safeMerge`                              |

Detail mengikuti [Security umum](../../05-security.md) dan
[DataGrid security](../datagrid/04-security.md) dengan tambahan drill-down &
cube.

---

## 8. Aksesibilitas

- `role="grid"` dengan header bertingkat; `aria-rowcount`/`colcount`.
- Header sel: `role="columnheader"`, `aria-expanded` untuk expandable.
- Row header: `role="rowheader"`.
- Navigasi: arrow, Home/End, Ctrl+Home/End, PageUp/Down, Enter/Space expand.
- Live region untuk expand/collapse dan perubahan field.
- Field chooser: dialog dengan focus trap, drag alternatif keyboard.
- Drill-down: dialog dengan tabel yang dapat diakses.
- Chart/pivot alternatif teks: ringkasan total.

---

## 9. Test plan

| Area           | Test                                                               |
| -------------- | ------------------------------------------------------------------ |
| Cube           | 1 field, multi row/col, subtotal, grand total, null, angka negatif |
| Agregasi       | sum/count/min/max/avg/custom, NaN/Infinity                         |
| Layout         | span, sticky, RTL, total di awal/akhir                             |
| Expand         | keyboard, state, nested, auto-expand                               |
| Sorting/filter | member sort, filter nilai, blanks                                  |
| Field chooser  | pindah area, validasi minimal 1 measure                            |
| Drill-down     | data benar, batas, izin, dialog a11y                               |
| Remote         | load, cancel, error, fallback                                      |
| Export         | CSV/Excel, formula guard, hidden fields                            |
| Performance    | 1.000.000 sel, expand < 100 ms                                     |
| Security       | XSS, injection, state, export                                      |
| Parity         | 40 skenario × 4 adapter                                            |

Target coverage: cube/agregasi ≥ 90%; komponen ≥ 85%; adapter ≥ 80%.

---

## 10. Jadwal

| Fase | Durasi   | Fokus                                            | Gate         |
| ---- | -------- | ------------------------------------------------ | ------------ |
| PV-0 | 2 minggu | Scope, API, threat model                         | G-PV0        |
| PV-1 | 5 minggu | Field model, cube, agregasi, sort/filter         | G-PV1        |
| PV-2 | 5 minggu | Layout, virtualizer, renderer, expand            | G-PV2        |
| PV-3 | 4 minggu | Totals, field chooser, drill-down, export, state | G-PV3        |
| PV-4 | 4 minggu | Adapter, parity, a11y, test                      | G-PV4 (beta) |
| PV-5 | 2 minggu | Remote, security, perf, docs, GA                 | G-PV5 (GA)   |

Total 22 minggu (2027-06-21 → 2027-11-19), paralel dengan DataGrid GA dan awal
Charts.

---

## 11. Risiko

| Risiko                        | Dampak          | Mitigasi                                    |
| ----------------------------- | --------------- | ------------------------------------------- |
| Cube memory meledak           | Crash           | Batas sel, sparse map, worker, virtualisasi |
| Layout span rumit             | Bug visual      | Unit test layout murni + visual             |
| Drill-down membocorkan data   | Security        | Filter & izin, batas baris, review          |
| Remote protocol tidak standar | Integrasi sulit | Kontrak jelas + fallback lokal              |
| A11y header bertingkat        | Sulit           | Pola treegrid, uji screen reader awal       |
| Scope creep (chart, formula)  | Molor           | P2 tegas, ADR untuk perubahan               |

---

## 12. Metrik keberhasilan

| Metrik                      | Target                       |
| --------------------------- | ---------------------------- |
| Build cube 100.000 baris    | ≤ 2 detik                    |
| Render 1.000.000 sel        | ≤ 1 detik (initial viewport) |
| Expand/collapse             | ≤ 100 ms                     |
| Memory 1.000.000 sel        | ≤ 200 MB                     |
| Bundle gzip                 | ≤ 50 KB                      |
| Axe serious/critical        | 0                            |
| Security critical/high      | 0                            |
| Design partner satisfaction | ≥ 4/5                        |

---

## 13. Dokumen

- Task list: [02-tasks.md](02-tasks.md)
- Arsitektur umum: [01 — Arsitektur](../../01-arsitektur.md)
- Data layer: [03 — Data Layer](../../03-data-layer.md)
- Security: [05 — Security](../../05-security.md)
- Testing: [04 — Testing](../../04-testing-strategy.md)

---

_PivotGrid adalah komponen read-only; editing tetap di DataGrid atau form
terpisah._
