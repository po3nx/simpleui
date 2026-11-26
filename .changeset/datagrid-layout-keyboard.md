---
'@simpleui/datagrid': patch
---

Perbaiki layout scroll: header/footer tidak lagi sticky horizontal (sehingga
sejajar dengan baris saat scroll horizontal), `scrollbar-gutter` mencegah
scrollbar horizontal palsu, dan area footer tidak menutupi baris terakhir.
Keyboard: Space/Enter pada sel seleksi mencentang checkbox; header filter
mendukung Escape, focus trap Tab, dan mengembalikan fokus ke tombol.
