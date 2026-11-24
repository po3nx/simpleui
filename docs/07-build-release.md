# 07 — Build, Packaging, dan Release

> **Status:** Draft v1.0 · **Owner:** Release Manager · **Reviewer:** Tech Lead
> **Prasyarat:** [01 — Arsitektur](01-arsitektur.md) · [05 — Security §10–11](05-security.md#10-supply-chain)

---

## 1. Toolchain

| Kebutuhan              | Pilihan                             | Catatan                            |
| ---------------------- | ----------------------------------- | ---------------------------------- |
| Package manager        | **pnpm** via Corepack               | Workspace, lockfile ketat          |
| Monorepo orchestration | **Turborepo**                       | Cache remote opsional              |
| Bahasa                 | **TypeScript 7.x** strict           | Project references                 |
| Bundler library        | **Vite** (library mode) + Rollup    | ESM + UMD                          |
| Angular library        | **ng-packagr**                      | Partial Ivy                        |
| CSS                    | **Lightning CSS** + PostCSS minimal | `@layer`, nesting                  |
| Test                   | Vitest + Playwright                 | Lihat [04](04-testing-strategy.md) |
| Lint                   | ESLint flat config + Prettier       | `typescript-eslint` strict         |
| API report             | **API Extractor**                   | `.api.md`                          |
| Release                | **Changesets**                      | Fixed group                        |
| Size                   | **size-limit**                      | Budget per paket                   |
| SBOM                   | CycloneDX                           | Setiap rilis                       |

Versi Node dan pnpm dikunci di `package.json` (`engines`, `packageManager`) dan
`.nvmrc`. CI memakai versi yang sama.

> TypeScript 7 memakai compiler native yang belum menyediakan Compiler API
> sampai 7.1. Karena itu `typescript-eslint` berjalan di TypeScript 5.9.x
> (hasil resolusi peer), aturan lint type-aware ditunda, dan FND-029
> (API Extractor) menunggu. Detail keputusan ada di
> [ADR-0012](adr/0012-typescript-7-side-by-side.md).

---

## 2. Struktur workspace

```text
simpleUI/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ .npmrc
├─ .nvmrc
├─ eslint.config.js
├─ .changeset/
├─ packages/
│  ├─ core/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ vite.config.ts
│  │  └─ src/
│  ├─ datagrid/
│  ├─ pivotgrid/
│  ├─ charts/
│  ├─ adapter-react/
│  ├─ adapter-vue/
│  ├─ adapter-angular/
│  ├─ adapter-vanilla/
│  ├─ theme/
│  ├─ icons/
│  └─ testing/
├─ apps/
│  ├─ docs/
│  ├─ playground-react/
│  ├─ playground-vue/
│  ├─ playground-angular/
│  ├─ playground-vanilla/
│  └─ benchmarks/
└─ examples/
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'examples/*'

allowBuilds:
  esbuild: true

catalog:
  typescript: ^5.7.2
  vite: ^8.3.8
  vitest: ^5.1.1
```

`.npmrc`:

```ini
ignore-scripts=true
save-exact=true
strict-peer-dependencies=false
auto-install-peers=true
```

`ignore-scripts=true` memblokir seluruh lifecycle script. Build script yang
terbukti diperlukan harus disetujui eksplisit melalui `pnpm approve-builds`
dan dicatat di `allowBuilds` (saat ini hanya `esbuild`, dibutuhkan Vite/Vitest).

---

## 3. Output build

### 3.1 Paket library (core, komponen, adapter non-Angular)

```text
dist/
├─ index.js          # ESM
├─ index.d.ts        # deklarasi
├─ index.d.ts.map
├─ index.js.map
├─ styles.css        # jika ada
└─ simpleui.umd.js   # hanya paket vanilla/CDN
```

- `format`: `es` utama; `umd` hanya untuk paket yang memang untuk CDN.
- `target`: `es2022`.
- `sourcemap`: `true`.
- `minify`: hanya untuk UMD/CDN; ESM diserahkan ke bundler consumer.
- `external`: peer dependencies (React, Vue, Angular) dan `@simpleui/core`
  untuk paket komponen.
- **DILARANG** membundel framework ke dalam adapter.

### 3.2 Angular

- `ng-packagr` menghasilkan partial Ivy compilation.
- Setiap komponen Angular adalah standalone component.
- `peerDependencies`: `@angular/core`, `@angular/common` dengan range.
- Tidak ada `preserveWhitespaces` yang mengubah layout.
- Build diuji dengan `ng build` di playground Angular.

### 3.3 Export map

```json
{
  "name": "@simpleui/react",
  "version": "0.0.0",
  "license": "Apache-2.0",
  "type": "module",
  "sideEffects": ["*.css"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./datagrid": {
      "types": "./dist/datagrid.d.ts",
      "import": "./dist/datagrid.js"
    },
    "./pivotgrid": {
      "types": "./dist/pivotgrid.d.ts",
      "import": "./dist/pivotgrid.js"
    },
    "./charts": {
      "types": "./dist/charts.d.ts",
      "import": "./dist/charts.js"
    },
    "./styles.css": "./dist/styles.css"
  }
}
```

Aturan:

- **WAJIB** subpath per komponen agar consumer tidak menarik semua komponen.
- **DILARANG** deep import ke `dist/internal/*`.
- `types` harus muncul sebelum `import` di exports.
- Divalidasi dengan `publint` dan `arethetypeswrong`.
- CI menjalankan `pnpm check:package` memakai profil `esm-only`, karena
  ADR-0011 memutuskan CJS tidak dipublikasikan pada 1.0.

### 3.4 Deklarasi tipe

- Dihasilkan oleh `tsc` atau `rollup-plugin-dts`.
- `declarationMap: true`.
- Public API hanya dari `src/index.ts` dan entry subpath.
- Simbol `@internal` di-strip dari `.d.ts` bila memungkinkan.
- API Extractor menghasilkan `.api.md`; perubahan wajib di-review.

---

## 4. Build pipeline

```text
pnpm install --frozen-lockfile
  → pnpm lint
  → pnpm typecheck
  → pnpm test:unit
  → pnpm build
  → pnpm test:browser
  → pnpm test:contract
  → pnpm test:a11y
  → pnpm test:security
  → pnpm size
  → pnpm api:check
  → pnpm license
```

- Turborepo meng-cache `build`, `lint`, `test` berdasarkan input hash.
- Build harus deterministik: tidak ada timestamp di bundle, urutan modul stabil.
- Build gagal jika ada `any` di public API, API report berubah, atau budget
  terlampaui.

---

## 5. CI/CD

### 5.1 GitHub Actions

| Workflow                | Trigger            | Isi                                                                                            |
| ----------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `ci.yml`                | PR, push ke main   | lint, typecheck, unit, browser (chromium), contract, a11y, security, build, size, api, license |
| `security.yml`          | PR, push, mingguan | `pnpm audit` high/critical, audit produksi, artifact laporan                                   |
| `nightly.yml`           | jadwal harian      | e2e 3 browser, visual semua tema, perf, mutation, SSR, audit                                   |
| `release.yml`           | tag `v*`           | build, test penuh, publish npm + provenance, SBOM, docs deploy, CDN                            |
| `codeql.yml`            | PR + jadwal        | analisis keamanan statis                                                                       |
| `dependency-review.yml` | PR                 | review dependency baru                                                                         |

Aturan:

- Permission workflow minimal (`contents: read`, `id-token: write` hanya untuk
  publish).
- Action pihak ketiga di-pin ke commit SHA sebelum rilis 1.0. Scaffold awal
  masih memakai tag mayor (`@v4`) dan wajib diganti pada FND-007.
- Cache pnpm store dan Turbo cache.
- Concurrency group per branch; cancel run lama.
- Tidak ada secret di log; `set -x` dilarang di step yang menyentuh token.

### 5.2 Matrix

| Dimensi    | Nilai                                      |
| ---------- | ------------------------------------------ |
| OS         | Ubuntu, Windows (smoke)                    |
| Node       | 22, 24                                     |
| Browser    | Chromium (PR), + Firefox, WebKit (nightly) |
| React      | 18, 19                                     |
| Vue        | 3.4, 3.5+                                  |
| Angular    | 17, versi stabil terbaru                   |
| TypeScript | minimum, terbaru                           |

Matrix penuh di nightly; PR memakai subset cepat.

### 5.3 Gate wajib

- [ ] Lint & typecheck.
- [ ] Unit + browser + contract.
- [ ] Coverage tidak turun.
- [ ] axe 0 serious/critical.
- [ ] Security payload lulus.
- [ ] Bundle size ≤ budget.
- [ ] API report tidak berubah tanpa approval.
- [ ] License check.
- [ ] Build sukses di Node minimum.

---

## 6. Versioning dan Changesets

- Semua paket dalam **fixed group**; versi selalu sama.
- Perubahan consumer-facing wajib changeset:
  - `patch`: bugfix, docs, internal.
  - `minor`: fitur baru backward-compatible.
  - `major`: breaking change.
- Sebelum 1.0: `0.x`; breaking change tetap dicatat jelas.
- Changelog ditulis untuk consumer: apa yang berubah, cara migrasi, issue terkait.
- Changeset di-review; tidak boleh kosong untuk PR fitur.

Alur rilis:

```text
PR dengan changeset → merge ke main
  → Changesets bot membuka "Version Packages" PR
  → review & merge
  → tag vX.Y.Z
  → release.yml: build, test, publish, SBOM, docs, CDN
```

---

## 7. Publikasi

- Registry: npm publik (`@simpleui/*`), akses `public`.
- Publish dengan `--provenance` dan OIDC trusted publishing.
- **DILARANG** token npm long-lived di repository.
- Urutan publish: `core` → `theme`/`icons` → komponen → adapter.
- Setelah publish: install dari registry di app bersih untuk smoke test.
- CDN: unggah UMD + CSS + source map + hash ke storage; purging cache.
- Docs: deploy ke URL tetap; versi docs per minor.

### 7.1 Artefak

| Artefak     | Isi                                         |
| ----------- | ------------------------------------------- |
| npm tarball | `dist`, `README`, `LICENSE`, `package.json` |
| SBOM        | CycloneDX JSON                              |
| API report  | `.api.md` per paket                         |
| Source map  | Untuk debugging, tanpa source sensitif      |
| Checksum    | SHA-256 untuk CDN                           |

### 7.2 Rollback

- Jika rilis bermasalah: `npm deprecate` versi tersebut, publish patch.
- **DILARANG** menghapus versi yang sudah dipakai (kecuali alasan keamanan
  kritis; tetap publish patch).
- Docs di-rollback ke tag sebelumnya.
- CDN di-rollback ke artefak sebelumnya.

---

## 8. Dukungan versi

| Aspek            | Kebijakan                                        |
| ---------------- | ------------------------------------------------ |
| Major terbaru    | Didukung penuh                                   |
| Major sebelumnya | Patch keamanan selama 6 bulan setelah major baru |
| Major lebih lama | Tidak didukung                                   |
| Framework        | N dan N-1 major yang didukung framework          |
| Browser          | 2 versi terakhir + Safari 16.4+                  |
| Node (tooling)   | 24 LTS dan 26                                    |

---

## 9. Dokumentasi

- Docs site di `apps/docs`, dibangun dari Markdown + examples.
- Setiap halaman API di-generate dari TSDoc/API report.
- Contoh kode per framework diuji lewat typecheck.
- Versi docs disimpan per minor; ada banner "versi lama".
- Pencarian, dark mode, dan navigasi keyboard.
- **DILARANG** menampilkan contoh yang tidak dapat dijalankan.

---

## 10. Observability rilis

- Build metadata: commit SHA, versi, tanggal, builder.
- Error boundary di docs/playground untuk menangkap error runtime.
- Tidak ada telemetry dari library; metrics hanya dari CI dan docs (opt-in).
- Post-release checklist:
  - [ ] npm install bersih.
  - [ ] CDN load.
  - [ ] Docs deploy.
  - [ ] Smoke test 4 adapter.
  - [ ] SBOM tersedia.
  - [ ] Changelog benar.

---

## 11. Checklist rilis 1.0

- [ ] Semua gate CI hijau.
- [ ] API report disetujui.
- [ ] Security review selesai.
- [ ] A11y manual pass.
- [ ] Performance budget terpenuhi.
- [ ] Docs lengkap untuk semua fitur GA.
- [ ] Migration guide (jika ada).
- [ ] SBOM + provenance.
- [ ] Lisensi & NOTICE.
- [ ] Rilis diumumkan + changelog.

---

_Untuk jadwal dan dependency rilis, lihat [08 — Roadmap](08-roadmap.md)._
