---
'@simpleui/core': minor
---

Kernel komponen: `ComponentKernel` dengan lifecycle eksplisit
(create → mount → render → dispose), opsi yang divalidasi, event bertipe lewat
`Emitter`, dan pembersihan resource lewat `DisposableBag`. Menambahkan
`SimpleUIError` dengan kode stabil `SUI-CORE-001..003`, `mergeOptions`, dan
`isDevMode`.
