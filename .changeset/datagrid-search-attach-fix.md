---
'@simpleui/datagrid': patch
---

Perbaiki search panel yang tidak pernah ditempel ke DOM: panel kini di-`prepend`
ke host grid saat `searchPanel: true` (ditemukan oleh parity suite).
