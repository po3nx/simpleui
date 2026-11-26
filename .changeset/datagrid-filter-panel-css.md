---
'@simpleui/datagrid': patch
---

Header filter panel mendapat CSS yang hilang (`position: fixed`, lebar, list,
tombol) dan posisinya di-clamp agar tetap di dalam viewport; sebelumnya panel
jatuh ke aliran dokumen di bawah halaman. Test menambahkan verifikasi posisi.
