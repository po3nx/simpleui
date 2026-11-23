# ADR-0002 — Nama Produk dan Scope npm

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Stakeholder, Release Manager
> **Menggantikan:** — · **Berlaku sampai:** ditinjau sebelum publikasi 1.0

---

## 1. Konteks

Proyek membutuhkan nama produk, nama paket, dan scope npm yang:

- mudah diingat dan tidak menabrak trademark pihak ketiga;
- memungkinkan sub-paket per komponen dan adapter;
- aman dari typosquatting;
- konsisten di dokumentasi, import, dan CDN.

Nama "SimpleUI" berasal dari nama folder proyek dan bersifat sementara sampai
diverifikasi.

---

## 2. Keputusan

> Kami memutuskan nama produk **SimpleUI** dan scope npm **`@simpleui/*`**.

Detail:

- Paket publik memakai scope `@simpleui/*`; root repository bersifat private
  workspace dan tidak dipublikasikan.
- Nama paket mengikuti pola yang sudah ditetapkan:

| Paket | Nama |
|---|---|
| Core | `@simpleui/core` |
| Tema | `@simpleui/theme` |
| Ikon | `@simpleui/icons` |
| DataGrid | `@simpleui/datagrid` |
| PivotGrid | `@simpleui/pivotgrid` |
| Charts | `@simpleui/charts` |
| React | `@simpleui/react` |
| Vue | `@simpleui/vue` |
| Angular | `@simpleui/angular` |
| Vanilla/jQuery | `@simpleui/vanilla` |
| Testing | `@simpleui/testing` |

- Nama `simpleui` (unscoped) **tidak** dipakai untuk paket publik utama;
  jika tersedia, hanya sebagai paket meta opsional.
- Nama yang mengandung "DevExtreme", "DevExpress", atau merek pihak ketiga
  **DILARANG**.
- Sebelum publikasi pertama, Release Manager wajib memverifikasi:
  - kepemilikan scope `@simpleui` di npm;
  - tidak ada trademark terdaftar yang menghalangi di yurisdiksi target;
  - tidak ada paket populer dengan nama membingungkan.

Jika scope `@simpleui` tidak tersedia, perubahan nama wajib melalui **amandemen
ADR ini**, bukan keputusan diam-diam.

**Verifikasi awal 2026-11-23:** `npm view @simpleui/core version` menghasilkan
`E404` — paket belum ada di registry publik. Ini menunjukkan nama belum dipakai
untuk paket tersebut, tetapi **bukan** bukti kepemilikan scope; verifikasi
kepemilikan tetap dilakukan saat akun/org npm tersedia (FND-009).

---

## 3. Alternatif yang dipertimbangkan

| Alternatif | Kelebihan | Kekurangan | Alasan tidak dipilih |
|---|---|---|---|
| `simpleui` unscoped | Mudah diingat | Kemungkinan sudah dipakai; sulit multi-paket | Scope lebih aman |
| `@simpleui/*` | Rapi, sesuai produk | Perlu verifikasi kepemilikan | **Dipilih** |
| `@simpleui-ui/*` | Cadangan jika scope utama tidak tersedia | Kurang elegan | Hanya fallback darurat |
| Nama netral (`@acme/ui`) | Fleksibel | Tidak ada identitas produk | Ditunda |

---

## 4. Konsekuensi

### Positif

- Semua paket berada di bawah satu scope; konsumen mudah menemukan.
- Nama komponen dan adapter konsisten.
- Tidak mencampur merek pihak ketiga.

### Negatif / risiko

- Scope mungkin sudah dimiliki pihak lain.
- Nama "SimpleUI" mungkin sudah dipakai produk lain.
- Biaya rebranding jika verifikasi gagal.

### Mitigasi

- Verifikasi dilakukan **sebelum** FND-009 (export map) dan sebelum publikasi.
- Semua import dipusatkan di dokumentasi; rebranding dapat dilakukan dengan
  codemod.
- Nama internal di kode memakai `SimpleUI`/`sui`, bukan nama paket.

---

## 5. Keamanan dan privasi

- Scope npm dilindungi 2FA organisasi dan trusted publishing (OIDC).
- Nama paket mirip (typosquatting) dipantau; dokumentasi selalu memakai scope
  lengkap.
- Tidak ada data pengguna yang dikirim ke registry selain metadata paket.
- Publikasi memakai provenance dan review dua orang.

---

## 6. Kompatibilitas dan migrasi

- Rename paket = breaking change; hanya boleh sebelum 1.0 atau di major baru.
- Import path di dokumentasi adalah kontrak; perubahan harus disertai codemod.
- Nama CSS prefix `sui-` dan token `--sui-*` tidak berubah meskipun paket
  di-rename, kecuali ada ADR baru.

---

## 7. Implementasi

| Item | Detail |
|---|---|
| Cek npm | `npm view @simpleui/core` → E404 pada 2026-11-23 (belum ada paket) |
| Cek trademark | Database trademark + pencarian publik |
| Task | FND-001, FND-009, FND-024, FND-025 |
| Target | Verifikasi kepemilikan sebelum 2026-12-19; publikasi 1.0 |

---

## 8. Referensi

- [Struktur package](../01-arsitektur.md#4-package-dan-batas-dependensi)
- [Build & Release](../07-build-release.md)
- [Rule Umum §2.11](../00-rule-umum.md#211-clean-room-dan-kepatuhan-ip)

---

## Catatan review

| Tanggal | Reviewer | Keputusan | Catatan |
|---|---|---|---|
| 2026-11-23 | Tech Lead | Setuju | Nama kerja `SimpleUI` |
| 2026-11-23 | Release Manager | Setuju dengan syarat | Verifikasi scope sebelum publish |
| 2026-11-23 | Stakeholder | Setuju | Fallback hanya lewat amandemen ADR |
