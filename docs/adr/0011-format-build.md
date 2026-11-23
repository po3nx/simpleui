# ADR-0011 — Format Build: ESM-first + UMD untuk CDN

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Release Manager, Core Engineer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau saat 2.0

---

## 1. Konteks

Consumer SimpleUI terdiri dari:

- aplikasi modern dengan bundler (Vite, webpack, esbuild, Rollup);
- aplikasi legacy yang memuat script dari CDN;
- aplikasi Angular dengan `ng-packagr`;
- SSR/Node untuk import-safe testing.

Format build harus mendukung semuanya tanpa menggandakan kode atau merusak
tree-shaking.

---

## 2. Keputusan

> Kami memutuskan **ESM-first**, dengan **UMD hanya untuk paket yang membutuhkan
> CDN** (vanilla), dan **ng-packagr** untuk Angular.

Detail:

- Paket library mengirim **ESM** (`type: "module"`) + `.d.ts` + source map.
- `exports` map memuat subpath per komponen dan `types` sebelum `import`.
- **CJS tidak dipublikasikan** pada 1.0 kecuali ada kebutuhan consumer yang
  terbukti; penambahan CJS harus melalui ADR baru.
- UMD hanya untuk `@simpleui/vanilla` (global `SimpleUI`) dan dokumentasi CDN.
- Angular memakai partial Ivy compilation via `ng-packagr`.
- Target `ES2022`; tidak ada transpile ke ES5.
- `sideEffects` hanya untuk file CSS.
- API Extractor menghasilkan `.api.md`; `publint` + `arethetypeswrong`
  memvalidasi paket.
- Build deterministik: tidak ada timestamp, urutan modul stabil.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif | Kelebihan | Kekurangan | Alasan tidak dipilih |
|---|---|---|---|
| CJS-first | Kompatibel Node lama | Menghambat tree-shaking, warisan | Ditolak |
| Dual ESM + CJS | Kompatibilitas maksimal | Dua build, risiko dual-package hazard | Ditunda |
| ESM + UMD (vanilla) | Modern + CDN | Tidak ada `require()` | **Dipilih** |
| Bundle semua jadi satu | Mudah | Tidak tree-shakeable, besar | Ditolak |

---

## 4. Konsekuensi

### Positif

- Tree-shaking optimal; bundle consumer lebih kecil.
- Build lebih sederhana (satu format utama).
- CDN tetap didukung untuk vanilla.
- Angular mengikuti tooling resmi.

### Negatif / risiko

- Consumer CommonJS lama tidak bisa `require()` langsung.
- Perlu dokumentasi migrasi ke ESM.
- UMD hanya untuk sebagian paket.

### Mitigasi

- Dokumentasi "ESM-only" dan contoh bundler.
- Jika kebutuhan CJS terbukti, tambahkan lewat ADR + build terpisah.
- UMD diuji di CDN dan aplikasi tanpa bundler.

---

## 5. Keamanan dan privasi

- Build deterministik + lockfile + provenance.
- Tidak ada install script; `ignore-scripts=true`.
- Source map tidak memuat source sensitif.
- Artefak diverifikasi (`npm pack`, hash) sebelum publish.
- Tidak ada dynamic `import()` ke URL eksternal.

---

## 6. Kompatibilitas dan migrasi

- Import path adalah kontrak; subpath stabil.
- Perubahan format build (mis. menambah CJS) bukan breaking, tetapi harus
  diumumkan.
- Angular peer dependency mengikuti ADR-0006.
- Consumer Node ESM dapat mengimpor paket; Node CJS memerlukan dynamic import.

---

## 7. Implementasi

| Item | Detail |
|---|---|
| Vite library mode | FND-009 |
| UMD | adapter vanilla, DG-053 |
| ng-packagr | adapter Angular, DG-052 |
| API report | FND-029 |
| Publint/ATTW | FND-009 |
| Target | Sebelum DG-2 |

---

## 8. Referensi

- [Build & Release](../07-build-release.md)
- [Adapter §10](../02-adapter-cross-framework.md#10-versioning-dan-peer-dependency)
- [Node.js ESM](https://nodejs.org/api/esm.html)

---

## Catatan review

| Tanggal | Reviewer | Keputusan | Catatan |
|---|---|---|---|
| 2026-11-23 | Tech Lead | Setuju | ESM-first |
| 2026-11-23 | Release Manager | Setuju | CJS ditunda |
| 2026-11-23 | Core Engineer | Setuju | UMD hanya vanilla |
