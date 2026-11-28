---
'@simpleui/datagrid': minor
---

Excel export OOXML minimal (`exportExcel`/`downloadExcel`) tanpa dependensi:
ZIP store writer, inline string (tidak ada formula sehingga aman dari formula
injection), tipe angka/boolean, escape XML, sanitasi nama sheet/file, dan
pembuangan karakter kontrol.
