# @simpleui/react

Adapter React untuk SimpleUI. **Tahap spike (FND-028)**: bridge lifecycle
`mount`/`update`/`unmount` dengan render sinkron (`flushSync`) agar perilakunya
dapat diuji melalui kontrak adapter.

```ts
import { createReactBridge } from '@simpleui/react';

const bridge = createReactBridge();
bridge.mount(container, { items: ['a', 'b'], label: 'daftar' });
bridge.update({ items: ['c'], label: 'daftar' });
bridge.unmount();
```

- Peer: `react` dan `react-dom` >= 19.
- Komponen SimpleUI sesungguhnya (DataGrid) belum ada; bridge ini menjadi bukti
  integrasi lifecycle dan akan menjadi dasar adapter komponen.

## DataGrid (DG-050)

```tsx
import { DataGrid } from '@simpleui/react';
import '@simpleui/datagrid/styles.css';

<DataGrid
  columns={[{ dataField: 'name', caption: 'Nama' }]}
  rows={rows}
  keyExpr="id"
  sortBy={sortBy}
  selectedKeys={selected}
  onSortChange={setSortBy}
  onSelectionChange={setSelected}
/>;
```

- `StrictMode` aman: mount/unmount ganda tidak menyisakan DOM/listener.
- Controlled: `sortBy`, `pageIndex`/`pageSize`, `selectedKeys`; UI kembali ke
  props bila parent tidak memperbarui.
- Update `rows`/`columns` tanpa re-mount.
