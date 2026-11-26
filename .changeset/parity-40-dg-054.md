---
'@simpleui/testing': minor
'@simpleui/datagrid': patch
'@simpleui/react': minor
'@simpleui/vue': minor
'@simpleui/angular': minor
'@simpleui/vanilla': minor
---

Parity suite DG-054 mencapai 40 skenario × 4 adapter = 160 test. Adapter
menambah props `status`/`statusMessage`/`locale`; row renderer menambah
`setLocale`; skenario mencakup loading/error, locale, theme, reorder, reload
selection, duplicate key, prototype pollution, dan focus restoration.
