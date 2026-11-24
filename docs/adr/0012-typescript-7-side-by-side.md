# ADR-0012 — TypeScript 7 untuk Build, TypeScript 5.9 untuk Tooling

> **Status:** Accepted · **Tanggal:** 2026-11-24 · **Owner:** Tech Lead
> **Reviewer:** Core Engineer, Build Engineer · **Berlaku sampai:** saat
> TypeScript 7.1 (atau versi yang menyediakan Compiler API) dirilis
> **Menggantikan:** — · **Terkait:** ADR-0006, ADR-0009, ADR-0011

---

## 1. Konteks

Dependabot menaikkan `typescript` dari 5.9.3 ke 7.0.2 dan PR tersebut sudah
di-merge. TypeScript 7.0 adalah compiler native (Go) yang **belum menyediakan
programmatic Compiler API**; API tersebut dijadwalkan pada rilis 7.1.

Fakta yang diverifikasi di repo ini:

- `packages/*/node_modules/typescript` berisi hanya `tsc.js`, `getExePath.js`,
  dan `version.cjs` — tidak ada `lib/typescript.js`, sehingga `createProgram`
  tidak tersedia.
- `typescript-eslint@8.74.0` (terbaru saat ADR ditulis) memiliki peer
  `typescript: >=4.8.4 <6.1.0`.
- Akibat resolusi peer, pnpm memasang **dua** instance: `typescript@7.0.2`
  untuk paket dan `typescript@5.9.3` untuk linter.

Tooling yang bergantung pada Compiler API: `typescript-eslint` (aturan
ber-type-information), API Extractor (FND-029), `ts-morph`, `vite-plugin-dts`.

Tanpa keputusan tertulis, kondisi ini ambigu: build dan lint memakai compiler
berbeda, dan pekerjaan FND-029 akan gagal tanpa penjelasan.

---

## 2. Keputusan

> Kami memutuskan **TypeScript 7.0.2 sebagai compiler build/typecheck**, dan
> **membiarkan `typescript-eslint` berjalan di TypeScript 5.9.3** (hasil
> resolusi peer) sampai TypeScript 7.1 dan dukungan `typescript-eslint` tersedia.

Detail:

- `tsc -b` di setiap paket memakai TypeScript 7 (native).
- `pnpm lint` memakai TypeScript 5.9.3 — bukan pilihan eksplisit, melainkan
  konsekuensi peer dependency. Ini **bukan** dua sumber kebenaran tipe: tipe
  publik tetap yang dihasilkan `tsc` 7.
- Aturan lint yang butuh type information (`no-floating-promises`,
  `no-misused-promises`, dst.) **ditunda** sampai versi TypeScript untuk lint
  sama dengan versi build.
- FND-029 (API Extractor + `.api.md`) **terblokir** sampai Compiler API
  tersedia; lihat §7.
- Baseline toolchain di [docs/07](../07-build-release.md#1-toolchain)
  diperbarui ke TypeScript 7.x.

Tidak termasuk keputusan ini: strategi UMD/CDN (ADR-0011), matriks dukungan
framework (ADR-0006), dan aturan penulisan tipe (Rule Umum §4).

---

## 3. Alternatif yang dipertimbangkan

| Alternatif                            | Kelebihan                                                  | Kekurangan                                                      | Alasan tidak dipilih                               |
| ------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Turun ke TypeScript 6.0 (satu versi)  | Compiler API tersedia; lint & build sinkron; FND-029 jalan | Kehilangan kecepatan compiler native; menahan upgrade ekosistem | Dicatat sebagai jalur mundur bila TS 7.1 terlambat |
| Tetap TypeScript 5.9 di semua langkah | Paling konservatif, sesuai dokumen lama                    | Menahan upgrade; kecepatan build lebih rendah                   | Tidak dipilih; 7.0 sudah tervalidasi hijau         |
| `ts7-eslint` (paket pihak ketiga)     | Lint ber-type-information di TS 7                          | Bukan dependency resmi, risiko pemeliharaan & supply chain      | Ditolak                                            |
| TypeScript 7 untuk seluruh tooling    | Satu compiler                                              | Mustahil: 7.0 tidak punya Compiler API                          | Tidak dapat dijalankan                             |

---

## 4. Konsekuensi

### Positif

- Build/typecheck memakai compiler native yang lebih cepat.
- Tidak ada kode library yang bergantung pada Compiler API saat ini, sehingga
  aplikasi tetap berjalan.
- Paket tetap tervalidasi: `publint` + `arethetypeswrong` hijau (FND-009).

### Negatif / risiko

- Dua versi TypeScript berada di satu repo; `pnpm lint` menganalisis dengan
  compiler yang berbeda dari `pnpm build`.
- Aturan lint ber-type-information tertunda, sehingga sebagian aturan
  [Rule Umum §4](../00-rule-umum.md#4-clean-code-dan-aturan-typescript) baru
  dapat ditegakkan sebagian.
- FND-029 terblokir; ini gate P0 untuk publikasi API report.
- Dokumentasi lama menyebut "TypeScript 5.x" dan menjadi tidak akurat.

### Mitigasi

- ADR ini menjadi rujukan tunggal saat ada pertanyaan "kenapa ada dua versi".
- Dependabot tidak lagi mengusulkan lompatan major TypeScript; 7.1 datang
  sebagai minor dan akan ditinjau.
- Sebelum FND-029 dimulai, evaluasi ulang: bila Compiler API belum ada,
  jalankan TypeScript 6 untuk tooling (side-by-side) atau tunda task.

---

## 5. Keamanan dan privasi

- Tidak ada perubahan permukaan runtime: TypeScript hanya dipakai saat build.
- Supply chain: versi dipin oleh lockfile; `pnpm audit` tetap menjadi gate.
- Risiko baru: dua instance compiler menambah satu entri dependency yang harus
  diaudit. Kontrol: audit mingguan yang sudah berjalan di `security.yml`.

---

## 6. Kompatibilitas dan migrasi

- Breaking change TypeScript 7 terhadap 5.x: `module` `amd`/`umd`/`systemjs`/
  `none` dihapus, target `es5` dihapus, dan opsi yang sudah deprecated di 6.0
  kini ditolak.
- Dampak ke proyek: **tidak ada** — `tsconfig.base.json` memakai `target`
  ES2022, `module` ESNext, `moduleResolution` Bundler, dan build 11/11 paket
  lulus.
- Paket terdampak: seluruh `packages/*` (build), tidak ada perubahan API.
- Rencana migrasi ke satu versi: saat TS 7.1 stabil dan `typescript-eslint`
  mendukungnya, naikkan peer tersebut; hapus instance 5.9.3; aktifkan aturan
  type-aware; lanjutkan FND-029.

---

## 7. Implementasi

| Item                | Detail                                                            |
| ------------------- | ----------------------------------------------------------------- |
| Compiler build      | `typescript@7.0.2` (catalog `pnpm-workspace.yaml`)                |
| Compiler lint       | `typescript@5.9.3` (peer `typescript-eslint`)                     |
| Verifikasi          | `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm check:package` |
| Task terblokir      | FND-029 (API Extractor) sampai Compiler API tersedia              |
| Task tertunda       | Aturan lint type-aware (lanjutan FND-005)                         |
| Metrik keberhasilan | Build tetap hijau dan waktu typecheck tidak memburuk              |

---

## 8. Referensi

- Panduan migrasi TypeScript 7 (compiler native, breaking change):
  <https://www.syncfusion.com/blogs/post/typescript-7-upgrade-guide>
- Status dukungan `typescript-eslint` terhadap TS 7 (peer `<6.1.0`) —
  `npm view typescript-eslint peerDependencies`
- [ADR-0011](0011-format-build.md) — format build ESM-first
- [docs/07 §1](../07-build-release.md#1-toolchain) — toolchain

---

## Catatan review

| Tanggal    | Reviewer       | Keputusan | Catatan                                          |
| ---------- | -------------- | --------- | ------------------------------------------------ |
| 2026-11-24 | Tech Lead      | Setuju    | Dua compiler dicatat, FND-029 ditandai terblokir |
| 2026-11-24 | Build Engineer | Setuju    | Build & packaging validation hijau pada TS 7     |
