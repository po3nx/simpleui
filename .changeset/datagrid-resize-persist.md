---
'@simpleui/datagrid': patch
---

Lebar kolom hasil resize kini disimpan oleh header controller dan dipakai saat
header dirender ulang (sorting/filter), sehingga lebar tidak kembali ke nilai
awal. Test regresi resize → sort ditambahkan.
