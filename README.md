# SimpleUI

Library komponen UI enterprise yang framework-agnostic: **JavaScript,
TypeScript, React, Vue, dan Angular**.

> **Status:** fondasi — 34 dari 35 task selesai; 1 BLOCKED (API Extractor,
> menunggu TypeScript 7.1). Runtime inti, tema, keamanan, data layer, virtualizer,
> harness test, situs dokumentasi, dan benchmark sudah berjalan; komponen
> pertama (DataGrid) belum dimulai.
> **Mulai implementasi:** Phase 0 dimulai 2026-11-23 — lebih awal dari target
> roadmap 2026-12-01.
> **Komponen pertama:** DataGrid.

## Quick start

Prasyarat: **Node.js 24+** (disarankan **Node 26 LTS**) dan **pnpm 12+**.

```bash
npm install -g pnpm@12.21.0
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm size
pnpm audit
```

Isi repositori saat ini:

- `packages/core` — runtime: kernel lifecycle, state/selector/scheduler, DOM
  utils, a11y (focus, roving tabindex, announcer), layout service, i18n,
  template bridge, data layer (`ArrayStore`, `CustomStore`, `CachedStore`,
  query pipeline), virtualizer, dan utilitas keamanan (`safeMerge`, `safeUrl`,
  `sanitizeHtml`, CSV guard).
- `packages/theme` — design token lengkap, tema light/dark/high-contrast,
  density comfortable/compact/spacious, RTL via properti logis, dibangun
  dengan Lightning CSS.
- `packages/adapter-react|vue|angular|vanilla` — bridge lifecycle
  `mount`/`update`/`unmount` (kontrak adapter dan playground diuji di Chromium).
- `packages/testing` — fixture deterministik (seeded random) dan kontrak
  adapter untuk parity test.
- `packages/datagrid` — model & data DG-1: normalisasi opsi/kolom, state
  store, DataController, filter/sort/paging, selection, fokus, key identity,
  error handling, grouping, summary, persistensi state, dan UI
  header/filter/search/pager/selection/keyboard/column chooser/CSV export; renderer
  menyusul DG-2.
- `packages/icons`, `pivotgrid`, `charts` — placeholder.
- `apps/docs` — situs dokumentasi Vite (Markdown tersanitasi + demo virtual list).
- `apps/benchmarks` — harness benchmark + baseline per lingkungan (`pnpm bench`).
- Budget ukuran bundle dijaga `size-limit` (`.size-limit.mjs`).
- `tools/` — build tema, validasi paket/lisensi, SBOM, release smoke, DCO,
  server docs, dan utilitas workspace.
- Turborepo, TypeScript project references, dan pnpm workspace.
- Vitest workspace: unit di Node, test DOM di Chromium nyata (browser mode).
- Changesets dengan fixed version group untuk seluruh paket library
  (ADR-0008); alur rilis di [`.changeset/README.md`](.changeset/README.md).

Script test:

| Perintah             | Cakupan                                              |
| -------------------- | ---------------------------------------------------- |
| `pnpm test`          | unit test per paket lewat Turbo (cacheable, gate PR) |
| `pnpm test:coverage` | semua proyek + laporan coverage agregat              |
| `pnpm test:browser`  | hanya test DOM di Chromium                           |
| `pnpm test:e2e`      | E2E Playwright di Chromium (gate PR)                 |
| `pnpm test:e2e:all`  | E2E Chromium + Firefox + WebKit (nightly)            |
| `pnpm check:package` | publint + arethetypeswrong untuk semua paket         |

Test browser dan E2E membutuhkan browser Playwright:

```bash
pnpm exec playwright install chromium firefox webkit
```

Jika browser disimpan di dalam workspace (mis. lingkungan sandbox), tambahkan
`PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers` saat menjalankan test.

> Catatan: Node 22 tidak dijadikan baseline karena masa dukungannya berakhir
> April 2027. Node 26 adalah LTS saat ini; minimum tooling ditetapkan Node 24.
> **Sudah diverifikasi:** Node 26.13.0 + pnpm 12.21.0, `pnpm install`,
> `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (unit + coverage,
> gate core 90/85), `pnpm test:browser` (Chromium), `pnpm test:e2e`,
> dan `pnpm audit` (0 known vulnerabilities).

## Dokumentasi

Plan produk, ADR, handbook rekayasa, dan tracking task dikelola di repositori
privat terpisah dan tidak dipublikasikan. Repositori ini memuat kode library,
lisensi, dan README paket.

## Struktur yang direncanakan

```text
simpleUI/
├─ packages/      # core, komponen, adapter
├─ apps/          # docs site, playground, benchmark
├─ examples/      # integrasi per framework
└─ tools/         # generator, rilis, codemod
```

## Dukungan

| Area       | Status                                                                          |
| ---------- | ------------------------------------------------------------------------------- |
| Browser    | Chromium, Firefox, WebKit — E2E nightly di ketiganya                            |
| Node.js    | 24 dan 26 (build + test)                                                        |
| Framework  | vanilla, React 19, Vue 3.5 (bridge lifecycle tahap spike); Angular direncanakan |
| OS         | Linux (CI utama), macOS dan Windows (smoke nightly)                             |
| TypeScript | build paket memakai TypeScript 7; typescript-eslint sementara memakai 5.9       |

Matriks ini diperbarui saat cakupan uji berubah; klaim tanpa test tidak
dicantumkan.

## Prinsip

- Satu implementasi perilaku, adapter tipis.
- Aman secara default (tanpa XSS/CSV injection, tanpa `eval`).
- Aksesibel (WCAG 2.2 AA).
- Cepat (100.000 baris, 60 fps) dengan budget terukur.
- API stabil, semver, dan terdokumentasi.
- Clean-room: tidak menyalin kode/aset/trademark pihak ketiga.

## Berkontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk lingkungan pengembangan, alur PR,
DCO, changeset, dan standar test. Kerentanan dilaporkan secara privat sesuai
[SECURITY.md](SECURITY.md).

## Lisensi

**Apache-2.0**. Teks lengkap ada di [LICENSE](LICENSE).

## Keamanan

Kebijakan pelaporan dan disclosure ada di [SECURITY.md](SECURITY.md).

```bash
pnpm audit          # gate high/critical
pnpm audit:prod     # dependency produksi
pnpm audit:all      # laporan lengkap
```

Audit berjalan otomatis di [security workflow](.github/workflows/security.yml)
pada setiap PR, push ke `main`, dan jadwal mingguan. Dependabot membuka PR
update dependency setiap Senin.

Kebijakan update dependency:

- **patch/minor** — di-merge otomatis setelah check `Gate` hijau
  ([dependabot-auto-merge.yml](.github/workflows/dependabot-auto-merge.yml)).
- **major** — dibiarkan terbuka untuk review manual karena dapat mengubah
  baseline toolchain.
- Lisensi dependency divalidasi oleh `pnpm check:license`.

## Status

Fondasi library sedang dibangun: tooling, CI, design token, dan core runtime
sudah tersedia. Komponen pertama (DataGrid) belum dimulai. Detail perencanaan
internal tidak dipublikasikan.
