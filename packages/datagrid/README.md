# @simpleui/datagrid

DataGrid enterprise SimpleUI. Status: **DG-1 (model & data)** — kontrak API dan
normalisasi opsi sudah tersedia; renderer menyusul DG-2.

```ts
import { normalizeDataGridOptions } from '@simpleui/datagrid';

const options = normalizeDataGridOptions({
  dataSource: rows,
  keyExpr: 'id',
  columns: [{ dataField: 'name', caption: 'Nama' }],
  paging: { enabled: true, pageSize: 20 },
});
```

- `normalizeDataGridOptions` memberi default aman, memvalidasi tipe/rentang, dan
  menolak opsi tak dikenal (`SUI-DG-001`).
- Mode dev melempar error; mode produksi memakai fallback dan melaporkan lewat
  `onValidationError`.
- Tipe publik lengkap ada di `src/api/types.ts` (DG-002).

Implementasi bertahap mengikuti `07-tasks.md` di repositori dokumen privat.
