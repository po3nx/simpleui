# Komponen SimpleUI — Katalog & Status

> **Status:** Draft v1.0 · **Owner:** Product Lead
> **Terkait:** [Roadmap](../08-roadmap.md) · [Rule Umum](../00-rule-umum.md) ·
> [Template plan](datagrid/README.md)

---

## 1. Status maturity

| Status         | Arti               | Kriteria                                      |
| -------------- | ------------------ | --------------------------------------------- |
| `Planned`      | Baru direncanakan  | Plan & task list ada                          |
| `Experimental` | API belum stabil   | Boleh breaking change di minor; docs ditandai |
| `Preview`      | Fitur inti lengkap | API hampir stabil; feedback dibutuhkan        |
| `Stable`       | Siap produksi      | Semua gate GA lulus; semver                   |
| `Deprecated`   | Akan dihapus       | Alternatif tersedia; minimal 2 minor          |
| `Dropped`      | Dibatalkan         | Alasan dicatat                                |

Semua komponen dimulai dari `Planned`. Status dinaikkan hanya lewat review gate
di [roadmap §3](../08-roadmap.md#3-phase-dan-milestone).

---

## 2. Katalog

### Tier 0 — Platform

| Komponen        | Paket               | Status  | Plan                                       |
| --------------- | ------------------- | ------- | ------------------------------------------ |
| Core runtime    | `@simpleui/core`    | Planned | [01 — Arsitektur](../01-arsitektur.md)     |
| Theme & tokens  | `@simpleui/theme`   | Planned | [06 — Theming](../06-theming-a11y-i18n.md) |
| Icons           | `@simpleui/icons`   | Planned | —                                          |
| Testing harness | `@simpleui/testing` | Planned | [04 — Testing](../04-testing-strategy.md)  |

### Tier 1 — Flagship

| Komponen      | Paket                 | Status  | Target | Plan                        | Tasks                          |
| ------------- | --------------------- | ------- | ------ | --------------------------- | ------------------------------ |
| **DataGrid**  | `@simpleui/datagrid`  | Planned | M4     | [Plan](datagrid/README.md)  | [Tasks](datagrid/07-tasks.md)  |
| **PivotGrid** | `@simpleui/pivotgrid` | Planned | M5     | [Plan](pivotgrid/README.md) | [Tasks](pivotgrid/02-tasks.md) |
| **Charts**    | `@simpleui/charts`    | Planned | M6     | [Plan](chart/README.md)     | [Tasks](chart/02-tasks.md)     |

### Tier 2 — Editors, layout, navigation

| Kelompok | Komponen                                                                                                                           | Target | Status  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| Editors  | TextBox, TextArea, NumberBox, SelectBox, TagBox, Autocomplete, Lookup, DateBox, DateRangeBox, CheckBox, Switch, RadioGroup, Slider | M7     | Planned |
| Validasi | Validator, ValidationSummary, Form                                                                                                 | M7     | Planned |
| Layout   | Tabs, Accordion, Toolbar, Drawer, Popup, ScrollView, Splitter                                                                      | M7     | Planned |
| Navigasi | TreeView, Menu, Breadcrumb, Pagination                                                                                             | M7     | Planned |
| Feedback | LoadIndicator, ProgressBar, Toast, Skeleton, Tooltip                                                                               | M7     | Planned |
| Data     | TreeList                                                                                                                           | M7+    | Planned |

### Tier 3 — Advanced

| Komponen                | Target | Status  | Catatan                           |
| ----------------------- | ------ | ------- | --------------------------------- |
| Scheduler               | M8     | Planned | Butuh timezone & recurrence       |
| Gantt                   | M8     | Planned | Butuh dependency graph & timeline |
| FileManager             | M8     | Planned | Butuh adapter storage             |
| Diagram                 | M8+    | Planned | Canvas/SVG, kompleks              |
| VectorMap               | M8+    | Planned | Geo data, proyeksi                |
| RangeSelector           | M8     | Planned | Chart-related                     |
| Bullet, Sparkline       | M8     | Planned | Chart-related                     |
| Pie/Donut, Polar/Radar  | M6     | Planned | Bagian Charts                     |
| TreeMap, Funnel, Gauges | M8+    | Planned | Chart-related                     |

### Tier 4 — Niche / integrasi

| Komponen                         | Status      | Catatan              |
| -------------------------------- | ----------- | -------------------- |
| PivotGrid field builder lanjutan | Planned     | Setelah PivotGrid GA |
| Excel export kompleks            | Planned     | OOXML, tanpa makro   |
| PDF export                       | Planned     | Butuh dependency     |
| AI assistant                     | Not planned | Di luar scope 1.0    |
| Low-code builder                 | Not planned | Produk terpisah      |

---

## 3. Aturan menambah komponen baru

1. Buat plan dengan [template](../11-templates/komponen-plan-template.md).
2. Tentukan tier & target milestone di [roadmap](../08-roadmap.md).
3. Pecah task dengan ID unik (`XX-001`) dan estimasi ideal day.
4. Tentukan dependency ke core/komponen lain (harus nol lintas komponen).
5. Tulis threat model & test plan.
6. Review tech lead + security + a11y.
7. Tambahkan ke katalog ini dan [master backlog](../10-tracking/master-backlog.md).
8. Jalankan `node docs/10-tracking/tools/progress.mjs --check`.

---

## 4. Konvensi penamaan paket

| Tipe      | Pola                               | Contoh                      |
| --------- | ---------------------------------- | --------------------------- |
| Core      | `@simpleui/core`                   | —                           |
| Komponen  | `@simpleui/<nama>`                 | `@simpleui/datagrid`        |
| Adapter   | `@simpleui/<framework>`            | `@simpleui/react`           |
| Integrasi | `@simpleui/<komponen>-<integrasi>` | `@simpleui/datagrid-export` |
| Internal  | `@simpleui-internal/<nama>`        | tidak dipublikasikan        |

**DILARANG** memakai nama yang menyerupai trademark pihak ketiga.

---

## 5. Ringkasan prioritas

```text
1. Fondasi
2. DataGrid        ← mulai di sini
3. PivotGrid + Charts (paralel)
4. Editors + Forms
5. TreeList, Scheduler
6. Gantt, Map, Diagram, FileManager
7. Komponen niche
```

Alasan: DataGrid adalah komponen dengan penggunaan tertinggi, menjadi fondasi
pola (model, renderer, adapter, a11y), dan paling baik untuk memvalidasi
arsitektur lintas framework.

---

_Untuk detail DataGrid, mulai dari [README](datagrid/README.md)._
