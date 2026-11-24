---
'@simpleui/core': minor
---

`sanitizeHtmlWithConfig` + tipe `SanitizerConfig` untuk konten first-party yang
membutuhkan allowlist lebih luas (dipakai situs dokumentasi). `sanitizeHtml`
publik tetap memakai allowlist tetap agar consumer tidak dapat melonggarkannya.
