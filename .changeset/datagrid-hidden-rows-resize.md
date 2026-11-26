---
'@simpleui/datagrid': patch
---

Perbaiki baris pool yang masih tampil setelah dataset menyusut (CSS `[hidden]`
kalah oleh `display:flex`), panel header filter yang tertutup footer
(z-index), dan resize kolom yang tidak memperbarui lebar sel baris/spacer
(event `simpleui:column-resize` + override lebar di row renderer).
