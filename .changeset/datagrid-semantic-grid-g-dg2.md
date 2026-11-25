---
'@simpleui/datagrid': minor
---

Struktur semantik grid: host visual dipisahkan dari elemen `role="grid"` yang
kini hanya berisi rowgroup (chrome seperti search/pager/live region berada di
host), sehingga scan axe tidak lagi menemukan `aria-required-children`.
Menambah properti `GridView.host`; `element` tetap elemen grid semantik.
