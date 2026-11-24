# SimpleUI — Project Plan & Engineering Handbook

> **Status:** Draft v1.0 — tahap perencanaan, belum ada implementasi kode
> **Tanggal:** 21 November 2026
> **Target:** library komponen UI enterprise yang framework-agnostic, dapat dipakai dari **JavaScript, TypeScript, React, Vue, dan Angular**.
> **Komponen pertama:** DataGrid
> **Lokasi proyek:** `D:\project\simpleUI`

Dokumen ini adalah pintu masuk (single entry point) untuk seluruh perencanaan
teknis SimpleUI. Semua keputusan arsitektur, aturan rekayasa, roadmap, rencana
per komponen, dan cara tracking progress berada di bawah `docs/`.

---

## 1. Jawaban singkat: berapa lama?

Asumsi: tim inti **5–6 orang** (3 core engineer, 1 framework/adapter engineer,
1 QA/UX engineer, 0,5 technical writer), satu orang senior sebagai tech lead,
dan komponen dibangun dari nol (bukan fork DevExtreme).

| Tonggak                                                         | Perkiraan kalender | Catatan                        |
| --------------------------------------------------------------- | ------------------ | ------------------------------ |
| Fondasi platform (repo, core runtime, CI, tokens, test harness) | **2 bulan**        | Phase 0                        |
| DataGrid MVP (vanilla + React, fitur inti)                      | **4–5 bulan**      | Termasuk fondasi               |
| DataGrid GA (4 adapter, editing, grouping, a11y, security, 1.0) | **8–9 bulan**      | Termasuk fondasi 2 bulan       |
| PivotGrid GA                                                    | **10–12 bulan**    | Kumulatif, sebagian paralel    |
| Chart suite GA (cartesian, financial, pie/polar, sparkline)     | **12–15 bulan**    | Kumulatif, squad terpisah      |
| **Trio DataGrid + PivotGrid + Chart GA**                        | **14–16 bulan**    | Target realistis dengan buffer |
| Parity penuh DevExtreme (±100 widget)                           | **30–36 bulan**    | Tim 5–6 orang                  |

Angka di atas adalah **rough order of magnitude**, bukan komitmen. Rincian
perhitungan, skenario tim, dan confidence level ada di
[09 — Estimasi & Skenario Tim](09-estimasi.md).

Jika hanya **1 orang senior full-time**: DataGrid MVP ± 16–19 bulan, trio
± 4–5 tahun, parity penuh tidak realistis secara kalender (10+ tahun).

> **Catatan penting.** "Clone DevExtreme" di dokumen ini berarti membangun
> library **independen** dengan kemampuan yang setara, bukan menyalin source,
> aset, dokumentasi, nama widget, atau tampilan DevExtreme. DevExtreme adalah
> produk komersial milik DevExpress. Baca aturan clean-room dan IP di
> [00 — Rule Umum §2.11](00-rule-umum.md#211-clean-room-dan-kepatuhan-ip).

---

## 2. Peta dokumen

### Aturan & arsitektur

| Dokumen                                                       | Isi                                                                                    | Wajib dibaca oleh          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| [00 — Rule Umum](00-rule-umum.md)                             | **Kontrak rekayasa utama**: clean code, security, testing, API, performance, a11y, DoD | Semua kontributor          |
| [01 — Arsitektur](01-arsitektur.md)                           | Layering, package, runtime, rendering, virtualisasi, keputusan arsitektur              | Core & component engineer  |
| [02 — Adapter Cross-Framework](02-adapter-cross-framework.md) | Desain adapter JS/TS/React/Vue/Angular, template bridge, parity suite, SSR             | Adapter engineer, reviewer |
| [03 — Data Layer](03-data-layer.md)                           | Store, DataSource, query pipeline, caching, remote pushdown, CRUD                      | Core & DataGrid engineer   |
| [04 — Testing Strategy](04-testing-strategy.md)               | Piramida test, tooling, coverage gate, visual/perf/security test                       | Semua kontributor          |
| [05 — Security](05-security.md)                               | Threat model, kontrol per permukaan, secure default, supply chain                      | Semua kontributor          |
| [06 — Theming, A11y, i18n](06-theming-a11y-i18n.md)           | Design token, CSS layer, WCAG 2.2 AA, lokalisasi, RTL                                  | UI engineer, designer      |
| [07 — Build & Release](07-build-release.md)                   | Build, exports, API report, CI/CD, rilis, provenance                                   | Release manager, tech lead |

### Perencanaan & eksekusi

| Dokumen                                                     | Isi                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| [08 — Roadmap Bertahap](08-roadmap.md)                      | Phase 0–7, milestone, gate, urutan komponen                |
| [09 — Estimasi & Skenario Tim](09-estimasi.md)              | Effort per komponen, skenario tim, kalender, risiko        |
| [components/README](components/README.md)                   | Katalog komponen, tier prioritas, status maturity          |
| [10-tracking/README](10-tracking/README.md)                 | Cara tracking task, status, progress, dan aturan update    |
| [10-tracking/master-backlog](10-tracking/master-backlog.md) | Epic lintas fase dan dependency graph                      |
| [10-tracking/progress](10-tracking/progress.md)             | Dashboard progress (di-generate dari task list)            |
| [adr/README](adr/README.md)                                 | Indeks Architecture Decision Records                       |
| [11-templates](11-templates/komponen-plan-template.md)      | Template plan komponen, ADR, dan PR checklist              |
| [troubleshooting](troubleshooting.md)                       | Kasus instalasi khusus: proxy korporat, npm ketat, Windows |

### Rencana per komponen

| Komponen                    | Plan                                                                                                                                                                                                                                                                                                                                          | Task list                                    | Target          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------- |
| **DataGrid** (prioritas #1) | [README](components/datagrid/README.md) · [Scope](components/datagrid/01-scope.md) · [Arsitektur](components/datagrid/02-arsitektur.md) · [API](components/datagrid/03-api.md) · [Security](components/datagrid/04-security.md) · [Test](components/datagrid/05-test-plan.md) · [Implementasi](components/datagrid/06-implementation-plan.md) | [07-tasks](components/datagrid/07-tasks.md)  | DataGrid 1.0    |
| **PivotGrid**               | [README](components/pivotgrid/README.md)                                                                                                                                                                                                                                                                                                      | [02-tasks](components/pivotgrid/02-tasks.md) | PivotGrid 1.0   |
| **Chart**                   | [README](components/chart/README.md)                                                                                                                                                                                                                                                                                                          | [02-tasks](components/chart/02-tasks.md)     | Chart suite 1.0 |

---

## 3. Urutan membaca yang disarankan

1. **Semua orang:** [00 — Rule Umum](00-rule-umum.md) — kontrak kerja.
2. **Tech lead / arsitek:** [01 — Arsitektur](01-arsitektur.md) →
   [02 — Adapter](02-adapter-cross-framework.md) →
   [03 — Data Layer](03-data-layer.md).
3. **Engineer DataGrid:** [scope](components/datagrid/01-scope.md) →
   [arsitektur](components/datagrid/02-arsitektur.md) →
   [API](components/datagrid/03-api.md) →
   [test plan](components/datagrid/05-test-plan.md).
4. **QA / security reviewer:** [04 — Testing](04-testing-strategy.md) →
   [05 — Security](05-security.md) →
   [DataGrid security](components/datagrid/04-security.md).
5. **Project manager:** [08 — Roadmap](08-roadmap.md) →
   [09 — Estimasi](09-estimasi.md) →
   [10-tracking](10-tracking/README.md).

---

## 4. Prinsip yang tidak boleh dinegosiasikan

1. **Satu implementasi perilaku, banyak adapter tipis.** Logika grid/pivot/chart
   hidup di core; React/Vue/Angular hanya menerjemahkan props, event, dan
   template. Tidak ada implementasi grid kedua di salah satu framework.
2. **Security by default.** Semua input dianggap tidak tepercaya; HTML mati
   secara default; tidak ada `eval`; tidak ada telemetry; dependency minimal.
3. **Accessibility adalah functional requirement.** Setiap komponen interaktif
   wajib lolos keyboard-only test dan axe sebelum dianggap selesai.
4. **Performance punya budget numerik.** Budget diuji di CI, bukan opini.
5. **API adalah produk.** Perubahan breaking butuh major version, ADR, dan
   migration guide.
6. **Test adalah spesifikasi yang dapat dieksekusi.** Fitur tanpa test belum
   selesai; bugfix wajib disertai regression test.
7. **Tidak ada kebocoran framework ke core.** `@simpleui/core` tidak boleh
   mengimpor React, Vue, atau Angular.
8. **Semua yang dibuat harus bisa dibuang.** Listener, observer, timer,
   instance framework, dan DOM node wajib dibersihkan saat `dispose()`.
9. **Docs dan demo bagian dari DoD.** Fitur yang tidak terdokumentasi dianggap
   belum ada.
10. **Clean-room.** Tidak menyalin kode, aset, teks dokumentasi, atau trademark
    pihak ketiga.

---

## 5. Struktur folder yang direncanakan

```text
simpleUI/
├─ docs/                          # dokumen ini
├─ packages/
│  ├─ core/                       # @simpleui/core — runtime, data, i18n, security utils
│  ├─ theme/                      # @simpleui/theme — design token & CSS
│  ├─ icons/                      # @simpleui/icons — ikon SVG
│  ├─ datagrid/                   # @simpleui/datagrid
│  ├─ pivotgrid/                  # @simpleui/pivotgrid
│  ├─ charts/                     # @simpleui/charts
│  ├─ adapter-react/              # @simpleui/react
│  ├─ adapter-vue/                # @simpleui/vue
│  ├─ adapter-angular/            # @simpleui/angular (ng-packagr)
│  ├─ adapter-vanilla/            # @simpleui/vanilla (UMD + jQuery bridge)
│  ├─ testing/                    # @simpleui/testing — harness & payload corpus
│  └─ eslint-config/              # konfigurasi lint bersama
├─ apps/
│  ├─ docs/                       # documentation site + live examples
│  ├─ playground-react/
│  ├─ playground-vue/
│  ├─ playground-angular/
│  ├─ playground-vanilla/
│  └─ benchmarks/
├─ examples/                      # contoh integrasi per framework
├─ tools/                         # generator, script rilis, codemod
├─ .github/workflows/             # CI/CD
├─ package.json
├─ pnpm-workspace.yaml
└─ turbo.json
```

Struktur detail dan aturan dependency ada di
[01 — Arsitektur §4](01-arsitektur.md#4-package-dan-batas-dependensi).

---

## 6. Status saat ini

| Area                            | Status                               | Keterangan                                          |
| ------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Perencanaan produk & arsitektur | ✅ Selesai (draft v1.0)              | Dokumen ini                                         |
| Keputusan arsitektur            | ✅ 12 ADR Accepted                   | [adr/README](adr/README.md)                         |
| Dependency security             | ✅ 0 known vulnerability             | `pnpm audit` + workflow `security.yml` + Dependabot |
| Lisensi                         | ✅ Apache-2.0 + NOTICE + allowlist   | [ADR-0001](adr/0001-lisensi-apache-2.0.md), FND-025 |
| Nama & scope npm                | ✅ Nama diputuskan; verifikasi scope | `@simpleui/*`; cek registry (ADR-0002)              |
| Fondasi repo & tooling          | ✅ Grup A selesai (CI, lint, test)   | FND-001…FND-009 selesai                             |
| Theme & design token            | ✅ Light/dark/high-contrast, density | FND-010 selesai                                     |
| Core runtime                    | 🔄 Kernel selesai                    | FND-011 selesai; store/DOM/fokus menyusul           |
| DataGrid                        | ⬜ Belum mulai                       | DG-001…DG-090                                       |
| PivotGrid                       | ⬜ Belum mulai                       | PV-001…PV-029                                       |
| Chart                           | ⬜ Belum mulai                       | CH-001…CH-033                                       |

Legenda status: ✅ selesai · 🔄 berjalan · ⏳ menunggu keputusan · ⬜ belum mulai ·
⛔ blocked.

---

## 7. Keputusan arsitektur (Accepted)

Seluruh keputusan baseline sudah diputuskan pada **2026-11-23**. Detail,
alternatif, dan konsekuensi ada di masing-masing ADR. Perubahan keputusan wajib
melalui ADR baru yang menandai ADR lama sebagai `Superseded`.

| ID       | Keputusan                                 | Status   | ADR                                           |
| -------- | ----------------------------------------- | -------- | --------------------------------------------- |
| ADR-0001 | Lisensi Apache-2.0 + DCO                  | Accepted | [Buka](adr/0001-lisensi-apache-2.0.md)        |
| ADR-0002 | Nama `SimpleUI`, scope `@simpleui/*`      | Accepted | [Buka](adr/0002-nama-dan-scope-npm.md)        |
| ADR-0003 | jQuery bridge opsional, core tanpa jQuery | Accepted | [Buka](adr/0003-dukungan-jquery.md)           |
| ADR-0004 | DOM engine bersama + adapter tipis        | Accepted | [Buka](adr/0004-rendering-engine.md)          |
| ADR-0005 | Chart scene graph sendiri, SVG + Canvas   | Accepted | [Buka](adr/0005-chart-engine.md)              |
| ADR-0006 | Matriks dukungan N/N-1 major              | Accepted | [Buka](adr/0006-matriks-dukungan.md)          |
| ADR-0007 | Validator ringan internal                 | Accepted | [Buka](adr/0007-runtime-validation.md)        |
| ADR-0008 | Fixed version group                       | Accepted | [Buka](adr/0008-strategi-rilis.md)            |
| ADR-0009 | Vitest browser + Playwright               | Accepted | [Buka](adr/0009-infrastruktur-test.md)        |
| ADR-0010 | CSS layer + custom properties             | Accepted | [Buka](adr/0010-strategi-css.md)              |
| ADR-0011 | ESM-first + UMD untuk CDN                 | Accepted | [Buka](adr/0011-format-build.md)              |
| ADR-0012 | TypeScript 7 + tooling side-by-side       | Accepted | [Buka](adr/0012-typescript-7-side-by-side.md) |

**Verifikasi yang masih tersisa (bukan keputusan terbuka):**

- Ketersediaan scope `@simpleui` di npm dan trademark check — gate FND-009/
  FND-025 sebelum publikasi.
- Bukti performa virtualizer — spike DG-004.
- Bukti template bridge — spike DG-005.

Jika verifikasi gagal, keputusan tidak berubah diam-diam; amandemen ADR
diperlukan.

---

## 8. Matriks kompatibilitas target

| Dimensi               | Target minimum                                                                         | Diuji di CI               | Kebijakan               |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------- | ----------------------- |
| Browser               | Chrome/Edge 2 versi terakhir, Firefox 2 versi terakhir, Safari 16.4+, iOS Safari 16.4+ | Matriks Playwright        | Tidak ada IE            |
| Node.js (tooling/SSR) | Node 24 LTS                                                                            | Node 24 & 26              | Node 22 EOL April 2027  |
| TypeScript            | 5.4+                                                                                   | Versi minimum & terbaru   | `strict` wajib          |
| React                 | 18+                                                                                    | 18 & 19                   | Peer dependency longgar |
| Vue                   | 3.4+                                                                                   | 3.4 & 3.5+                | Vue 2 tidak didukung    |
| Angular               | 17+                                                                                    | 17 & versi stabil terbaru | Standalone component    |
| Bundler               | Vite 6.4+, webpack 5, esbuild 0.25+, Rollup 4                                          | Contoh integrasi          | ESM-first               |

Matriks ini ditinjau setiap rilis minor. Kenaikan minimum version = breaking
change untuk paket yang terdampak dan wajib ADR.

---

## 9. Cara memperbarui plan ini

1. Perubahan kecil (typo, klarifikasi): PR langsung, 1 reviewer.
2. Perubahan scope/estimasi/API: PR + update task list + perubahan
   [progress](10-tracking/progress.md) + 2 reviewer.
3. Perubahan arsitektur/keamanan: wajib ADR baru di `docs/adr/` dan persetujuan
   tech lead + security reviewer.
4. Jangan mengubah status task di lebih dari satu tempat. **Sumber kebenaran
   status adalah file `tasks.md`**; dashboard di-generate ulang dengan
   `node docs/10-tracking/tools/progress.mjs --write`.
5. Setiap PR yang menambah/menghapus task wajib menjalankan
   `node docs/10-tracking/tools/progress.mjs --check`.

---

## 10. Lisensi & kekayaan intelektual

- Kode SimpleUI memakai lisensi **Apache-2.0** (ADR-0001).
- Dilarang menyalin source code, aset visual, ikon, suara, teks dokumentasi,
  atau test fixture dari DevExtreme/DevExpress atau library komersial lain.
- Dilarang memakai nama, logo, atau trademark DevExtreme/DevExpress.
- Referensi perilaku harus berasal dari dokumentasi publik, observasi black-box
  yang sah, dan spesifikasi web standar (WAI-ARIA, HTML, CSS, ECMAScript).
- Dependency runtime wajib lolos license allowlist (MIT, Apache-2.0, BSD, ISC).
  GPL/AGPL/SSPL untuk runtime ditolak kecuali ada persetujuan legal tertulis.
- Setiap kontributor menandatangani **DCO** (`Signed-off-by`), bukan CLA.

---

## 11. Next actions

| #   | Aksi                                                    | Owner                   | Tenggat    | Status |
| --- | ------------------------------------------------------- | ----------------------- | ---------- | ------ |
| 1   | Review & setujui plan v1.0                              | Tech lead + stakeholder | 2026-11-28 | ⏳     |
| 2   | 11 ADR baseline                                         | Tech lead               | 2026-11-23 | ✅     |
| 3   | Verifikasi scope npm & trademark                        | Release Manager         | 2026-12-05 | ⬜     |
| 4   | Scaffold monorepo + TypeScript references (FND-001…003) | Core engineer           | 2026-11-23 | ✅     |
| 5   | Lint, Vitest, Playwright, CI (FND-004…FND-007)          | Core engineer + QA      | 2026-12-12 | ⬜     |
| 6   | Spike virtualizer & adapter bridge (DG-004, DG-005)     | Core + adapter engineer | 2027-01-08 | ⬜     |
| 7   | Kickoff DataGrid DG-0                                   | Seluruh tim             | 2027-01-11 | ⬜     |

---

_Dokumen ini hidup. Jika ada konflik antara dokumen ini dengan dokumen lain,
[00 — Rule Umum](00-rule-umum.md) menang untuk urusan aturan rekayasa, dan
[01 — Arsitektur](01-arsitektur.md) menang untuk urusan arsitektur._
