# DataGrid — Plan Komponen (Prioritas #1)

> **Status:** Planned · **Target:** DataGrid 1.0 (M4) · **Milestone:** M2 alpha,
> M3 beta, M4 GA
> **Owner:** Grid squad · **Tech lead:** TBD · **Security reviewer:** TBD
> **Paket:** `@simpleui/datagrid` + adapter React/Vue/Angular/vanilla

DataGrid adalah komponen pertama dan **template proses** untuk seluruh komponen
berikutnya. Semua keputusan di sini (struktur model, renderer, adapter, test,
security, a11y) akan dipakai ulang oleh PivotGrid, TreeList, dan komponen data
lain.

---

## 1. Mengapa DataGrid lebih dulu

1. **Penggunaan tertinggi** di aplikasi enterprise.
2. **Mengunci arsitektur** — virtualisasi, editing, selection, template bridge,
   dan adapter paling sulit di sini; jika berhasil, komponen lain lebih mudah.
3. **Menguji performa & a11y** pada skala nyata.
4. **Menjadi bukti nilai** ke design partner lebih cepat.
5. **Menjadi pola test** — parity suite dan security corpus dibuat di sini.

---

## 2. Ringkasan scope

| Fase | Fokus | Fitur utama |
|---|---|---|
| **MVP (alpha)** | Grid read-only + interaksi dasar | data lokal/remote, columns, sort, filter row, header filter, search, paging, virtual scroll, selection, keyboard, resize/reorder, column chooser, CSV export, summary total |
| **GA (1.0)** | Grid enterprise | editing (row/cell/popup/batch), validation, grouping, master-detail, fixed columns/bands, Excel export, RTL, print, remote grouping, state persistence, 4 adapter, a11y penuh |
| **Pasca-GA (1.1+)** | Diferensiasi | row drag, column bands lanjutan, custom summary, export template, server-side selection, performance > 1 juta baris |

Detail fitur & acceptance criteria: [01-scope.md](01-scope.md).

---

## 3. Diferensiasi yang ingin dicapai

1. **Konsisten di 4 framework** — perilaku, API, dan a11y identik.
2. **Aman secara default** — tanpa XSS/CSV injection; sanitasi opt-in.
3. **Aksesibel** — WAI-ARIA Grid, keyboard penuh, screen reader tested.
4. **Cepat** — 100.000 baris remote, 60 fps, memory terkendali.
5. **Kecil** — ≤ 70 KB gzip untuk fitur MVP.
6. **Tidak mengunci framework** — core DOM, adapter tipis.
7. **API bersih & bertipe** — generic `DataGrid<T>`, event bertipe.

---

## 4. Arsitektur singkat

```text
DataGrid (api)
 ├─ OptionsNormalizer / validasi
 ├─ GridModel (state machine)
 │   ├─ ColumnModel
 │   ├─ SelectionModel
 │   ├─ FocusModel
 │   └─ EditModel
 ├─ DataController → DataSource / Store
 ├─ ViewModel → Renderer + Virtualizer
 └─ Interaction (keyboard, pointer, resize, reorder, edit)
```

Prinsip:

- Model murni, tanpa DOM.
- Renderer membaca state, tidak memutasi.
- Data controller menangani load/cancel/cache.
- Adapter hanya menerjemahkan props/event/template.

Detail: [02-arsitektur.md](02-arsitektur.md).

---

## 5. Prinsip UX

| Prinsip | Implementasi |
|---|---|
| Prediktif | Sorting cycle asc → desc → none; filter langsung terlihat |
| Cepat | Tidak ada spinner untuk operasi < 150 ms; skeleton untuk load awal |
| Dapat dibatalkan | Request lama dibatalkan; edit dapat `Esc` |
| Jelas | Empty/error/loading state eksplisit, bukan layar kosong |
| Keyboard-first | Semua fungsi dapat diakses tanpa mouse |
| Tidak mengejutkan | Selection dipertahankan saat reload; scroll anchoring |
| Mobile-aware | Touch target 24px+, horizontal scroll natural |

---

## 6. Kompatibilitas

| Dimensi | Target |
|---|---|
| Framework | JS/TS, React 18+, Vue 3.4+, Angular 17+ |
| Browser | Chrome/Edge/Firefox 2 terakhir, Safari 16.4+ |
| Data | Array, REST, OData v4, custom store |
| Ukuran | 100.000 baris remote; 10.000 baris lokal |
| SSR | Import-safe, client mount |
| Tema | Light, dark, high-contrast, RTL, density |

---

## 7. Non-goals (1.0)

- Spreadsheet/formula engine.
- Real-time collaborative editing.
- Server-side rendering markup internal.
- Mobile native.
- IE11 / Vue 2 / Angular < 17.
- Pivot di dalam DataGrid (gunakan PivotGrid).
- Chart di dalam sel (gunakan template + Charts).
- AI assistance.
- Import Excel (hanya export).

---

## 8. Tim dan jadwal

| Peran | Alokasi |
|---|---|
| Tech lead | 30% |
| Core/grid engineer | 2 FTE |
| Adapter engineer | 1 FTE |
| QA/UX | 0,8 FTE |
| Designer | 0,3 FTE |
| Security reviewer | 0,2 FTE |
| Tech writer | 0,3 FTE |

| Milestone | Target | Durasi |
|---|---|---|
| DG-0 Kontrak & spike | 2027-01-11 → 2027-02-05 | 4 minggu |
| DG-1 Model & data | 2027-02-08 → 2027-03-12 | 5 minggu |
| DG-2 Rendering & MVP | 2027-03-15 → 2027-04-16 | 5 minggu |
| DG-3 Adapter & a11y | 2027-04-19 → 2027-05-28 | 6 minggu |
| DG-4 Fitur GA | 2027-05-31 → 2027-07-02 | 5 minggu |
| DG-5 Hardening & GA | 2027-07-05 → 2027-08-06 | 5 minggu |

Total 30 minggu kalender (DG-0 tumpang tindih dengan fondasi); sebagian
pekerjaan adapter, docs, dan visual test berjalan paralel. Tanggal detail:
[06-implementation-plan.md](06-implementation-plan.md).

---

## 9. Metrik keberhasilan

| Metrik | Target |
|---|---|
| Time to first grid dari docs | ≤ 10 menit |
| Mount 10.000 baris | ≤ 300 ms |
| Scroll frame | ≤ 16 ms (≥ 95% frame) |
| Sort 100.000 baris | ≤ 150 ms |
| Bundle MVP gzip | ≤ 70 KB |
| Axe serious/critical | 0 |
| XSS/CSV payload lolos | 0 |
| Memory setelah 100× mount/unmount | pertumbuhan ≤ 5% |
| Bug kritis pasca-GA | 0 dalam 30 hari |
| Design partner satisfaction | ≥ 4/5 |

---

## 10. Dependensi

| Dependensi | Status | Dampak |
|---|---|---|
| Core kernel & state | FND-011/012 | Wajib sebelum DG-1 |
| Data layer | FND-018 | Wajib sebelum DG-1 |
| Template bridge | FND-017, DG-005 | Wajib sebelum adapter |
| Design token | FND-010 | Wajib sebelum renderer |
| Test harness | FND-020 | Wajib sebelum DG-2 |
| Virtualizer primitive | FND-019, DG-004 | Wajib sebelum DG-2 |
| Security utils | FND-022 | Wajib sebelum DG-2 |

---

## 11. Peta dokumen

| Dokumen | Isi |
|---|---|
| [01-scope.md](01-scope.md) | Fitur, prioritas, acceptance criteria, non-goals |
| [02-arsitektur.md](02-arsitektur.md) | Model, renderer, virtualizer, editing, event |
| [03-api.md](03-api.md) | Opsi, method, event, template, contoh 4 framework |
| [04-security.md](04-security.md) | Threat model & kontrol spesifik grid |
| [05-test-plan.md](05-test-plan.md) | Matriks test, fixture, budget, exit criteria |
| [06-implementation-plan.md](06-implementation-plan.md) | Fase, milestone, risiko, rollout |
| [07-tasks.md](07-tasks.md) | Task list yang dapat di-tracking |

---

## 12. Prinsip yang tidak boleh dilanggar

1. Tidak ada implementasi grid kedua di adapter.
2. Tidak ada `innerHTML` dengan data.
3. Tidak ada render ulang seluruh grid untuk perubahan selection/focus.
4. Tidak ada request tanpa `AbortSignal`.
5. Tidak ada fitur tanpa keyboard path.
6. Tidak ada public API tanpa TSDoc + test.
7. Tidak ada merge tanpa changeset bila consumer-facing.
8. Tidak ada penurunan performa di luar budget.

---

*Mulai dari [scope](01-scope.md), lalu [arsitektur](02-arsitektur.md), dan
[task list](07-tasks.md).*
