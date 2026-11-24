# Changesets — SimpleUI

Seluruh paket library SimpleUI (`core`, `theme`, `icons`, komponen, adapter,
`testing`) berada dalam satu **fixed version group**: mereka selalu memakai
versi yang sama (ADR-0008). Satu pull request "Version Packages" dari
Changesets menaikkan semuanya sekaligus.

## Alur

1. PR yang mengubah perilaku consumer **wajib** menyertakan changeset:

   ```bash
   pnpm changeset
   ```

   Pilih paket yang terpengaruh dan tingkat perubahan:

   | Tingkat | Kapan                                       |
   | ------- | ------------------------------------------- |
   | `patch` | bugfix, dokumentasi, perubahan internal     |
   | `minor` | fitur baru yang backward-compatible         |
   | `major` | breaking change (sebelum 1.0 tetap dicatat) |

2. CI (`changeset status`) memeriksa bahwa PR yang menyentuh
   `packages/*/src/` memiliki changeset. PR yang tidak menyentuh source
   (mis. dependensi) tidak diwajibkan.
3. Setelah merge ke `main`, Changesets membuka PR "Version Packages".
   Menggabungkannya akan menaikkan versi dan memperbarui `CHANGELOG.md`
   per paket, lalu menandai rilis.

## Catatan

- Paket di luar grup (`apps/`, `examples/`, `tools/`) tidak diikutkan.
- `peerDependencies` antar paket memakai `workspace:*` saat development dan
  menjadi rentang versi yang sama saat publish.
- Publikasi (`changeset publish` dengan provenance/OIDC) ditangani terpisah
  pada FND-033 dan `release.yml`.
