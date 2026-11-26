---
'@simpleui/datagrid': minor
---

State persistence UI: `createPersistenceControls` (simpan/reset + live status),
storage adapter `createMemoryStorage`/`createLocalStorageAdapter`/
`createSessionStorageAdapter` dengan fallback aman, dan snapshot v2 yang
menyertakan `expandedGroups` (migrasi v1→v2 otomatis).
