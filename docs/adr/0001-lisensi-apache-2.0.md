# ADR-0001 — Lisensi Apache-2.0

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Stakeholder, Legal Reviewer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau saat 1.0 atau perubahan model bisnis

---

## 1. Konteks

SimpleUI adalah library komponen yang akan dipakai perusahaan, termasuk untuk
produk komersial. Lisensi harus:

- permisif agar adopsi luas, termasuk embedding di aplikasi proprietary;
- memberikan perlindungan paten yang eksplisit;
- kompatibel dengan dependency permisif (MIT, BSD, ISC);
- tidak menciptakan kewajiban yang berat bagi consumer.

Pilihan ini juga memengaruhi model kontribusi, header file, dan distribusi
artefak.

---

## 2. Keputusan

> Kami memutuskan **Apache License 2.0** untuk seluruh paket SimpleUI.

Detail:

- Setiap paket menyertakan `LICENSE` (teks Apache-2.0) dan `NOTICE`.
- Kontribusi memakai **DCO** (`Signed-off-by`), bukan CLA, untuk menjaga
  rendahnya friksi kontribusi.
- Header `SPDX-License-Identifier: Apache-2.0` dianjurkan pada file source baru;
  tidak wajib untuk file generated.
- Trademark dan nama produk **tidak** otomatis dilisensikan bersama kode.
- Dokumentasi dan contoh memakai lisensi yang sama, kecuali dinyatakan lain.
- Dependency runtime wajib lolos allowlist: MIT, Apache-2.0, BSD-2/3, ISC, 0BSD.
  GPL/AGPL/SSPL ditolak untuk runtime tanpa persetujuan legal tertulis.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif       | Kelebihan                        | Kekurangan                              | Alasan tidak dipilih                        |
| ---------------- | -------------------------------- | --------------------------------------- | ------------------------------------------- |
| MIT              | Sangat sederhana, familiar       | Tidak ada patent grant eksplisit        | Perlindungan paten penting untuk enterprise |
| Apache-2.0       | Permisif + patent grant + NOTICE | Sedikit lebih formal                    | **Dipilih**                                 |
| Dual MIT/Apache  | Fleksibel                        | Dua set kewajiban, membingungkan        | Tidak perlu                                 |
| BSL / commercial | Monetisasi                       | Tidak open source, adopsi terbatas      | Bertentangan dengan tujuan awal             |
| GPL-3.0          | Copyleft kuat                    | Tidak cocok untuk embedding proprietary | Ditolak                                     |

---

## 4. Konsekuensi

### Positif

- Consumer enterprise mendapat perlindungan paten eksplisit.
- Kompatibel dengan mayoritas dependency permisif.
- Menjadi sinyal tata kelola proyek yang serius.

### Negatif / risiko

- Perlu menjaga `NOTICE` dan atribusi.
- Kontributor harus memahami DCO.
- Tidak mencegah penggunaan kode oleh pesaing (memang konsekuensi open source).

### Mitigasi

- Template `NOTICE` dan panduan kontribusi disiapkan di FND-025/FND-034.
- CI memeriksa file `LICENSE`/`NOTICE` ada di setiap paket.
- Lisensi dependency diaudit otomatis.

---

## 5. Keamanan dan privasi

- Lisensi permisif **tidak** berarti tanpa tanggung jawab keamanan; proyek tetap
  memiliki `SECURITY.md`, SLA respons, dan kebijakan disclosure.
- Tidak ada kewajiban berbagi data pengguna.
- Patent grant tidak melindungi dari modifikasi berbahaya oleh pihak ketiga.

---

## 6. Kompatibilitas dan migrasi

- Semua paket `@simpleui/*` memakai lisensi yang sama.
- Kontribusi lama tanpa `Signed-off-by` harus diperbaiki sebelum merge.
- Perubahan lisensi di masa depan hanya boleh untuk rilis major baru dan wajib
  ADR baru.

---

## 7. Implementasi

| Item       | Detail                                       |
| ---------- | -------------------------------------------- |
| File       | `LICENSE`, `NOTICE` di root dan setiap paket |
| CI         | cek lisensi + `license-checker`              |
| Kontribusi | `CONTRIBUTING.md` + DCO                      |
| Task       | FND-025, FND-034                             |
| Target     | Sebelum FND-001 selesai                      |

---

## 8. Referensi

- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0
- DCO: https://developercertificate.org/
- [Rule Umum §2.11](../00-rule-umum.md#211-clean-room-dan-kepatuhan-ip)
- [Security §10](../05-security.md#10-supply-chain)

---

## Catatan review

| Tanggal    | Reviewer       | Keputusan | Catatan                             |
| ---------- | -------------- | --------- | ----------------------------------- |
| 2026-11-23 | Tech Lead      | Setuju    | Rekomendasi awal                    |
| 2026-11-23 | Legal Reviewer | Setuju    | Patent grant dinilai penting        |
| 2026-11-23 | Stakeholder    | Setuju    | Tidak ada model dual-license di 1.0 |
