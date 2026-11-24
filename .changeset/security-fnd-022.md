---
'@simpleui/core': minor
---

Utilitas keamanan: `safeMerge` (anti prototype pollution, kedalaman terbatas),
`safeUrl`/`safeImageUrl` (allowlist protokol, tolak userinfo & karakter
kontrol), `sanitizeHtml`/`createSanitizer` (allowlist tetap, gagal tertutup
tanpa DOM), `escapeCsvCell`/`toCsv` (anti formula injection), serta
`SecurityError` dengan kode `SUI-SEC-001/002`.
