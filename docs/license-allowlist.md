# Allowlist Lisensi Dependency

> **Status:** Aktif · **Rujukan:** [ADR-0001](adr/0001-lisensi-apache-2.0.md) §2
> **Terakhir diperiksa:** 2026-11-24 · **Dijaga oleh:** `pnpm check:license`

ADR-0001 mewajibkan dependency runtime lolos allowlist. Dokumen ini mencatat
daftar yang diizinkan, pengecualian yang disepakati, dan cara memeriksanya.

---

## 1. Lisensi yang diizinkan

| Lisensi         | Keterangan                         |
| --------------- | ---------------------------------- |
| `MIT`           | Paling umum, permisif              |
| `Apache-2.0`    | Permisif + patent grant            |
| `ISC`           | Permisif, setara MIT               |
| `BSD-2-Clause`  | Permisif                           |
| `BSD-3-Clause`  | Permisif (tanpa endorsement)       |
| `0BSD`          | Permisif tanpa syarat atribusi     |
| `BlueOak-1.0.0` | Permisif modern (varian MIT-style) |
| `Unlicense`     | Public domain                      |
| `CC0-1.0`       | Public domain                      |

**Ditolak untuk runtime:** `GPL-*`, `AGPL-*`, `SSPL-*`, dan lisensi proprietary
tanpa persetujuan legal tertulis.

---

## 2. Pengecualian: hanya untuk tooling build/dev

Lisensi berikut **tidak** didistribusikan bersama kode library, hanya dipakai
saat build/test, dan dibatasi pada paket yang disebutkan.

| Lisensi   | Paket                                                     | Alasan                                                                         |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `MPL-2.0` | `lightningcss` dan semua varian platform `lightningcss-*` | Build dependency Vite untuk minifikasi CSS; weak copyleft, tidak masuk tarball |

Menambah pengecualian baru **wajib** disertai alasan dan review, karena
mengubah permukaan legal produk.

---

## 3. Kondisi saat ini (2026-11-24)

`pnpm check:license` memeriksa 250 entri:

| Lisensi         | Jumlah |
| --------------- | -----: |
| `MIT`           |    204 |
| `Apache-2.0`    |     17 |
| `ISC`           |     15 |
| `BSD-2-Clause`  |      6 |
| `BSD-3-Clause`  |      3 |
| `BlueOak-1.0.0` |      3 |
| `MPL-2.0`       |      2 |

Seluruhnya adalah dependency development/build. Paket `@simpleui/*` tidak
memiliki dependency runtime pihak ketiga — hanya `peerDependencies` framework
yang disediakan consumer.

---

## 4. Cara memeriksa

```bash
pnpm check:license        # validasi lisensi dependency terhadap allowlist
pnpm check:license-files  # pastikan LICENSE/NOTICE tiap paket sama dengan root
pnpm license:sync         # salin ulang LICENSE/NOTICE ke semua paket
```

Keduanya dijalankan di CI (job `quality`), sehingga dependency baru dengan
lisensi di luar daftar langsung menggagalkan PR.

---

## 5. Cara menambah dependency baru

1. Periksa lisensinya: `pnpm licenses list --json`.
2. Bila termasuk daftar §1, tidak ada tindakan tambahan.
3. Bila di luar daftar, hentikan: ajukan ADR baru atau cari alternatif.
4. Jalankan `pnpm check:license` sebelum membuka PR.
