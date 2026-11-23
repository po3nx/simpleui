# ADR-0007 — Runtime Validation

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Core Engineer, Security Reviewer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau jika kebutuhan skema
> kompleks muncul

---

## 1. Konteks

Opsi publik, state persistence, respons jaringan, dan filter adalah input yang
dapat salah atau berbahaya. Library membutuhkan validasi runtime yang:

- menjaga bundle tetap kecil;
- tidak menambah dependency baru ke core;
- memberikan error yang jelas di development;
- tetap aman di production (validasi keamanan tidak boleh dimatikan).

Pilihan: custom validator, zod, valibot, atau tanpa validasi.

---

## 2. Keputusan

> Kami memutuskan memakai **validator ringan internal** di core, tanpa
> dependency runtime zod/valibot.

Detail:

- Validator publik: `validateOptions()`, `validateLoadOptions()`,
  `validateState()`, `validateFilter()`.
- Validasi **selalu aktif** untuk aturan keamanan:
  - protokol URL;
  - kedalaman/jumlah node filter;
  - panjang/ukuran input;
  - key yang hilang/duplikat;
  - batas baris/kolom.
- Validasi **development-only** untuk bentuk opsi yang kompleks (mis. tipe
  kolom, kombinasi opsi), dengan pesan jelas dan error code.
- Production tetap melakukan validasi murah; deep validation dapat dimatikan
  untuk performa.
- Error mengembalikan `Result<T, SimpleUIError>`, bukan melempar untuk input
  pengguna yang wajar.
- Skema publik didokumentasikan sebagai tipe TypeScript + tabel aturan.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif       | Kelebihan             | Kekurangan                           | Alasan tidak dipilih |
| ---------------- | --------------------- | ------------------------------------ | -------------------- |
| zod              | DX bagus, ekosistem   | Bundle lebih besar, dependency       | Berat untuk core     |
| valibot          | Kecil, tree-shakeable | Tetap dependency; API asing          | Tidak perlu          |
| Custom validator | Kendali penuh, kecil  | Perlu pemeliharaan                   | **Dipilih**          |
| Tanpa validasi   | Paling kecil          | Error membingungkan, risiko security | Ditolak              |

---

## 4. Konsekuensi

### Positif

- Core tetap tanpa dependency runtime.
- Validasi keamanan tidak bisa dimatikan tanpa sengaja.
- Pesan error dapat disesuaikan dengan i18n dan error code.

### Negatif / risiko

- Perlu menulis dan merawat validator.
- Risiko validasi tidak konsisten antar komponen.
- Skema kompleks bisa duplikatif dengan tipe TS.

### Mitigasi

- Validator generik + aturan per komponen.
- Test table-driven untuk setiap aturan.
- Review security untuk validator baru.
- Dokumentasi aturan di API reference.

---

## 5. Keamanan dan privasi

- Validasi bukan pengganti sanitasi; keduanya lapisan berbeda.
- `safeMerge` tetap dipakai terpisah untuk prototype pollution.
- Pesan error tidak memuat nilai sensitif; hanya nama field dan kode.
- Batas DoS divalidasi sebelum operasi mahal.
- Validasi state persistence mencegah data korup memengaruhi UI.

---

## 6. Kompatibilitas dan migrasi

- Menambah aturan validasi baru dapat menjadi breaking change jika menolak
  input yang sebelumnya diterima; diumumkan di changelog.
- Error code stabil; perubahan kode = breaking.
- Tidak ada migrasi dependency.

---

## 7. Implementasi

| Item           | Detail              |
| -------------- | ------------------- |
| Core validator | FND-011, FND-022    |
| Options        | DG-010              |
| Filter         | DG-014              |
| State          | DG-022              |
| Test           | table-driven + fuzz |
| Target         | Sebelum DG-1        |

---

## 8. Referensi

- [Rule Umum §4.6](../00-rule-umum.md#46-penanganan-error)
- [Security §4](../05-security.md#4-injection)
- [Data layer §4.1](../03-data-layer.md#41-filter)

---

## Catatan review

| Tanggal    | Reviewer          | Keputusan | Catatan                        |
| ---------- | ----------------- | --------- | ------------------------------ |
| 2026-11-23 | Tech Lead         | Setuju    | Tanpa zod/valibot              |
| 2026-11-23 | Security Reviewer | Setuju    | Validasi keamanan selalu aktif |
| 2026-11-23 | Core Engineer     | Setuju    | Error code + Result            |
