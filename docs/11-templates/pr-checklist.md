# PR Checklist

> Salin ke deskripsi PR. Hapus bagian yang tidak relevan, jangan hapus
> checklist keamanan/a11y untuk perubahan yang menyentuhnya.

---

## Ringkasan

- **Task ID:** `DG-___` / `PV-___` / `CH-___` / `FND-___`
- **Jenis:** feat / fix / docs / test / refactor / perf / security / chore
- **Paket terdampak:**
- **Breaking change:** ya / tidak
- **Changeset:** ya / tidak (wajib untuk consumer-facing)

## Apa yang berubah

<!-- 2–5 bullet, fokus pada perilaku, bukan daftar file -->

-
-
-

## Mengapa

<!-- Konteks, issue, keputusan desain -->

## Cara test

<!-- Langkah manual + test otomatis -->

```bash
pnpm test
pnpm test:browser
pnpm test:contract
```

## Screenshot / rekaman (untuk UI)

| Sebelum | Sesudah |
|---|---|
| | |

## Checklist umum

- [ ] Kode mengikuti [Rule Umum](../00-rule-umum.md).
- [ ] Lint & typecheck lulus.
- [ ] Unit test untuk logika baru.
- [ ] Regression test untuk bug.
- [ ] Tidak ada `any`, `@ts-ignore`, `console.log`, kode mati.
- [ ] Tidak ada `TODO`/`FIXME` tanpa ID.
- [ ] Public API punya TSDoc + `.api.md` diperbarui.
- [ ] Changeset dibuat (jika perlu).
- [ ] Docs/demo diperbarui.
- [ ] Tidak menurunkan coverage di bawah gate.
- [ ] Ukuran bundle dalam budget.

## Checklist keamanan

- [ ] Input tidak tepercaya dirender sebagai teks.
- [ ] Tidak ada `innerHTML`/`eval` baru.
- [ ] URL divalidasi dengan `safeUrl`.
- [ ] Merge memakai `safeMerge`.
- [ ] Export/clipboard aman dari formula injection.
- [ ] State divalidasi + dibatasi.
- [ ] Network memakai timeout/abort/batas ukuran.
- [ ] Error tidak membocorkan detail internal.
- [ ] Dependency baru lolos checklist (jika ada).
- [ ] Security test ditambahkan.

## Checklist a11y

- [ ] Dapat dioperasikan keyboard.
- [ ] Fokus terlihat dan dipulihkan.
- [ ] Role/ARIA benar.
- [ ] Nama aksesibel.
- [ ] Live region tidak spam.
- [ ] Kontras & target size.
- [ ] `prefers-reduced-motion` dihormati.
- [ ] axe 0 serious/critical.
- [ ] Manual screen reader (jika komponen baru).

## Checklist performa

- [ ] Tidak ada layout thrashing.
- [ ] Listener/observer dibersihkan.
- [ ] Render tidak berulang tanpa perlu.
- [ ] Benchmark disertakan (jika hot path).
- [ ] Memory stabil (jika mengubah lifecycle).

## Risiko & rollback

- **Risiko:**
- **Rollback:**
- **Monitor:**

## Catatan reviewer

<!-- Diisi reviewer -->

- [ ] Perilaku di layer yang benar.
- [ ] Tidak ada duplikasi logika di adapter.
- [ ] Test membuktikan perilaku.
- [ ] Tidak ada dependency baru tanpa justifikasi.
