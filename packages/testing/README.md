# @simpleui/testing

Fixture deterministik dan kontrak adapter untuk test SimpleUI.

## Fixture

```ts
import {
  createRows,
  createRowFactory,
  createSeededRandom,
} from '@simpleui/testing';

const rows = createRows({ seed: 'datagrid', count: 50 }); // selalu sama
const rowAt = createRowFactory({ seed: 'datagrid' });
const random = createSeededRandom('filter-test'); // int/pick/shuffle/chance
```

- Semua data memakai **seeded random**; data acak tanpa seed dilarang
  (docs/04 §4).
- `createRows` mengembalikan baris bertipe `PersonRow` (id, name, age, active,
  city) dengan rentang nilai tetap.
- `SECURITY_PAYLOADS` menyediakan payload XSS, URL, CSV, dan prototype untuk
  suite keamanan lintas adapter.

## Kontrak adapter

```ts
import { describeAdapterContract } from '@simpleui/testing/adapter';

describeAdapterContract('DataGrid (react)', {
  create: (container, options) => createReactHarness(container, options),
  options: { label: 'awal' },
});
```

Skenario bawaan (dijalankan untuk setiap adapter):

1. mount menempelkan tepat satu element;
2. update tidak melepas element;
3. unmount melepas element;
4. mount → unmount → mount ulang;
5. unmount idempoten.

`runAdapterContract()` tersedia bila ingin menjalankan kontrak tanpa Vitest
(mengembalikan daftar hasil, tidak melempar).

## Catatan

Subpath `@simpleui/testing/adapter` membutuhkan Vitest sebagai peer opsional.
Entry utama bebas runtime test.
