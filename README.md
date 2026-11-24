# SimpleUI

Library komponen UI enterprise yang framework-agnostic: **JavaScript,
TypeScript, React, Vue, dan Angular**.

> **Status:** fondasi — 13 dari 35 task P0 selesai (FND-001…FND-011,
> FND-024, FND-025). Tooling, CI, design token, dan kernel core sudah ada;
> komponen pertama (DataGrid) belum dimulai.
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
pnpm audit
```

Scaffold saat ini berisi:

- `packages/core` — seed runtime: `VERSION`, `isBrowser()`, `assertBrowser()`.
- `packages/theme` — design token lengkap, tema light/dark/high-contrast,
  density comfortable/compact/spacious, RTL via properti logis, dibangun
  dengan Lightning CSS.
- `packages/icons`, `datagrid`, `pivotgrid`, `charts` — placeholder.
- `packages/adapter-react|vue|angular|vanilla` — placeholder adapter.
- `packages/testing` — placeholder harness.
- `apps/docs` — situs dokumentasi Vite (Markdown tersanitasi + demo virtual list).
- `tools/clean.mjs`, `tools/build-theme.mjs`.
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

## Prinsip

- Satu implementasi perilaku, adapter tipis.
- Aman secara default (tanpa XSS/CSV injection, tanpa `eval`).
- Aksesibel (WCAG 2.2 AA).
- Cepat (100.000 baris, 60 fps) dengan budget terukur.
- API stabil, semver, dan terdokumentasi.
- Clean-room: tidak menyalin kode/aset/trademark pihak ketiga.

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
