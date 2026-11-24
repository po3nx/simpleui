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
