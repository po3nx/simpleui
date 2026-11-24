## Ringkasan

- **Jenis:** feat / fix / docs / test / refactor / perf / security / chore
- **Paket terdampak:**
- **Breaking change:** ya / tidak
- **Changeset:** ya / tidak (wajib bila `packages/*/src` berubah)

## Apa yang berubah

<!-- 2–5 bullet, fokus pada perilaku, bukan daftar file -->

-

## Mengapa

<!-- Konteks, issue, keputusan desain -->

## Cara memverifikasi

```bash
pnpm build
pnpm test
```

<!-- Langkah manual bila ada; sertakan perintah yang benar-benar dijalankan -->

## Checklist

### Umum

- [ ] Lint, format, dan typecheck lulus.
- [ ] Test baru/ubah mencakup perilaku yang berubah.
- [ ] Tidak ada `any`, `@ts-ignore`, `console.log`, atau kode mati.
- [ ] Changeset disertakan bila menyentuh `packages/*/src`.
- [ ] Commit sudah ditandatangani (`git commit -s`).

### Keamanan (bila menyentuh data/URL/HTML/export)

- [ ] Input tidak tepercaya dirender sebagai teks.
- [ ] Tidak ada `innerHTML`/`eval` baru; HTML lewat `sanitizeHtml`.
- [ ] URL divalidasi `safeUrl`; merge opsi memakai `safeMerge`.
- [ ] Export aman dari formula injection.

### Aksesibilitas (bila menyentuh UI)

- [ ] Dapat dioperasikan keyboard; fokus terlihat dan dipulihkan.
- [ ] Role/ARIA sesuai perilaku; nama aksesibel.
- [ ] `axe` 0 serious/critical.

### Performa (bila menyentuh hot path)

- [ ] Tidak ada layout thrashing; listener/observer dibersihkan.
- [ ] Benchmark disertakan bila relevan.

## Screenshot / rekaman

<!-- Untuk perubahan UI; visual baseline hanya diperbarui dengan penjelasan -->

| Sebelum | Sesudah |
| ------- | ------- |
|         |         |

## Risiko & rollback

- **Risiko:**
- **Rollback:**
