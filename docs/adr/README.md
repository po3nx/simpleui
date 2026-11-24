# Architecture Decision Records (ADR)

> **Status:** Index · **Owner:** Tech Lead · **Terakhir diperbarui:** 2026-11-24
> **Template:** [ADR template](../11-templates/adr-template.md)
> **Aturan:** setiap keputusan arsitektur, keamanan, API, atau tooling yang
> berdampak lintas paket wajib punya ADR. ADR disimpan sebagai
> `docs/adr/NNNN-judul-singkat.md`.

---

## 1. Kapan membuat ADR

Buat ADR jika keputusan:

- mengubah arah dependency antar package;
- menambah/mengganti dependency runtime;
- mengubah public API atau format build;
- mengubah strategi keamanan, penyimpanan, atau jaringan;
- memilih library/engine (chart, renderer, validator);
- menunda atau membatalkan fitur yang sudah direncanakan;
- melanggar aturan `WAJIB` di [Rule Umum](../00-rule-umum.md).

Tidak perlu ADR untuk: perbaikan bug, refactor internal, penambahan test,
perubahan dokumentasi biasa.

---

## 2. Status ADR

| Status       | Arti                          |
| ------------ | ----------------------------- |
| `Proposed`   | Sedang dibahas, belum berlaku |
| `Accepted`   | Disetujui dan berlaku         |
| `Superseded` | Digantikan ADR lain           |
| `Deprecated` | Tidak lagi relevan            |
| `Rejected`   | Ditolak, alasan dicatat       |

---

## 3. Daftar ADR

| ID                                            | Judul                  | Keputusan                          | Status   | Tanggal    |
| --------------------------------------------- | ---------------------- | ---------------------------------- | -------- | ---------- |
| [ADR-0001](0001-lisensi-apache-2.0.md)        | Lisensi proyek         | Apache-2.0 + DCO                   | Accepted | 2026-11-23 |
| [ADR-0002](0002-nama-dan-scope-npm.md)        | Nama & scope npm       | `SimpleUI`, `@simpleui/*`          | Accepted | 2026-11-23 |
| [ADR-0003](0003-dukungan-jquery.md)           | Dukungan jQuery        | Bridge opsional, core tanpa jQuery | Accepted | 2026-11-23 |
| [ADR-0004](0004-rendering-engine.md)          | Rendering engine       | DOM bersama + adapter tipis        | Accepted | 2026-11-23 |
| [ADR-0005](0005-chart-engine.md)              | Chart engine           | Scene graph sendiri, SVG + Canvas  | Accepted | 2026-11-23 |
| [ADR-0006](0006-matriks-dukungan.md)          | Matriks dukungan       | N/N-1 major, browser modern        | Accepted | 2026-11-23 |
| [ADR-0007](0007-runtime-validation.md)        | Runtime validation     | Validator ringan internal          | Accepted | 2026-11-23 |
| [ADR-0008](0008-strategi-rilis.md)            | Strategi rilis         | Fixed version group                | Accepted | 2026-11-23 |
| [ADR-0009](0009-infrastruktur-test.md)        | Infrastruktur test     | Vitest browser + Playwright        | Accepted | 2026-11-23 |
| [ADR-0010](0010-strategi-css.md)              | Strategi CSS           | Layer + custom properties          | Accepted | 2026-11-23 |
| [ADR-0011](0011-format-build.md)              | Format build           | ESM-first + UMD untuk CDN          | Accepted | 2026-11-23 |
| [ADR-0012](0012-typescript-7-side-by-side.md) | TypeScript 7 & tooling | Build TS 7, lint TS 5.9 sementara  | Accepted | 2026-11-24 |

Semua ADR di atas berstatus **Accepted** dan menjadi baseline implementasi.
Perubahan keputusan wajib melalui ADR baru yang menandai ADR lama sebagai
`Superseded`.

**Verifikasi 2026-11-23:** `npm view @simpleui/core version` → `E404` (paket
belum ada di registry publik). Ini bukan bukti kepemilikan scope; verifikasi
kepemilikan tetap menjadi gate FND-009 sebelum publikasi.

### Ringkasan dampak

| Area                 | Keputusan utama                                              |
| -------------------- | ------------------------------------------------------------ |
| Lisensi & distribusi | Apache-2.0, DCO, NOTICE                                      |
| Identitas paket      | `@simpleui/*`, subpath per komponen                          |
| Arsitektur           | Core DOM bersama; adapter tipis; template bridge             |
| Visualisasi          | Scene graph internal; SVG default; Canvas untuk data besar   |
| Kompatibilitas       | React 18+, Vue 3.4+, Angular 17+, browser modern             |
| Kualitas             | Validator internal; Vitest browser; Playwright; axe; Stryker |
| Tampilan             | CSS layer; token; tanpa CSS-in-JS                            |
| Build                | ESM-first; UMD hanya vanilla; ng-packagr untuk Angular       |

---

## 4. Format file

```text
docs/adr/
├─ README.md
├─ 0001-lisensi.md
├─ 0002-nama-dan-scope-npm.md
└─ ...
```

Aturan penamaan: `NNNN-kebab-case.md`, nomor tidak dipakai ulang.

---

## 5. Proses

1. Salin template ke `docs/adr/NNNN-judul.md`.
2. Isi konteks, keputusan, alternatif, konsekuensi, keamanan.
3. Buka PR; label `adr`.
4. Review minimal: tech lead + 1 reviewer (security untuk topik keamanan).
5. Setelah disetujui: ubah status `Accepted`, merge, tautkan dari dokumen
   terkait.
6. Jika diganti: tandai `Superseded by ADR-XXXX`, jangan hapus.

---

## 6. Hubungan dengan dokumen lain

- [Rule Umum](../00-rule-umum.md) — aturan yang dapat dikecualikan lewat ADR.
- [Arsitektur](../01-arsitektur.md) — ringkasan keputusan.
- [Roadmap](../08-roadmap.md) — milestone ADR.
- [PR checklist](../11-templates/pr-checklist.md) — pengecekan ADR.

---

_ADR adalah jejak keputusan, bukan dokumentasi desain lengkap. Untuk detail
teknis, tautkan ke dokumen arsitektur/komponen._
