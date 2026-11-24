# @simpleui/vanilla

Adapter JavaScript/TypeScript tanpa framework. **Tahap spike (FND-028)**:
referensi perilaku lifecycle untuk adapter lain.

```ts
import { createVanillaBridge } from '@simpleui/vanilla';

const bridge = createVanillaBridge();
bridge.mount(container, { items: ['a', 'b'] });
bridge.update({ items: ['c'] });
bridge.unmount();
```

Tidak ada dependency runtime; jQuery tetap opsional untuk consumer lama
(ADR-0003).
