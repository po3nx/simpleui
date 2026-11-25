---
'@simpleui/core': patch
---

Perbaikan performa filter teks: locale collator di-cache per instance, bukan
dipanggil `resolvedOptions()` untuk setiap sel. Filter 100.000 baris turun dari
~248 ms menjadi ~12 ms.
