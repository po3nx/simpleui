---
'@simpleui/datagrid': minor
---

DataController: `createDataController` mengintegrasikan state grid dengan
`ArrayStore`/`DataStore` — load sesuai sort/filter/page, abort permintaan lama,
pemetaan error ke `SUI-DG-004`, event data, dan `getRowByKey`/`getKey`.
