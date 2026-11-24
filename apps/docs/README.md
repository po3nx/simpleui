# @simpleui/docs

Situs dokumentasi publik dan contoh SimpleUI. Dibangun dengan Vite dari
Markdown di `content/` plus demo interaktif.

```bash
pnpm --filter @simpleui/docs dev      # server lokal
pnpm --filter @simpleui/docs build    # output statis di dist/
pnpm --filter @simpleui/docs test     # test router/manifest
```

## Isi

- `content/*.md` — sumber halaman; dirender oleh `src/markdown.ts` dan
  **disanitasi** dengan allowlist `@simpleui/core` sebelum masuk DOM.
- `src/nav.ts` — manifest navigasi (satu sumber untuk sidebar dan router).
- `src/router.ts` — resolusi `#/<slug>` dengan fallback halaman pertama.
- `src/demo/virtual-list.ts` — demo 10.000 baris memakai `Virtualizer`
  (hanya baris di viewport yang masuk DOM).
- Pengalih tema (`light`/`dark`/`high-contrast`) dan density dari token.

## Catatan

Situs ini belum memuat API reference yang di-generate; itu menyusul bersama
komponen (FND-029). Deploy dan versioning docs per minor ditangani pada fase
rilis.
