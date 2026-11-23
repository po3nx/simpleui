# DataGrid 01 — Scope dan Acceptance Criteria

> **Status:** Draft v1.0 · **Owner:** Product Lead + Grid squad
> **Prasyarat:** [README](README.md) · [Rule Umum](../../00-rule-umum.md)
> **Tujuan:** mendefinisikan apa yang dibangun, dalam urutan apa, dan bagaimana
> dinyatakan selesai.

---

## 1. Definisi prioritas

| Prioritas | Arti | Konsekuensi |
|---|---|---|
| **P0** | Wajib untuk alpha/MVP | Tanpa ini grid tidak dapat dipakai |
| **P1** | Wajib untuk GA 1.0 | Tanpa ini tidak kompetitif di enterprise |
| **P2** | Pasca-GA (1.1+) | Diferensiasi, dapat ditunda |
| **Out** | Tidak dibangun di 1.0 | Dicatat agar tidak masuk scope diam-diam |

Setiap fitur **WAJIB** punya: acceptance criteria yang dapat diuji, task ID,
test, dan dokumentasi sebelum dianggap selesai.

---

## 2. Matriks fitur

### 2.1 Data & kolom

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-001 | Data lokal | Array/`ArrayStore` | P0 | 10.000 baris tampil; sorting/filter lokal benar | DG-013, DG-014 |
| FR-DG-002 | Data remote | `CustomStore`/REST/OData | P0 | Load dengan skip/take/sort/filter; cancel saat unmount | DG-013, DG-074 |
| FR-DG-003 | Kolom dasar | `dataField`, `caption`, `width`, `alignment` | P0 | Kolom sesuai konfigurasi; lebar default wajar | DG-011, DG-031 |
| FR-DG-004 | Tipe & format | string, number, date, boolean, currency | P0/P1 | Format sesuai locale; null ditampilkan placeholder | DG-034 |
| FR-DG-005 | Resize kolom | Pointer + keyboard | P0 | Lebar berubah; min/max dihormati; state tersimpan | DG-037 |
| FR-DG-006 | Reorder kolom | Drag + keyboard | P0 | Urutan berubah; fixed column tetap benar | DG-038 |
| FR-DG-007 | Column chooser | Tampil/sembunyi kolom | P0 | Perubahan langsung; minimal 1 kolom tersisa | DG-046 |
| FR-DG-008 | Fixed columns/bands | Pin kiri/kanan, header bertingkat | P1 | Fixed tetap saat scroll; shadow benar; RTL benar | DG-069 |
| FR-DG-009 | Column bands | Grup kolom | P1 | Header span benar; sort/filter per leaf | DG-069 |
| FR-DG-010 | Kolom template | `cellTemplate`, `headerCellTemplate` | P0 | Template render/update/dispose; error tidak merusak grid | DG-035, DG-070 |

### 2.2 Sorting, filtering, pencarian

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-011 | Sort single | Klik header, cycle asc/desc/none | P0 | Urutan benar; `aria-sort` benar | DG-039 |
| FR-DG-012 | Sort multi | Shift+klik, indicator urutan | P0 | Multi descriptor; stable; reset semua | DG-039 |
| FR-DG-013 | Filter row | Input per kolom | P0 | Operator sesuai tipe; debounce; reset | DG-040 |
| FR-DG-014 | Header filter | Checklist nilai + search | P0 | Nilai unik benar; select all; apply/cancel | DG-041 |
| FR-DG-015 | Search panel | Cari di kolom yang dikonfigurasi | P0 | Debounce 250 ms; highlight opsional; reset | DG-042 |
| FR-DG-016 | Filter builder lanjutan | AND/OR, group kondisi | P2 | AST benar; validasi; UI dapat diakses | — |
| FR-DG-017 | Remote filter/sort | Pushdown ke store | P1 | Hanya jika capability; fallback aman | DG-074 |
| FR-DG-018 | Filter operator aman | Tanpa regex default | P0 | Operator tertutup; payload injection gagal | DG-014 |

### 2.3 Paging & scrolling

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-019 | Paging | Page navigator, page size | P0 | Halaman benar; total count benar; page size 10/20/50/100 | DG-043 |
| FR-DG-020 | Virtual scroll | Render hanya viewport | P0 | 100.000 baris tetap 60 fps; `aria-rowindex` absolut | DG-032 |
| FR-DG-021 | Column virtualization | Render kolom visible | P0 | 200 kolom tetap responsif | DG-033 |
| FR-DG-022 | Infinite scroll | Load saat mendekati bawah | P2 | Tidak duplikasi; loading indicator; error retry | — |
| FR-DG-023 | Scroll anchoring | Pertahankan posisi saat data berubah | P1 | Baris yang terlihat tidak melompat | DG-032 |
| FR-DG-024 | Sticky header/footer | Header & summary tetap | P0 | Tetap saat scroll vertikal/horizontal | DG-030, DG-048 |

### 2.4 Selection & focus

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-025 | Selection single | Klik/checkbox | P0 | Hanya satu; event payload benar | DG-020, DG-044 |
| FR-DG-026 | Selection multiple | Ctrl/Shift, checkbox | P0 | Toggle & range benar; select all page | DG-020, DG-044 |
| FR-DG-027 | Select all | Halaman vs semua data | P0/P1 | Semantik jelas; remote butuh dukungan server | DG-044, DG-074 |
| FR-DG-028 | Preserve selection | Saat reload/sort/filter | P1 | Key-based; baris hilang ditangani | DG-020 |
| FR-DG-029 | Focus/current cell | Roving tabindex | P0 | Fokus terlihat; `aria-activedescendant`/fokus DOM benar | DG-021, DG-045 |
| FR-DG-030 | Focused row | Highlight baris aktif | P2 | Mode terpisah dari selection | DG-078 |

### 2.5 Editing

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-031 | Edit row | Mulai edit, commit, cancel | P1 | `Enter` commit, `Esc` cancel; validasi | DG-060, DG-061 |
| FR-DG-032 | Edit cell | Edit satu sel | P1 | Navigasi antar sel saat edit; commit on blur configurable | DG-061 |
| FR-DG-033 | Edit popup/form | Dialog edit | P1 | Focus trap; validasi; simpan/batal | DG-062 |
| FR-DG-034 | Batch edit | Kumpulkan perubahan | P1 | Dirty indicator; commit/rollback | DG-063 |
| FR-DG-035 | Validation | Sinkron & async | P1 | Error per sel; pesan a11y; async cancel | DG-064 |
| FR-DG-036 | Lookup column | Editor select dengan store | P1 | Value/label benar; remote search | DG-065 |
| FR-DG-037 | CRUD events | saving/saved/failed | P1 | Dapat dibatalkan; rollback; konflik 409 | DG-060 |
| FR-DG-038 | Editing permission | `allowEditing` per kolom/baris | P1 | Editor tidak muncul; API menolak | DG-061 |

### 2.6 Grouping, summary, detail

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-039 | Grouping | Group panel, expand/collapse | P1 | Multi-level; group row benar; keyboard | DG-066 |
| FR-DG-040 | Group summary | Agregasi per group | P1 | sum/avg/min/max/count; custom | DG-067 |
| FR-DG-041 | Total summary | Footer agregasi | P0/P1 | Total benar; format locale | DG-048, DG-067 |
| FR-DG-042 | Master-detail | Baris detail | P1 | Expand/collapse; template; async aman | DG-068 |
| FR-DG-043 | Custom summary | Fungsi agregasi | P2 | Murni; error terisolasi | DG-067 |

### 2.7 Export, clipboard, print

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-044 | CSV export | Semua/halaman/terpilih | P0 | Formula di-escape; delimiter/encoding benar | DG-047 |
| FR-DG-045 | Excel export | OOXML minimal | P1 | File valid; tanpa makro/formula; style dasar | DG-071 |
| FR-DG-046 | Clipboard copy | Sel/baris terpilih | P1 | Tab/newline benar; hormati kolom tersembunyi | DG-049 |
| FR-DG-047 | Context menu | Aksi kontekstual | P1 | Keyboard; focus; action benar | DG-049 |
| FR-DG-048 | Print | Stylesheet print | P2 | Semua baris tercetak; header berulang | DG-072 |

### 2.8 State, tema, a11y, i18n

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-049 | State persistence | Simpan state UI | P0/P1 | Versioned; validasi; opt-in | DG-022, DG-075 |
| FR-DG-050 | Tema & density | Token, dark, HC | P0 | Tidak ada hardcoded color; density mengubah row height | FND-010, DG-030 |
| FR-DG-051 | RTL | Layout mirror | P1 | Tidak ada `left/right` hardcoded; test visual | DG-073 |
| FR-DG-052 | Keyboard lengkap | Semua fungsi | P0 | Peta keyboard lulus E2E | DG-045 |
| FR-DG-053 | ARIA grid | Role/state benar | P0 | axe 0 serious/critical; screen reader pass | DG-056, DG-057 |
| FR-DG-054 | Live region | Pengumuman status | P0 | Throttle; tidak spam; teks i18n | DG-056 |
| FR-DG-055 | Localization | Semua string via i18n | P0 | `id-ID` & `en-US`; RTL locale | FND-016, DG-086 |
| FR-DG-056 | SSR import-safe | Tanpa akses DOM top-level | P1 | `renderToString` tidak error; mount client | DG-055 |

### 2.9 Kualitas & operasional

| ID | Fitur | Deskripsi | Pri | Acceptance criteria | Task |
|---|---|---|---|---|---|
| FR-DG-057 | Error/empty/loading | State eksplisit | P0 | Tidak ada layar kosong; retry tersedia | DG-036 |
| FR-DG-058 | Performance | Budget | P0 | Semua target [README §9](README.md#9-metrik-keberhasilan) | DG-082 |
| FR-DG-059 | Security | XSS/CSV/URL | P0 | Corpus lulus di 4 adapter | DG-083 |
| FR-DG-060 | Adapter parity | 4 adapter | P1 | Parity suite 40 skenario lulus | DG-054 |
| FR-DG-061 | Docs & demo | 40 demo | P1 | Semua fitur GA terdokumentasi | DG-086 |

---

## 3. Perilaku UX detail

### 3.1 Sorting

- Klik header: `asc → desc → none`.
- `Shift+klik`: tambah/ubah descriptor tanpa menghapus yang lain.
- Indicator menampilkan arah dan urutan (1, 2, 3).
- Sort tidak mengubah selection.
- Sort pada kolom yang di-group diabaikan dengan peringatan dev.

### 3.2 Filter

- Filter row: operator default per tipe:
  - string: `contains`
  - number/date: `eq`
  - boolean: `eq` (select)
- Header filter: daftar nilai unik + search + select all.
- `(Blanks)` mencakup `null` dan `undefined`.
- Apply filter → page kembali ke 1; selection dipertahankan berdasarkan key.
- Filter yang tidak valid menampilkan error inline, bukan crash.

### 3.3 Paging

- Page size default 20; opsi 10/20/50/100.
- Total tidak diketahui → tampilkan "Halaman X" tanpa total.
- Perubahan filter/sort → reset ke halaman 1.

### 3.4 Selection

- Klik baris memilih (mode single) atau toggle (mode multiple dengan Ctrl).
- Shift+klik memilih range dari anchor.
- Checkbox column opsional; header checkbox memilih halaman saat ini.
- `selectAllMode: 'page' | 'allPages'`; `allPages` hanya jika store mendukung.
- Selection berbasis key; baris yang hilang setelah reload dibersihkan dan
  event `selectionChanged` dipancarkan.

### 3.5 Editing

- Trigger: double-click, `Enter`, `F2`, atau API.
- Commit: `Enter`/`Tab` (configurable), blur (configurable).
- Cancel: `Esc`.
- Validasi sebelum commit; error ditampilkan di bawah sel dan diumumkan.
- Saat editing, navigasi keyboard tetap berfungsi sesuai mode.
- Perubahan optimistik hanya jika diaktifkan; default menunggu server.

### 3.6 Grouping

- Drag kolom ke group panel; atau API `groupBy()`.
- Group row menampilkan nilai, jumlah, dan summary.
- Expand/collapse via klik, `Enter`, `ArrowLeft/Right`.
- Grouping lokal untuk data lokal; remote hanya jika didukung.
- Group count dibatasi; jika terlampaui, tampilkan pesan.

### 3.7 Export

- CSV: delimiter `,` default, quote jika perlu, UTF-8, formula guard.
- Excel: OOXML minimal, satu sheet, header + data, tanpa formula/makro.
- Pilihan: semua baris (jika tersedia), halaman saat ini, baris terpilih.
- Kolom tersembunyi dikecualikan default.
- File name dapat dikonfigurasi dan disanitasi.

### 3.8 State persistence

- State yang disimpan: sorting, filter, paging, column width/order/visibility,
  group expansion, density.
- Tidak menyimpan data baris, selection (default), atau posisi scroll.
- Version + migrasi; state invalid diabaikan dengan peringatan dev.

---

## 4. Non-functional requirements

| Kategori | Requirement |
|---|---|
| Performance | Mount 10k ≤ 300 ms; scroll 60 fps; sort 100k ≤ 150 ms; memory ≤ 150 MB |
| Accessibility | WCAG 2.2 AA; keyboard penuh; axe 0 serious; screen reader tested |
| Security | Tanpa XSS/CSV injection; CSP-compatible; tanpa telemetry |
| Compatibility | 4 framework; 3 browser engine; SSR import-safe |
| Bundle | ≤ 70 KB gzip MVP; adapter ≤ 5 KB |
| Reliability | Dispose idempoten; tidak ada leak setelah 100× mount/unmount |
| Observability | Event error terklasifikasi; dev warning jelas |
| Docs | Semua opsi/event/method terdokumentasi + contoh |

---

## 5. Out of scope (1.0)

- Formula/spreadsheet.
- Import Excel.
- PDF export.
- Real-time collaboration.
- Server-side rendering markup internal.
- Mobile native gestures lanjutan (swipe, long-press) — hanya dasar.
- Pivot di dalam grid.
- Chart di dalam sel (via template diperbolehkan, tetapi bukan fitur inti).
- AI.
- IE11.

---

## 6. Acceptance criteria per milestone

### Alpha (M2)

- [ ] Data lokal + remote, 10.000 baris.
- [ ] Columns, sort, filter row, header filter, search, paging, virtual scroll.
- [ ] Selection single/multiple, keyboard navigation.
- [ ] Resize, reorder, column chooser, CSV export.
- [ ] Adapter React + vanilla.
- [ ] 0 axe critical; 0 XSS payload lolos.
- [ ] Demo berjalan 60 fps.

### Beta (M3)

- [ ] Semua fitur P0 + P1 utama (editing, grouping, master-detail, fixed
      columns, Excel, RTL, state).
- [ ] 4 adapter parity.
- [ ] A11y audit + screen reader pass.
- [ ] Security corpus lulus.
- [ ] 30 demo.
- [ ] Design partner feedback dikumpulkan.

### GA (M4)

- [ ] Semua fitur P0/P1 selesai dan terdokumentasi.
- [ ] Semua gate [Build §5.3](../../07-build-release.md#53-gate-wajib).
- [ ] Performance & security sign-off.
- [ ] 40 demo + API reference.
- [ ] Tidak ada known critical/high bug.
- [ ] Rilis 1.0 + changelog + migration guide.

---

*Untuk arsitektur teknis, lanjut ke [02-arsitektur.md](02-arsitektur.md).*
