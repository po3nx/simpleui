---
'@simpleui/datagrid': minor
---

`DataController` mendukung `remoteOperations` (`'auto' | boolean | object`)
untuk pushdown filter/sort/group/page sesuai capabilities store, dengan
fallback lokal untuk operasi yang tidak didukung. Grouping lokal tersedia lewat
`getGroups()`.
