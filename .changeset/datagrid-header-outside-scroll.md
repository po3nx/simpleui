---
'@simpleui/datagrid': minor
---

Header dan footer dipindah ke luar area scroll vertikal: hanya body yang
di-scroll, scroll horizontal disinkronkan via `scrollLeft`, sehingga footer
tidak menutupi baris terakhir dan header tetap sejajar tanpa scrollbar palsu.
Area scroll kini `role="rowgroup"` dan fokusabel untuk keyboard.
