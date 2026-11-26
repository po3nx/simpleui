# @simpleui/vue

Adapter Vue 3 untuk SimpleUI. **Tahap spike (FND-028)**: bridge lifecycle
dengan state reaktif; `update` menunggu `nextTick` agar DOM sudah terbarui.

```ts
import { createVueBridge } from '@simpleui/vue';

const bridge = createVueBridge();
bridge.mount(container, { items: ['a', 'b'] });
await bridge.update({ items: ['c'] });
bridge.unmount();
```

- Peer: `vue` >= 3.5.
- Komponen SimpleUI sesungguhnya belum ada; bridge ini membuktikan
  mount/update/unmount tanpa sisa DOM.

## DataGrid (DG-051)

```vue
<script setup lang="ts">
import { DataGrid } from '@simpleui/vue';
import '@simpleui/datagrid/styles.css';
const sortBy = ref([]);
</script>

<template>
  <DataGrid
    :columns="[{ dataField: 'name', caption: 'Nama' }]"
    :rows="rows"
    key-expr="id"
    v-model:sort-by="sortBy"
  >
    <template #cell="{ value }"
      ><b>{{ value }}</b></template
    >
  </DataGrid>
</template>
```

- `v-model:sort-by`, `v-model:page-index`, `v-model:selected-keys`.
- Slot `cell` dan `header` dirender lewat template bridge.
- Unmount membersihkan grid; update `rows` tanpa re-mount.
