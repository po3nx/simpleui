# @simpleui/core

Runtime bersama untuk semua komponen SimpleUI: kernel lifecycle, event
bertipe, dan manajemen resource.

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

## State

```ts
import { createSelector, createScheduler, createStore } from '@simpleui/core';

const store = createStore({ rows: [] as number[], filter: '' });

store.transaction(() => {
  store.setState({ rows: [1, 2, 3] });
  store.setState({ filter: 'a' });
}); // satu notifikasi untuk kedua perubahan

const selectFiltered = createSelector((state) => state.rows.filter(Boolean));
const rows = selectFiltered(store.getState()); // memoized

const scheduler = createScheduler();
store.subscribe((state) => scheduler.scheduleRender(() => render(state)));
```

- `setState` menerima objek parsial atau fungsi `(state) => patch`.
- `transaction()` menunda notifikasi sampai blok terluar selesai; `getState()` di
  dalam transaksi sudah melihat nilai baru.
- Listener dipanggil sinkron; error dikumpulkan sebagai `AggregateError`.
- `createSelector` memoized: identitas hasil stabil bila `isEqual` menganggap
  nilainya sama.
- `createScheduler` menggabungkan render per frame (`requestAnimationFrame`,
  fallback `setTimeout` 16ms) dan notifikasi via microtask; `flush()` berguna
  untuk test, `dispose()` membatalkan frame tertunda.
- `yieldToMain()` memakai `scheduler.yield()` bila tersedia.

## DOM

```ts
import {
  classNames,
  createElement,
  setAttributes,
  setStyle,
} from '@simpleui/core';

const cell = createElement('div', {
  className: classNames('sui-cell', selected && 'sui-cell--selected'),
  attrs: { role: 'gridcell', 'data-row': 3 },
  text: String(value),
});

setAttributes(cell, { 'aria-selected': selected });
setStyle(cell, '--sui-cell-width', `${width}px`);
```

Aturan yang ditegakkan:

- Teks selalu lewat `textContent`; tidak ada `innerHTML`.
- Atribut `on*` dan URL `javascript:` ditolak dengan `SUI-DOM-001`.
- Style dinamis lewat CSSOM (`style.setProperty`), dan nilai yang mengandung
  `;`/`{`/`}` ditolak agar tidak menyelundupkan properti.
- `getScrollParent()` dan `scrollIntoViewIfNeeded()` membantu virtualisasi dan
  navigasi keyboard.

## Template

Adapter framework menerjemahkan template menjadi `TemplateRenderer`; core hanya
memanggil render/update/dispose (kontrak di docs/02 §5).

```ts
import { createTemplateBridge } from '@simpleui/core';

// Vanilla: template menulis ke container, tanpa HTML mentah.
const bridge = createTemplateBridge<Row>((container, { data }) => {
  container.textContent = data.name;
});

const handle = bridge.createHandle(cell, {
  data: row,
  index: 0,
  value: row.name,
});

handle.update({ data: nextRow, index: 0, value: nextRow.name });
handle.dispose(); // atau bridge.dispose() untuk seluruh sel
```

- Template vanilla menerima container dan menulis DOM sendiri (R-TPL-01);
  `update` membersihkan container sebelum menulis ulang.
- Adapter framework mengembalikan handle `{ update, dispose }`; bridge memanggil
  `dispose` saat node didaur ulang sehingga tidak ada kebocoran (R-TPL-02).
- Error render/update/dispose ditangkap dan dilaporkan lewat `onError`; satu sel
  gagal tidak merusak grid (R-TPL-04).

## Aksesibilitas

```ts
import {
  Announcer,
  FocusTrap,
  RovingTabindex,
  isEscapeKey,
} from '@simpleui/core';

const rows = [...root.querySelectorAll<HTMLElement>('[role="row"]')];
const roving = new RovingTabindex({ getItems: () => rows });
root.addEventListener('keydown', (event) => roving.handleKeyDown(event));

const trap = new FocusTrap(dialog);
trap.activate(); // fokus masuk; deactivate() mengembalikannya

dialog.addEventListener('keydown', (event) => {
  if (isEscapeKey(event.key)) closeDialog();
});

const announcer = new Announcer({ throttleMs: 150 });
announcer.announce('3 baris dipilih');
```

- `RovingTabindex` — satu item `tabindex="0"`, sisanya `-1`; panah + Home/End,
  orientasi `vertical`/`horizontal`/`both`, opsi `wrap`.
- `FocusTrap` — menahan `Tab`/`Shift+Tab` di dalam root dan mengembalikan fokus
  saat `deactivate()`. Menutup overlay tetap tanggung jawab pemanggil
  (`isEscapeKey`), sesuai R-A11Y-03.
- `Announcer` — satu region `polite` per instance dengan `aria-atomic="true"`
  untuk satu instance; pengumuman di-throttle agar tidak membanjiri
  screen reader
  (R-A11Y-08). Region `assertive` dibuat hanya bila dipakai.
- `nextIndex` dan predikat keyboard adalah fungsi murni sehingga bisa dipakai
  model grid tanpa DOM.

## Layout

```ts
import { createLayoutService } from '@simpleui/core';

const layout = createLayoutService(); // createObserver bisa di-inject untuk test

const stop = layout.observe(gridElement, ({ width, height }) => {
  gridElement.style.setProperty('--sui-grid-viewport', `${height}px`);
});

layout.measure(element); // pengukuran sekali
stop(); // berhenti untuk satu listener
layout.dispose(); // putus semua observer (R-ARC-08)
```

- Ukuran awal langsung dikirim saat `observe()`, jadi consumer tidak perlu
  memanggil `measure()` lebih dulu.
- Perubahan ukuran yang sama tidak memicu notifikasi berulang.
- Tanpa `ResizeObserver` (SSR/test) layanan tetap memberi satu pengukuran.
- `dispose()` memutus observer dan membersihkan seluruh listener.

## Internasionalisasi

```ts
import { createLocaleService } from '@simpleui/core';

const locale = createLocaleService({
  locale: 'id-ID',
  timeZone: 'Asia/Jakarta',
  messages: { 'sui.common.pager.pageOf': 'Halaman {page} dari {pages}' },
});

locale.t('sui.common.pager.pageOf', { page: 2, pages: 7 }); // "Halaman 2 dari 7"
locale.t('sui.common.selection.selected', { count: 1 }); // plural via Intl.PluralRules
locale.formatNumber(1234.5); // "1.234,5"
locale.formatDate(Date.now(), { dateStyle: 'medium' });
locale.direction; // 'ltr' | 'rtl'
```

- Katalog bawaan berbahasa Inggris; opsi `messages` hanya menambah atau
  menimpa key, tidak menghapus default.
- Key mengikuti `sui.<komponen>.<area>.<key>`; placeholder `{nama}` disisipkan
  sebagai teks biasa (tidak dievaluasi sebagai kode, tidak menghasilkan HTML).
- Pesan plural memakai `Intl.PluralRules`; bentuk `zero` dipakai eksplisit saat
  `count: 0`.
- Locale fallback: `locale` → `fallbackLocale` → `en`. Timezone dan mata uang
  dapat ditetapkan eksplisit agar hasil tidak bergantung mesin.
- Formatter `Intl` di-cache sehingga memformat ribuan baris tidak membuat
  instance baru.
- Pseudo-locale `en-XA` memberi aksen dan memperpanjang teks ±30% untuk visual
  regression; `isRtlLocale`/`getDirection` menentukan arah layout.
- Locale, timezone, atau mata uang yang tidak valid dilempar sebagai
  `SUI-I18N-001`.

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

Coverage gate paket `core`: 90% baris / 85% cabang.
