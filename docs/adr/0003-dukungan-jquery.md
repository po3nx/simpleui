# ADR-0003 — Dukungan jQuery

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Adapter Engineer, Security Reviewer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau setelah adapter vanilla GA

---

## 1. Konteks

Sebagian konsumen enterprise masih memakai jQuery, terutama aplikasi lama yang
menginisialisasi widget secara imperatif. Namun jQuery:

- menambah ukuran dan permukaan serangan;
- mendorong manipulasi HTML string yang rawan XSS;
- tidak diperlukan oleh consumer modern.

Core SimpleUI tidak boleh bergantung pada jQuery, tetapi adopsi di aplikasi lama
tetap perlu jalur migrasi.

---

## 2. Keputusan

> Kami memutuskan menyediakan **bridge jQuery opsional** di paket terpisah,
> sementara core dan adapter utama **tidak** bergantung pada jQuery.

Detail:

- Paket: `@simpleui/vanilla` menyediakan API DOM murni dan UMD.
- Bridge jQuery berada di **subpath terpisah** `@simpleui/vanilla/jquery`,
  dibangun di atas API vanilla; mengimpor subpath ini tidak memuat bridge ke
  bundle consumer yang tidak memakainya.
- Bridge mendaftarkan plugin `$.fn.simpleUIDataGrid`, `$.fn.simpleUIPivotGrid`,
  dan `$.fn.simpleUIChart` (nama final mengikuti komponen).
- jQuery adalah **peer dependency opsional** (`>=3.7 <5`), bukan dependency
  yang dibundel.
- Bridge **DILARANG** memakai `.html()`, `.append(string)`, atau
  `$(string)` dengan data pengguna; semua teks lewat `textContent`.
- Bridge tidak menambahkan fitur baru; hanya menerjemahkan opsi/event.
- Bridge dirilis setelah adapter vanilla stabil, bukan bagian dari MVP.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif | Kelebihan | Kekurangan | Alasan tidak dipilih |
|---|---|---|---|
| Core berbasis jQuery | Familiar untuk aplikasi lama | Berat, XSS-prone, mengikat arsitektur | Ditolak |
| Tanpa jQuery sama sekali | Core bersih | Aplikasi legacy sulit migrasi | Terlalu kaku |
| Bridge opsional | Migrasi bertahap, core tetap bersih | Satu paket tambahan | **Dipilih** |
| Plugin jQuery penuh | Integrasi maksimal | Duplikasi perilaku | Ditolak |

---

## 4. Konsekuensi

### Positif

- Aplikasi legacy dapat mengadopsi SimpleUI tanpa rewrite besar.
- Core tetap kecil dan modern.
- Jalur migrasi jelas: jQuery bridge → vanilla/ESM → framework adapter.

### Negatif / risiko

- Bridge perlu diuji terhadap perilaku jQuery.
- Risiko XSS jika developer memakai HTML string di sekitar plugin.
- Beban maintenance tambahan.

### Mitigasi

- Bridge hanya wrapper tipis; test parity dengan vanilla.
- Dokumentasi menegaskan larangan HTML string.
- Bridge tidak masuk critical path 1.0; dapat ditunda.

---

## 5. Keamanan dan privasi

- Semua data dirender sebagai teks; tidak ada `.html()` dengan data.
- Event handler jQuery dilepas pada `dispose()`.
- Tidak ada `eval`/`new Function` untuk opsi.
- jQuery tidak dimuat otomatis; consumer bertanggung jawab atas versi dan
  patch keamanannya.
- Bridge memvalidasi bahwa elemen target ada dan belum diinisialisasi.

---

## 6. Kompatibilitas dan migrasi

- jQuery 3.7+; jQuery 4 diuji saat stabil.
- Tidak mendukung jQuery < 3.7 (EOL).
- Bridge memakai API yang sama dengan vanilla; migrasi hanya mengganti
  inisialisasi.
- Nama plugin stabil; perubahan nama = breaking change.

---

## 7. Implementasi

| Item | Detail |
|---|---|
| Paket | `@simpleui/vanilla` (subpath `jquery`) |
| Depends | DG-053 (vanilla UMD), adapter parity |
| Test | mount/update/dispose, event, XSS payload, no `.html()` |
| Docs | contoh migrasi jQuery → vanilla |
| Target | Pasca DataGrid GA, sebelum 1.1 |

---

## 8. Referensi

- [Adapter §6.4](../02-adapter-cross-framework.md#64-vanillajavascript)
- [Security §3](../05-security.md#3-xss-dan-rendering)
- [Rule Umum R-SEC-02](../00-rule-umum.md#6-aturan-keamanan-ringkasan-wajib)

---

## Catatan review

| Tanggal | Reviewer | Keputusan | Catatan |
|---|---|---|---|
| 2026-11-23 | Tech Lead | Setuju | Bridge terpisah, bukan core |
| 2026-11-23 | Security Reviewer | Setuju | Larangan `.html()` eksplisit |
| 2026-11-23 | Adapter Engineer | Setuju | Ditunda sampai vanilla stabil |
