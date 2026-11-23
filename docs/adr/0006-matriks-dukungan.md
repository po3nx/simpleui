# ADR-0006 — Matriks Dukungan Framework dan Browser

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Adapter Engineer, QA Lead
> **Menggantikan:** — · **Berlaku sampai:** ditinjau setiap rilis minor

---

## 1. Konteks

Dukungan versi yang terlalu luas menambah beban CI dan risiko bug; terlalu
sempit menghalangi adopsi enterprise. Perlu matriks eksplisit yang:

- dapat diuji di CI;
- memiliki kebijakan kapan versi lama dihapus;
- tidak menjanjikan dukungan tanpa verifikasi.

---

## 2. Keputusan

> Kami memutuskan matriks dukungan berikut sebagai **baseline 1.0**.

### Browser

| Browser    | Minimum                 | Diuji                    |
| ---------- | ----------------------- | ------------------------ |
| Chrome     | 2 versi stabil terakhir | Ya                       |
| Edge       | 2 versi stabil terakhir | Ya                       |
| Firefox    | 2 versi stabil terakhir | Ya                       |
| Safari     | 16.4                    | Ya                       |
| iOS Safari | 16.4                    | Ya (emulasi + perangkat) |
| IE11       | Tidak didukung          | Tidak                    |

### Runtime & tooling

| Dimensi    | Minimum | Diuji            |
| ---------- | ------- | ---------------- |
| Node.js    | 24 LTS  | 24, 26           |
| TypeScript | 5.4     | minimum, terbaru |
| Vite       | 6.4     | 8.3              |
| webpack    | 5       | 5                |
| esbuild    | 0.25    | 0.28             |
| Rollup     | 4       | 4                |

### Framework

| Framework | Rentang peer | Diuji              |
| --------- | ------------ | ------------------ |
| React     | `>=18`       | 18, 19             |
| Vue       | `>=3.4 <4`   | 3.4, 3.5+          |
| Angular   | `>=17 <23`   | 17, stabil terbaru |

### Kebijakan

- Dukungan mengikuti **N dan N-1 major** dari framework; versi lebih lama
  dihapus pada major SimpleUI berikutnya.
- Browser mengikuti 2 versi stabil terakhir; Safari mengikuti 2 versi major
  terakhir.
- Node mengikuti LTS yang didukung; **Node 24 minimum**, Node 26 primary.
  Node 22 tidak dijadikan baseline karena EOL April 2027.
- Kenaikan minimum version adalah **breaking change** untuk paket terdampak dan
  wajib ADR + migration note.
- Matriks ditinjau setiap rilis minor; CI matrix diperbarui sebelum rilis.
- Framework yang sudah EOL tidak didukung meskipun secara teknis masih berjalan.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif                   | Kelebihan       | Kekurangan                           | Alasan tidak dipilih |
| ---------------------------- | --------------- | ------------------------------------ | -------------------- |
| Dukungan tanpa batas         | Adopsi maksimal | CI meledak, bug lama                 | Tidak realistis      |
| Hanya versi terbaru          | CI sederhana    | Enterprise tertinggal                | Terlalu ketat        |
| N/N-1 major + browser modern | Seimbang        | Perlu disiplin review                | **Dipilih**          |
| Termasuk IE11                | Pasar lama      | Polyfill besar, arsitektur terhambat | Ditolak              |

---

## 4. Konsekuensi

### Positif

- CI matrix terukur dan dapat dipertanggungjawabkan.
- Consumer tahu persis apa yang didukung.
- Tidak ada komitmen implisit terhadap versi EOL.

### Negatif / risiko

- Sebagian consumer dengan Angular lama harus upgrade.
- Matrix CI menambah waktu nightly.
- Peer range longgar bisa lolos ke versi yang belum diuji.

### Mitigasi

- Uji minimum dan terbaru; peer range didokumentasikan.
- Peringatan runtime di development untuk versi di luar matrix.
- Dokumentasi "support policy" di setiap paket.

---

## 5. Keamanan dan privasi

- Framework/browser EOL tidak menerima patch keamanan; tidak didukung.
- Tidak ada polyfill yang mengeksekusi kode dari network.
- SSR hanya didukung pada runtime Node yang didukung.
- CI memakai versi yang di-pin; tidak ada `latest` tanpa review.

---

## 6. Kompatibilitas dan migrasi

- Menghapus dukungan versi = breaking change; diumumkan minimal satu minor
  sebelumnya.
- Migration guide wajib menyebut versi minimum baru.
- Angular: standalone component; tidak ada dukungan NgModule-only.
- Vue: Composition API; Options API dapat memakai wrapper yang sama.

---

## 7. Implementasi

| Item      | Detail                               |
| --------- | ------------------------------------ |
| CI matrix | FND-007, FND-027                     |
| Peer deps | FND-009                              |
| Docs      | tabel kompatibilitas di setiap paket |
| Review    | setiap rilis minor                   |
| Target    | Sebelum FND-009 selesai              |

---

## 8. Referensi

- [README §8](../README.md#8-matriks-kompatibilitas-target)
- [Adapter §10](../02-adapter-cross-framework.md#10-versioning-dan-peer-dependency)
- [Build & Release §8](../07-build-release.md#8-dukungan-versi)

---

## Catatan review

| Tanggal    | Reviewer         | Keputusan | Catatan                 |
| ---------- | ---------------- | --------- | ----------------------- |
| 2026-11-23 | Tech Lead        | Setuju    | N/N-1 major             |
| 2026-11-23 | QA Lead          | Setuju    | Matrix diuji di nightly |
| 2026-11-23 | Adapter Engineer | Setuju    | Angular <23, Vue <4     |
