# Berkontribusi ke SimpleUI

Terima kasih sudah tertarik. Proyek ini masih pra-1.0, jadi API dapat berubah;
diskusi desain lebih baik dilakukan lewat issue sebelum implementasi besar.

## Menyiapkan lingkungan

Prasyarat: **Node.js 24+** (dikembangkan dengan Node 26) dan **pnpm 12**.

```bash
git clone https://github.com/po3nx/simpleUI.git
cd simpleUI
pnpm install
pnpm build
pnpm test
```

Perintah yang sering dipakai:

| Perintah                          | Kegunaan                             |
| --------------------------------- | ------------------------------------ |
| `pnpm build`                      | Bangun semua paket + docs            |
| `pnpm typecheck`                  | TypeScript seluruh workspace         |
| `pnpm lint` / `pnpm format:check` | ESLint + Prettier                    |
| `pnpm test`                       | Unit test (Node)                     |
| `pnpm test:browser`               | Test DOM di Chromium                 |
| `pnpm test:e2e`                   | E2E Playwright                       |
| `pnpm test:visual`                | Visual regression                    |
| `pnpm size`                       | Anggaran ukuran bundle               |
| `pnpm release:smoke`              | Kemas tarball + pasang di app bersih |
| `pnpm bench`                      | Benchmark core                       |

## Alur kerja

1. Buat branch dari `main`: `feat/<ringkas>`, `fix/<ringkas>`, atau `docs/<ringkas>`.
2. Commit memakai [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat(core): ...`, `fix(theme): ...`).
3. **Tandatangani setiap commit (DCO)** dengan `git commit -s`. CI menolak PR
   yang commit-nya tidak memiliki `Signed-off-by` sesuai penulis commit.
4. Buka PR ke `main` dengan template yang tersedia.
5. Tunggu CI: semua check harus hijau, termasuk `Gate`.
6. Merge memakai **squash**, lalu branch dihapus.

Jangan push langsung ke `main`; branch dilindungi.

## Changeset

Perubahan yang menyentuh `packages/*/src` wajib menyertakan changeset:

```bash
pnpm changeset
```

Pilih paket dan tingkat perubahan (patch/minor/major), lalu commit file
`.changeset/*.md`. Perubahan di `apps/` atau dokumentasi tidak memerlukannya.

## Test

Setiap perubahan perilaku harus punya test.

- **Unit (Node)** untuk logika murni: query, virtualisasi, state, keamanan.
- **Browser (Chromium)** untuk DOM, a11y, dan `Intl` sungguhan.
- **E2E** untuk alur pengguna dan docs site.
- **Visual** untuk perubahan tampilan; baseline **tidak boleh** diperbarui tanpa
  inspeksi dan penjelasan di PR.
- **Security**: payload XSS/URL/CSV/prototype wajib tetap dilindungi.

Coverage core dijaga di **90% baris / 85% cabang**. Jangan menurunkan gate untuk
melewati test yang gagal — perbaiki akar masalahnya.

## Keamanan

- Perlakukan data dari API, sel, URL, clipboard, dan `localStorage` sebagai
  **tidak tepercaya**.
- Teks dirender dengan `textContent`; HTML hanya lewat `sanitizeHtml`.
- Jangan menambah `innerHTML`, `eval`, atau `new Function` baru.
- Merge opsi memakai `safeMerge`; URL memakai `safeUrl`.
- Kerentanan **jangan** dilaporkan lewat issue publik — ikuti [SECURITY.md](SECURITY.md).

## Aksesibilitas

- Semua fungsi dapat dioperasikan keyboard dengan fokus terlihat.
- Role/ARIA harus sesuai perilaku nyata, bukan sekadar label.
- `axe` harus 0 pelanggaran serious/critical.
- Perubahan visual besar perlu pemeriksaan screen reader manual; checklist ada
  di [test/a11y/manual-checklist.md](test/a11y/manual-checklist.md).

## Performa

- Hindari layout thrashing; batch baca DOM lalu tulis.
- Bersihkan listener, observer, dan timer saat `dispose`.
- Perubahan hot path harus menyertakan benchmark sebelum/sesudah (R-PERF-07).

## Dependency dan lisensi

- Allowlist lisensi: MIT, Apache-2.0, BSD-2/3, ISC, 0BSD; MPL-2.0 hanya untuk
  tooling dev yang tidak didistribusikan.
- Jalankan `pnpm check:license` sebelum menambah dependency.
- Hindari dependency besar untuk kenyamanan; jelaskan justifikasinya di PR.

## Dokumen dan template

- Dokumentasi publik ada di [README.md](README.md) dan [apps/docs](apps/docs).
- Template issue dan PR ada di `.github/`.
- Rencana jangka panjang dan ADR disimpan di repositori privat; kontributor
  eksternal tidak memerlukannya untuk berkontribusi.
