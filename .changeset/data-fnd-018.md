---
'@simpleui/core': minor
---

Data layer: `ArrayStore`, `CustomStore`, `CachedStore` (LRU + TTL + dedupe +
invalidasi), pipeline query lokal (filter AST tertutup, sort stabil, paging,
agregasi), helper timeout/abort, serta `DataError` dengan kode
`SUI-DATA-001…010`.
