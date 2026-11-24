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
