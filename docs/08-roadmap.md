# 08 — Roadmap Bertahap

> **Status:** Draft v1.0 · **Owner:** Tech Lead / Product Lead
> **Prasyarat:** [09 — Estimasi](09-estimasi.md) · [components/README](components/README.md)
> **Asumsi:** tim referensi 5–6 orang, mulai 1 Desember 2026.
> Semua tanggal adalah **target perencanaan**, bukan komitmen kontraktual.

---

## 1. Strategi urutan

Prinsip urutan:

1. **Fondasi sebelum fitur** — core runtime, data layer, adapter bridge, test
   harness, dan keamanan dasar harus ada sebelum komponen pertama.
2. **Data-centric lebih dulu** — DataGrid, PivotGrid, Chart adalah pembeda
   produk dan paling sulit; mengerjakannya lebih awal mengurangi risiko.
3. **Satu komponen sampai GA sebelum melebar** — DataGrid GA menjadi template
   proses untuk komponen berikutnya.
4. **Adapter di-paralelkan setelah core stabil** — front-load satu adapter
   (React) untuk validasi, lalu Vue/Angular/vanilla.
5. **Komponen generik (editor, layout) setelah flagship** — nilainya tinggi
   tetapi tidak mendiferensiasi di awal.
6. **Komponen mahal (Gantt, Map, Diagram) di akhir** — butuh investasi besar
   dan pasar lebih sempit.

Urutan yang dipilih:

```text
Fondasi → DataGrid → (PivotGrid ∥ Chart) → Editors/Forms
        → TreeList/Scheduler → Gantt/Map/Diagram/FileManager
```

---

## 2. Tier komponen

| Tier | Komponen | Alasan prioritas |
|---|---|---|
| **Tier 0** | Core, theme, icons, testing | Prasyarat semua |
| **Tier 1** | **DataGrid**, **PivotGrid**, **Chart** | Nilai enterprise tertinggi, pembeda |
| **Tier 2** | TreeList, Editor set (TextBox, NumberBox, SelectBox, DateBox, CheckBox, Switch, RadioGroup, TagBox, Autocomplete, Lookup, Validator), Layout (Tabs, Accordion, Toolbar, Drawer, Popup, ScrollView), Navigation (TreeView, Menu, Pagination), Feedback (LoadIndicator, ProgressBar, Toast, Skeleton) | Melengkapi use case CRUD & form |
| **Tier 3** | Scheduler, Gantt, FileManager, Diagram, VectorMap, RangeSelector, Bullet, Sparkline, Polar/Pie, TreeMap, Funnel, Gauges | Vertikal & visualisasi lanjutan |
| **Tier 4** | Fitur niche, integrasi pihak ketiga, AI assistant | Setelah 1.0 stabil |

Detail katalog: [components/README](components/README.md).

---

## 3. Phase dan milestone

### Ringkasan

| Phase | Nama | Durasi | Mulai | Selesai | Milestone |
|---|---|---|---|---|---|
| P0 | Foundation | 8 minggu | 2026-12-01 | 2027-01-29 | M1 |
| P1 | DataGrid Core & MVP | 11 minggu | 2027-02-01 | 2027-04-16 | M2 |
| P2 | DataGrid Beta & Adapters | 6 minggu | 2027-04-19 | 2027-05-28 | M3 |
| P3 | DataGrid GA | 10 minggu | 2027-05-31 | 2027-08-06 | M4 |
| P4 | PivotGrid | 22 minggu | 2027-06-21 | 2027-11-19 | M5 |
| P5 | Charts | 32 minggu | 2027-07-05 | 2028-02-11 | M6 |
| P6 | Editors & Forms | 26 minggu | 2027-11-22 | 2028-05-19 | M7 |
| P7 | Advanced Suite | 72 minggu | 2028-02-14 | 2029-06-29 | M8 |

P4 dan P5 berjalan paralel dengan P3 setelah DataGrid core stabil. P6 mulai
setelah PivotGrid GA; P7 setelah Charts GA.

### P0 — Foundation (8 minggu)

**Tujuan:** repo, core runtime, build, CI, design token, keamanan dasar, dan
test harness siap.

Deliverable:

- Monorepo pnpm + Turborepo, TypeScript strict, lint, format.
- `@simpleui/core`: kernel, state, DOM utils, scheduler, focus manager,
  i18n, security utils, data source dasar.
- `@simpleui/theme`: token light/dark/high-contrast, density, RTL.
- `@simpleui/testing`: harness adapter, fixture factory, payload corpus.
- Adapter bridge prototype (React/Vue/Angular) dari DG-005.
- CI PR + nightly, coverage, size-limit, API Extractor.
- Docs site skeleton + playground 4 framework.
- Threat model awal + `SECURITY.md`.
- Benchmark harness + baseline.
- [x] ADR-0001…0011 disetujui (2026-11-23) — lihat [ADR index](adr/README.md).

**Exit criteria (G1):**

- [ ] `pnpm build` dan `pnpm test` hijau di Node 24 & 26.
- [ ] Core coverage ≥ 85%, tanpa `any` di public API.
- [ ] Adapter prototype mount/update/unmount tanpa leak.
- [ ] Virtualizer prototype 100.000 baris pada 60 fps.
- [ ] Size budget terukur.
- [ ] Docs site dapat menampilkan satu demo grid sederhana.

### P1 — DataGrid Core & MVP (11 minggu)

**Tujuan:** grid fungsional dengan data lokal/remote, sorting, filtering,
paging, selection, keyboard, virtual scrolling; adapter vanilla/React.

Deliverable:

- Model: column, state, selection, focus, data controller.
- Query pipeline: filter, sort, page; summary dasar.
- Renderer: header, body, row recycling, column virtualization.
- Fitur MVP: sort, filter row, header filter, search, pager, selection,
  column resize/reorder, column chooser, CSV export.
- Keyboard navigation lengkap.
- Adapter React + vanilla (UMD).
- A11y dasar (role grid, aria-sort, roving tabindex).
- 40+ unit test, 15+ browser test.

**Exit criteria (G2 / M2 alpha):**

- [ ] Demo 10.000 baris berjalan 60 fps.
- [ ] Semua fitur MVP dapat dioperasikan keyboard.
- [ ] 0 axe critical; 0 XSS payload lolos.
- [ ] Adapter React + vanilla lulus parity dasar.
- [ ] Coverage komponen ≥ 80%.

### P2 — DataGrid Beta & Adapters (10 minggu)

**Tujuan:** semua adapter, fitur editing/grouping, aksesibilitas penuh, beta
untuk design partner.

Deliverable:

- Adapter React, Vue, Angular, vanilla; parity suite 40 skenario.
- A11y audit + screen reader pass.
- SSR/import-safety + Angular Universal.
- Visual regression baseline + cross-browser test.
- Memory leak test 100× mount/unmount.
- Docs + 25 demo.
- Beta release untuk design partner.

**Exit criteria (G3 / M3 beta):**

- [ ] 4 adapter lulus parity suite.
- [ ] Tidak ada axe serious/critical.
- [ ] Security corpus lulus di 4 adapter.
- [ ] Memory stabil setelah 100× mount/unmount.
- [ ] 3 design partner mencoba dan memberi feedback.

### P3 — DataGrid GA (10 minggu)

**Tujuan:** DataGrid 1.0 siap produksi.

Deliverable:

- Editing row/cell/popup/batch, validation, lookup.
- Grouping, group summary, master-detail.
- Fixed columns/bands, column chooser lengkap.
- RTL, print, Excel export, remote grouping/filter pushdown.
- State persistence UI + migrasi.
- Perbaikan feedback beta.
- Finalisasi API + `.api.md`.
- Dokumentasi lengkap + migration/upgrade guide.
- Performance & security sign-off.
- Release 1.0 (paket `@simpleui/datagrid` + adapter).
- Post-release monitoring.

**Exit criteria (G4 / M4):**

- [ ] Semua gate [07 — Build §5.3](07-build-release.md#53-gate-wajib) lulus.
- [ ] Coverage gate, mutation core ≥ 70%.
- [ ] Manual a11y NVDA/VoiceOver selesai.
- [ ] 0 known critical/high security issue.
- [ ] Docs 100% fitur GA.

### P4 — PivotGrid (22 minggu, paralel)

**Tujuan:** PivotGrid 1.0 dengan cube lokal, remote pivot, field chooser,
drill-down, export.

Deliverable sesuai [PivotGrid plan](components/pivotgrid/README.md).

**Exit criteria (M5):**

- [ ] Cube 1.000.000 sel tanpa lag > 100 ms.
- [ ] 4 adapter parity.
- [ ] Security & a11y sign-off.
- [ ] Docs + 15 demo.

### P5 — Charts (32 minggu, paralel)

**Tujuan:** Chart suite 1.0: cartesian, financial, pie/polar, sparkline,
range selector; SVG + Canvas.

Deliverable sesuai [Chart plan](components/chart/README.md).

**Exit criteria (M6):**

- [ ] 100.000 titik dengan interaksi tetap responsif.
- [ ] Visual regression 20 skenario.
- [ ] A11y: data table alternatif + keyboard exploration.
- [ ] 4 adapter parity.
- [ ] Docs + 25 demo.

### P6 — Editors & Forms (26 minggu)

**Tujuan:** set editor dan form yang terintegrasi dengan DataGrid editing.

Lingkup: TextBox, TextArea, NumberBox, SelectBox, TagBox, Autocomplete,
Lookup, DateBox, DateRangeBox, CheckBox, Switch, RadioGroup, Slider, ProgressBar,
Validator, Form, ValidationSummary, Toolbar, Tabs, Accordion, Popup, Drawer,
Toast, LoadIndicator, Skeleton, Pagination, TreeView, Menu.

**Exit criteria (M7):**

- [ ] Semua editor punya varian terkontrol + validasi.
- [ ] Integrasi DataGrid editing lulus.
- [ ] A11y & security sign-off.
- [ ] 4 adapter parity.

### P7 — Advanced Suite (72 minggu)

Lingkup: TreeList, Scheduler, Gantt, FileManager, Diagram, VectorMap,
RangeSelector, Bullet, Sparkline, Polar/Pie, TreeMap, Funnel, Gauges.

Dijalankan per komponen dengan template proses yang sama (plan → task list →
implementasi → GA). Estimasi per komponen di
[09 — Estimasi](09-estimasi.md).

---

## 4. Milestone dan gate

| Milestone | Tanggal target | Definisi |
|---|---|---|
| **M0** | 2026-11-28 | Plan v1.0 disetujui; 11 ADR Accepted (2026-11-23) |
| **M1** | 2027-01-29 | Foundation siap (G1) |
| **M2** | 2027-04-16 | DataGrid alpha (G2) |
| **M3** | 2027-05-28 | DataGrid beta 4 adapter (G3) |
| **M4** | 2027-08-06 | DataGrid 1.0 GA (G4) |
| **M5** | 2027-11-19 | PivotGrid 1.0 GA (G5) |
| **M6** | 2028-02-11 | Charts 1.0 GA (G5) |
| **M7** | 2028-05-19 | Editors & Forms GA (G5) |
| **M8** | 2029-06-29 | Advanced suite lengkap |

Gate G0–G5:

| Gate | Fokus | Keputusan |
|---|---|---|
| G0 | Plan & ADR | Go/no-go implementasi |
| G1 | Foundation | Siap membangun komponen |
| G2 | Alpha | Siap beta internal |
| G3 | Beta | Siap design partner |
| G4 | GA DataGrid | Siap rilis publik |
| G5 | GA komponen berikutnya | Siap rilis publik |

---

## 5. Jalur paralel

| Track | Isi | Owner |
|---|---|---|
| Core platform | kernel, data, security, a11y service | Core engineer |
| DataGrid | komponen + fitur | Grid squad |
| Framework adapters | React/Vue/Angular/vanilla, parity | Adapter engineer |
| Design system | token, tema, ikon, visual spec | Designer + UI engineer |
| Quality | test harness, CI, visual, perf, security | QA |
| Docs & DX | docs site, demo, tutorial, API reference | Tech writer + engineer |
| Release | build, changesets, publish, SBOM | Release manager |

Aturan: track tidak boleh mengubah arsitektur tanpa ADR; perubahan lintas track
dikoordinasikan di weekly sync.

---

## 6. Definisi "selesai" per phase

Selain DoD per task ([00 §12](00-rule-umum.md#12-definition-of-done-dod)):

- Demo yang dapat dijalankan di 4 adapter.
- Docs halaman komponen lengkap.
- Security & a11y sign-off.
- Performance benchmark terdokumentasi.
- Changelog + migration note.
- Retrospective dan update estimasi.

---

## 7. Yang **tidak** termasuk roadmap 1.0

- Aplikasi low-code/no-code builder.
- Spreadsheet formula engine.
- Kolaborasi real-time.
- Mobile native SDK.
- SSR hydration markup internal (hanya client mount).
- IE11.
- Integrasi AI.
- Marketplace tema pihak ketiga.
- Dukungan Vue 2 / Angular < 17 / React < 18.

---

## 8. Change control

- Perubahan tanggal milestone > 2 minggu wajib persetujuan stakeholder.
- Perubahan scope komponen wajib update:
  - `01-scope.md` komponen;
  - task list + estimasi;
  - [progress dashboard](10-tracking/progress.md);
  - [09 — Estimasi](09-estimasi.md).
- Perubahan arsitektur wajib ADR.
- Setiap akhir phase: review metric, update risiko, dan re-baseline bila perlu.

---

## 9. Metrik keberhasilan

| Metrik | Target 1.0 |
|---|---|
| Time to first grid (dari docs) | ≤ 10 menit |
| Bundle DataGrid (gzip) | ≤ 70 KB |
| Mount 10.000 baris | ≤ 300 ms |
| Scroll 60 fps | ≥ 95% frame |
| Axe serious/critical | 0 |
| Security critical/high terbuka | 0 |
| Coverage core | ≥ 90% |
| API breaking tanpa major | 0 |
| Bug kritis per rilis | 0 |
| Design partner satisfaction | ≥ 4/5 |

---

*Untuk perhitungan effort dan skenario tim, lihat
[09 — Estimasi](09-estimasi.md).*
