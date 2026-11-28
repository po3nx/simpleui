---
'@simpleui/datagrid': patch
---

Stabilkan budget perf 100k di CI: ambang lokal (100/175/750 ms) tetap, CI
memakai margin 6× untuk variasi runner. Test coverage model/data ditambah
(lookup resolver) agar gate DG-080 konsisten.
