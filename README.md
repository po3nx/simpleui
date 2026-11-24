# SimpleUI

Library komponen UI enterprise yang framework-agnostic: **JavaScript,
TypeScript, React, Vue, dan Angular**.

> **Status:** fondasi — scaffold monorepo selesai (FND-001/002/003).
> Belum ada komponen yang diimplementasikan.
> **Mulai implementasi:** Phase 0 — 1 Desember 2026.
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
- `packages/theme` — token CSS light/dark/density.
- `packages/icons`, `datagrid`, `pivotgrid`, `charts` — placeholder.
- `packages/adapter-react|vue|angular|vanilla` — placeholder adapter.
- `packages/testing` — placeholder harness.
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
> `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (8 unit test),
> `pnpm test:browser` (1 test di Chromium), `pnpm test:e2e` (2 test),
> dan `pnpm audit` (0 known vulnerabilities).

### Troubleshooting pnpm di Windows

Jika setelah `npm install -g pnpm@12.21.0` muncul:

```text
'"...\node_modules\pnpm\pnpm"' is not recognized
```

postinstall pnpm diblokir oleh kebijakan npm. Perbaiki dengan:

```powershell
npm config set allow-scripts=pnpm --location=user
npm rebuild -g pnpm --allow-scripts=pnpm
pnpm -v
```

Shim `pnpm.cmd` yang benar akan menunjuk ke `node_modules\pnpm\pnpm.exe`.

### Jika satu tarball timeout karena proxy

Jika registry dapat diakses dari browser tetapi `pnpm` timeout, unduh tarball
yang gagal lalu masukkan ke store:

```powershell
pnpm store add "D:\Users\<user>\Downloads\common-22.3.0.tgz" --store-dir "D:\.pnpm-store"
pnpm install --prefer-offline
```

Versi tarball harus sama dengan yang diminta lockfile. Contoh di atas untuk
`@angular/common@22.3.0`.

### Jika muncul ERR_PNPM_IGNORED_BUILDS

Project memakai `ignore-scripts=true`; build script yang diperlukan harus
disetujui eksplisit. Untuk esbuild:

```powershell
pnpm approve-builds esbuild
pnpm install
```

Persetujuan dicatat di `pnpm-workspace.yaml` sebagai `allowBuilds`.

## Dokumentasi

Seluruh plan, aturan rekayasa, arsitektur, dan tracking ada di
[`docs/`](docs/README.md).

Mulai dari:

1. [Rule Umum](docs/00-rule-umum.md) — kontrak clean code, security, testing.
2. [Arsitektur](docs/01-arsitektur.md) — core + adapter lintas framework.
3. [Roadmap](docs/08-roadmap.md) — fase dan milestone.
4. [Estimasi](docs/09-estimasi.md) — berapa lama dan skenario tim.
5. [DataGrid](docs/components/datagrid/README.md) — komponen prioritas #1.
6. [Tracking](docs/10-tracking/README.md) — cara update progress.

## Ringkasan estimasi

| Tonggak                          | Tim 5–6 orang |
| -------------------------------- | ------------- |
| DataGrid MVP                     | 4–5 bulan     |
| DataGrid GA                      | 8–9 bulan     |
| DataGrid + PivotGrid + Charts GA | 14–16 bulan   |
| Parity penuh ±100 widget         | 30–36 bulan   |

Angka adalah rough order of magnitude, bukan komitmen. Detail asumsi ada di
[estimasi](docs/09-estimasi.md).

## Struktur yang direncanakan

```text
simpleUI/
├─ docs/          # plan & handbook (sekarang)
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

**Apache-2.0** (ADR-0001). Lihat [ADR index](docs/adr/README.md).

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

## Langkah berikutnya

1. Review plan v1.0 dan 12 ADR (status per 2026-11-24).
2. Verifikasi scope npm `@simpleui` dan trademark sebelum publikasi.
3. Fondasi repo & tooling selesai (FND-001…FND-009); lanjut fondasi produk:
   FND-025 (LICENSE/NOTICE) lalu FND-010 (design token) dan FND-011 (kernel).
4. Spike `DG-004` (virtualizer) dan `DG-005` (adapter bridge).

Progress: `node docs/10-tracking/tools/progress.mjs`.
