# @simpleui/core

Runtime bersama untuk semua komponen SimpleUI: kernel lifecycle, event
bertipe, dan manajemen resource ([ADR-0004](../../docs/adr/0004-rendering-engine.md),
[docs/01 §5](../../docs/01-arsitektur.md#5-runtime-core)).

## Kernel

`ComponentKernel` menyediakan lifecycle eksplisit dan pembersihan resource yang
terjamin. Komponen framework-agnostic meng-extend class ini.

```ts
import { ComponentKernel } from '@simpleui/core';

interface CounterOptions {
  label: string;
  step: number;
}

type CounterEvents = {
  valueChanged: { value: number };
};

class Counter extends ComponentKernel<CounterOptions, CounterEvents> {
  #value = 0;

  constructor(options?: Partial<CounterOptions>) {
    super({ label: 'Counter', step: 1 }, options);
  }

  protected createElement(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'sui-counter';
    return root;
  }

  protected render(): void {
    const element = this.element;
    if (!element) return;
    element.textContent = `${this.option('label')}: ${this.#value}`;
  }

  increment(): void {
    this.#value += this.option('step');
    this.emit('valueChanged', { value: this.#value });
    this.repaint();
  }
}

const counter = new Counter({ step: 2 });
counter.on('valueChanged', ({ value }) => console.log(value));
counter.mount(document.querySelector('#app')!);
```

### Lifecycle

```text
new Counter()        → create  (belum menyentuh DOM target)
.option({...})       → configure (hanya menyimpan)
.mount(container)    → element dibuat, listener dipasang, render pertama
.option(...)/repaint → render ulang
.dispose()           → resource dibersihkan, element dilepas
```

- `option()` sebelum `mount()` tidak memicu render.
- `beginUpdate()` / `endUpdate()` membatch banyak perubahan menjadi satu render.
- `dispose()` idempoten; aman dipanggil berkali-kali.
- Setelah `dispose()`, method lain melempar `SUI-CORE-002` di mode development
  dan menjadi no-op di production.

### Resource

Daftarkan semua listener, timer, observer, dan node milik instance lewat
`addDisposable()`; kernel akan membersihkannya dengan urutan LIFO.

```ts
protected onMount(element: HTMLElement): void {
  const onKeyDown = (event: KeyboardEvent) => {/* ... */};
  element.addEventListener('keydown', onKeyDown);
  this.addDisposable(() => element.removeEventListener('keydown', onKeyDown));
}
```

## Event

```ts
counter.on('valueChanged', (payload) => payload.value); // → unsubscribe
counter.off('valueChanged', handler);
```

- `Emitter` memakai nama event `pastTense`/`noun + Changed`.
- Error di satu listener tidak menghentikan listener lain; error dikumpulkan dan
  dilempar sebagai `AggregateError`, atau diteruskan ke `onListenerError` bila
  disediakan.

## Kode error

| Kode           | Arti                                                         |
| -------------- | ------------------------------------------------------------ |
| `SUI-CORE-001` | Opsi tidak dikenal atau nilai opsi tidak valid               |
| `SUI-CORE-002` | Method dipanggil setelah `dispose()` (mode development)      |
| `SUI-CORE-003` | Urutan lifecycle tidak sah (`endUpdate` tanpa `beginUpdate`) |

```ts
import { isSimpleUIError } from '@simpleui/core';

try {
  counter.option({ tidakAda: true } as never);
} catch (error) {
  if (isSimpleUIError(error)) console.warn(error.code); // SUI-CORE-001
}
```

## API

| Ekspor            | Kegunaan                                        |
| ----------------- | ----------------------------------------------- |
| `ComponentKernel` | Basis komponen: lifecycle, opsi, event, dispose |
| `Emitter`         | Event emitter bertipe (dipakai kernel)          |
| `DisposableBag`   | Kumpulan pembersihan resource, urutan LIFO      |
| `mergeOptions`    | Validasi dan gabung opsi dengan default         |
| `SimpleUIError`   | Error dengan kode stabil                        |
| `isSimpleUIError` | Type guard                                      |
| `isDevMode`       | True bila bukan `NODE_ENV=production`           |
| `VERSION`         | Versi paket                                     |

## Test

```bash
pnpm --filter @simpleui/core test
```

Coverage gate paket `core`: 90% baris / 85% cabang
([docs/00 §7.2](../../docs/00-rule-umum.md#72-coverage-gate)).
