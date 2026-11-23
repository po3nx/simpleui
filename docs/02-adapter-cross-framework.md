# 02 — Arsitektur Adapter Cross-Framework

> **Status:** Draft v1.0 · **Owner:** Adapter engineer · **Reviewer:** Tech Lead
> **Prasyarat:** [01 — Arsitektur](01-arsitektur.md) · [00 — Rule Umum](00-rule-umum.md)
> **Tujuan:** satu perilaku komponen yang identik di JavaScript, TypeScript,
> React, Vue, dan Angular, tanpa menduplikasi logika.

---

## 1. Masalah yang diselesaikan

Consumer memakai framework berbeda, tetapi mengharapkan:

- nama opsi dan perilaku yang sama;
- event dengan payload yang sama;
- dukungan template/slot yang idiomatik;
- two-way binding sesuai konvensi framework;
- performa dan ukuran bundle yang wajar;
- tidak ada bug yang hanya muncul di satu framework.

Pendekatan yang dipilih: **core DOM engine + adapter tipis + template bridge +
contract test suite**. Core adalah satu-satunya tempat perilaku hidup.

---

## 2. Model adapter

### 2.1 Tiga tanggung jawab adapter

1. **Options bridge** — memetakan props framework ke options core, dengan diff
   agar tidak membuat ulang instance.
2. **Event bridge** — meneruskan event core ke callback/output framework dan
   memetakan payload.
3. **Template bridge** — menerjemahkan template framework (React node, Vue
   slot, Angular `TemplateRef`) menjadi render function yang dipanggil core.

Adapter **DILARANG**:

- mengimplementasikan sorting/filtering/selection sendiri;
- memanipulasi DOM internal komponen;
- menyimpan state duplikat yang tidak ada di core;
- mengakses internal package (deep import).

### 2.2 Diagram lifecycle

```text
Framework component mount
        │
        ├─ buat host element
        ├─ buat core instance (options hasil mapping)
        ├─ daftarkan event listener → callback framework
        ├─ daftarkan template bridge
        └─ mount core (load data, render)
                │
                ├─ props berubah → diff → core.option(patch)
                ├─ event core → callback/output framework
                └─ template diminta → render via framework
        │
Framework component unmount
        │
        ├─ lepas listener
        ├─ dispose core (batalkan async, lepas DOM)
        └─ bersihkan referensi & template cache
```

### 2.3 Kontrak adapter

Setiap adapter wajib memenuhi kontrak yang sama:

```ts
export interface AdapterContract<TOptions, TInstance> {
  mount(host: HTMLElement, options: TOptions): TInstance;
  update(instance: TInstance, patch: Partial<TOptions>): void;
  unmount(instance: TInstance): void;
  on(instance: TInstance, event: string, handler: (payload: unknown) => void): () => void;
  setTemplate(instance: TInstance, name: string, renderer: TemplateRenderer): void;
}
```

Kontrak ini diuji oleh `@simpleui/testing` untuk keempat adapter.

---

## 3. Options bridge

### 3.1 Aturan umum

- Nama opsi **identik** dengan core; hanya konvensi penulisan yang berubah.
- Perubahan props di-diff secara dangkal per key; objek besar (columns,
  dataSource) dibandingkan dengan strategi yang terdokumentasi.
- `dataSource` yang berubah identity tetapi sama secara struktural tidak boleh
  memicu reload penuh; gunakan `dataSource.version` atau pembanding khusus.
- Opsi yang tidak berubah tidak boleh memicu render.
- Nilai `undefined` berarti "kembali ke default", bukan "hapus".

### 3.2 Diff dan update

```ts
function diffOptions<T extends object>(prev: T, next: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (!Object.is(prev[key], next[key])) patch[key] = next[key];
  }
  return patch;
}
```

Untuk koleksi (columns, summary), adapter menyediakan pembanding dangkal
berbasis ID/fungsi; jika tidak dapat dibandingkan, kirim ulang koleksi dan
biarkan core yang melakukan normalisasi/memoization.

### 3.3 Controlled vs uncontrolled

| Framework | Uncontrolled | Controlled | Catatan |
|---|---|---|---|
| React | `defaultValue` | `value` + `onValueChange` | Tanpa `value`, state internal |
| Vue | `default-value` | `v-model` | `modelValue` + `update:modelValue` |
| Angular | `defaultValue` | `[(value)]` | `valueChange` output |
| Vanilla | opsi awal | `option('value', v)` | Event `valueChanged` |

Aturan:

- Jika controlled, core **tidak** mengubah state sendiri tanpa memanggil
  callback; UI menunggu props baru.
- Jika callback tidak mengubah props (controlled "read-only"), UI tetap
  menampilkan nilai lama; jangan optimistically update.
- Mode uncontrolled menyimpan state internal dan tetap memancarkan event.
- Transisi controlled ↔ uncontrolled **DILARANG**; dokumentasikan error di
  development.

---

## 4. Event bridge

### 4.1 Penamaan

| Core event | React | Vue (template) | Angular | Vanilla |
|---|---|---|---|---|
| `cellClick` | `onCellClick` | `@cell-click` | `(cellClick)` | `on('cellClick')` |
| `selectionChanged` | `onSelectionChanged` | `@selection-changed` | `(selectionChanged)` | `on('selectionChanged')` |
| `rowUpdated` | `onRowUpdated` | `@row-updated` | `(rowUpdated)` | `on('rowUpdated')` |
| `optionChanged` | `onOptionChanged` | `@option-changed` | `(optionChanged)` | `on('optionChanged')` |

Payload event **WAJIB** sama di semua adapter, termasuk nama field. Adapter
tidak boleh menambah/mengurangi field.

### 4.2 Event payload

```ts
export interface CellClickEvent<T> {
  readonly rowKey: Key;
  readonly columnId: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly data: T;
  readonly originalEvent: MouseEvent;
  readonly cancel: boolean;
  preventDefault(): void;
}
```

- Event object read-only kecuali `cancel`/`preventDefault()` yang eksplisit.
- `originalEvent` boleh diteruskan, tetapi jangan menyimpan referensinya.
- Event yang dapat dibatalkan wajib mendokumentasikan efek pembatalan.
- Event tidak boleh dipancarkan setelah `dispose()`.

### 4.3 Urutan event

Contoh update sel:

```text
editingStart → (validasi) → rowUpdating → saving → rowUpdated → saved → selectionChanged?
```

Urutan ini adalah kontrak dan diuji di parity suite.

---

## 5. Template bridge

### 5.1 Konsep

Core tidak mengetahui React/Vue/Angular. Core hanya tahu:

```ts
export interface TemplateContext<T> {
  readonly data: T;
  readonly row?: T;
  readonly column?: Column;
  readonly index: number;
  readonly value: unknown;
}

export type TemplateRenderer = (
  container: HTMLElement,
  context: TemplateContext<unknown>,
) => TemplateHandle;

export interface TemplateHandle {
  update(context: TemplateContext<unknown>): void;
  dispose(): void;
}
```

Adapter mengimplementasikan `TemplateRenderer` dengan framework masing-masing.
Core memanggil `renderer(container, context)` saat sel/row pertama kali
dirender, lalu `handle.update(context)` saat data berubah, dan
`handle.dispose()` saat node didaur ulang/dibuang.

### 5.2 React

```tsx
function createReactTemplate(node: ReactNode): TemplateRenderer {
  return (container, context) => {
    const root = createRoot(container);
    const render = (ctx: TemplateContext<unknown>) =>
      root.render(<TemplateContextProvider value={ctx}>{node}</TemplateContextProvider>);
    render(context);
    return {
      update: render,
      dispose: () => root.unmount(),
    };
  };
}
```

Catatan:

- Gunakan `createRoot` per container template; jangan render seluruh grid dari
  React.
- `root.unmount()` wajib dipanggil saat node didaur ulang untuk mencegah leak.
- Dukung render prop: `cellRender={(ctx) => <span>{ctx.value}</span>}`.
- StrictMode: mount/unmount ganda harus aman; jangan menyimpan state global.

### 5.3 Vue

```ts
import { createApp, h, type App } from 'vue';

function createVueTemplate(slot: Slot): TemplateRenderer {
  return (container, context) => {
    const app: App = createApp({
      render: () => h(TemplateWrapper, { context }, { default: slot }),
    });
    app.mount(container);
    return {
      update: (ctx) => { /* reaktif via provide/props */ },
      dispose: () => app.unmount(),
    };
  };
}
```

Catatan:

- Jangan memakai `innerHTML` untuk slot.
- Gunakan `provide/inject` atau props reaktif untuk update context.
- Pastikan `app.unmount()` melepas effect scope.

### 5.4 Angular

```ts
function createAngularTemplate(
  templateRef: TemplateRef<TemplateContext<unknown>>,
  viewContainer: ViewContainerRef,
): TemplateRenderer {
  const viewRef = viewContainer.createEmbeddedView(templateRef, context);
  return {
    update: (ctx) => {
      Object.assign(viewRef.context, ctx);
      viewRef.markForCheck();
    },
    dispose: () => viewRef.destroy(),
  };
}
```

Catatan:

- Gunakan `EmbeddedViewRef`, bukan `innerHTML`.
- Template Angular di-render di `ViewContainerRef` yang disediakan core.
- Perubahan context harus memicu `markForCheck()` dan berjalan di zone yang
  benar.
- `ng-template` dengan `let-data` didukung; dokumentasikan context type.

### 5.5 Vanilla

```ts
const grid = new SimpleUI.DataGrid(element, {
  columns: [{
    dataField: 'name',
    cellTemplate: (container, { data }) => {
      container.textContent = data.name;
    },
  }],
});
```

- Template function menerima container dan context.
- String HTML **DILARANG** secara default; jika `allowHtml: true`, string
  disanitasi.
- Template function bertanggung jawab membersihkan resource-nya sendiri;
  sediakan `onDispose` di context.

### 5.6 Aturan template

- `R-TPL-01` **WAJIB**: template menerima container; tidak mengembalikan string
  HTML mentah.
- `R-TPL-02` **WAJIB**: template di-dispose saat node didaur ulang.
- `R-TPL-03` **DILARANG**: template mengakses instance internal komponen.
- `R-TPL-04` **WAJIB**: template error ditangkap; satu sel error tidak boleh
  merusak grid.
- `R-TPL-05` **WAJIB**: template yang memakan waktu > 16 ms didokumentasikan
  sebagai risiko performa.

---

## 6. Adapter per framework

### 6.1 React

```tsx
import { DataGrid } from '@simpleui/react/datagrid';

export function OrdersGrid({ rows }: { rows: Order[] }) {
  const [selected, setSelected] = useState<Key[]>([]);

  return (
    <DataGrid<Order>
      dataSource={rows}
      keyExpr="id"
      columns={[
        { dataField: 'number', caption: 'No.', width: 120 },
        { dataField: 'customer', caption: 'Customer' },
        { dataField: 'total', dataType: 'number', format: 'currency' },
      ]}
      selection={{ mode: 'multiple' }}
      selectedRowKeys={selected}
      onSelectionChanged={(e) => setSelected(e.selectedRowKeys)}
    />
  );
}
```

Ketentuan:

- Wrapper memakai `useRef` untuk host dan instance, `useEffect` untuk
  mount/unmount.
- StrictMode: effect dijalankan dua kali; `dispose()` harus bersih.
- Jangan memakai `useLayoutEffect` untuk mount awal (SSR warning).
- Props callback disimpan di ref agar tidak memicu re-mount.
- `key` pada grid tidak boleh berubah karena state selection.

### 6.2 Vue

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { DataGrid } from '@simpleui/vue/datagrid';

const rows = ref<Order[]>([]);
const selected = ref<Key[]>([]);
</script>

<template>
  <DataGrid
    :data-source="rows"
    key-expr="id"
    :columns="columns"
    selection-mode="multiple"
    v-model:selected-row-keys="selected"
  >
    <template #cell="{ data, column }">
      <strong v-if="column.id === 'total'">{{ formatMoney(data.total) }}</strong>
      <span v-else>{{ data[column.dataField] }}</span>
    </template>
  </DataGrid>
</template>
```

Ketentuan:

- Gunakan `defineComponent`/`<script setup>` dan `h()` untuk wrapper.
- Slot diubah menjadi `TemplateRenderer`; jangan render slot di luar lifecycle.
- `v-model` memetakan `modelValue`/`update:modelValue` (atau nama model).
- `onUnmounted` wajib `dispose()`.
- Hindari `watch` dalam; gunakan `watch` pada props dengan `flush: 'post'`.

### 6.3 Angular

```ts
import { Component, signal } from '@angular/core';
import { DataGridComponent, type Column } from '@simpleui/angular/datagrid';

@Component({
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <sui-data-grid
      [dataSource]="rows()"
      keyExpr="id"
      [columns]="columns"
      [selection]="{ mode: 'multiple' }"
      [(selectedRowKeys)]="selected"
      (cellClick)="onCellClick($event)"
    >
      <ng-template suiCellTemplate let-data let-column="column">
        {{ data[column.dataField] }}
      </ng-template>
    </sui-data-grid>
  `,
})
export class OrdersComponent {
  readonly rows = signal<Order[]>([]);
  readonly columns: Column<Order>[] = [];
  selected: Key[] = [];
  onCellClick(event: CellClickEvent<Order>): void { /* ... */ }
}
```

Ketentuan:

- Standalone component, `ChangeDetectionStrategy.OnPush`.
- `@Input()`/`@Output()` atau signal input/output (dukung versi minimum).
- Jalankan operasi internal di luar NgZone (`runOutsideAngular`) lalu masuk
  kembali hanya saat memancarkan event yang memengaruhi UI Angular.
- `ngOnDestroy` wajib `dispose()`.
- `ng-template` diambil dengan `@ContentChild(TemplateRef)`.
- SSR: `isPlatformBrowser` guard, `afterNextRender` untuk mount.
- Build dengan `ng-packagr` (partial Ivy), bukan Vite library mode.

### 6.4 Vanilla/JavaScript

```html
<link rel="stylesheet" href="https://cdn.example.com/simpleui/theme.css" />
<script src="https://cdn.example.com/simpleui/simpleui.umd.js"></script>
<div id="grid"></div>
<script>
  const grid = new SimpleUI.DataGrid(document.getElementById('grid'), {
    dataSource: rows,
    keyExpr: 'id',
    columns: [{ dataField: 'name' }],
  });
  grid.on('selectionChanged', (e) => console.log(e.selectedRowKeys));
</script>
```

- UMD global `SimpleUI`, nama class stabil.
- ESM juga tersedia untuk bundler.
- jQuery bridge opsional:

```js
$('#grid').simpleUIDataGrid({ dataSource: rows, keyExpr: 'id' });
```

- jQuery bridge berada di subpath terpisah (`@simpleui/vanilla/jquery`) dan
  tidak menambah dependency core.

### 6.5 TypeScript

- Semua paket mengirim `.d.ts` + declaration map.
- Generic `DataGrid<T>` mengalir ke columns, events, dan template context.
- `strict` dan `exactOptionalPropertyTypes` kompatibel.
- Uji `arethetypeswrong` untuk semua resolusi modul (`node16`, `bundler`).

---

## 7. SSR dan framework meta-framework

| Framework | Strategi |
|---|---|
| Next.js (React) | Komponen `'use client'`, mount di `useEffect`; jangan akses `window` saat import |
| Nuxt (Vue) | `<ClientOnly>` atau `onMounted`; plugin client-only |
| Angular Universal | `isPlatformBrowser`, `afterNextRender`, hindari `document` di constructor |
| SvelteKit (vanilla) | `onMount` |
| Astro | island client-only |

Aturan:

- `R-SSR-01` **WAJIB**: modul import-safe di Node (tidak ada akses DOM top-level).
- `R-SSR-02` **WAJIB**: render SSR hanya host kosong; tidak ada markup internal
  yang di-hydrate.
- `R-SSR-03` **DILARANG** memakai `useLayoutEffect` untuk mount awal di React.
- `R-SSR-04` **WAJIB**: test SSR (renderToString) untuk setiap adapter.
- `R-SSR-05` **WAJIB**: dispose saat route berubah/unmount.

---

## 8. Parity test suite

### 8.1 Tujuan

Memastikan satu skenario menghasilkan perilaku identik di semua adapter.

### 8.2 Desain

```ts
import { describeAdapterContract } from '@simpleui/testing/adapter';

describeAdapterContract('DataGrid', {
  create: (container, options) => createHarness('react', container, options),
  scenarios: 'datagrid-core',
});
```

Suite berisi ± 40 skenario:

1. mount dengan data kosong;
2. mount dengan 10 baris;
3. update columns;
4. update dataSource;
5. sorting single & multi;
6. filter row & search;
7. selection single/multiple/select-all;
8. keyboard navigation;
9. edit commit/cancel;
10. template render & update;
11. event payload & urutan;
12. controlled vs uncontrolled;
13. unmount membersihkan listener/observer;
14. remount 100× tanpa leak;
15. StrictMode/double mount;
16. SSR renderToString;
17. error state;
18. loading state;
19. RTL;
20. a11y roles/aria;
21. destroy saat loading;
22. abort request saat unmount;
23. state persistence;
24. column resize/reorder;
25. export dipanggil;
26. context menu;
27. focus restoration;
28. live region announcement;
29. locale change;
30. theme change;
31. data reload mempertahankan seleksi;
32. duplicate key handling;
33. invalid option handling;
34. XSS payload di cell;
35. URL berbahaya di link column;
36. CSV injection;
37. prototype pollution via options;
38. large dataset (1.000 baris);
39. concurrent update;
40. dispose idempoten.

### 8.3 CI

- Setiap adapter menjalankan suite yang sama di Chromium (PR) dan
  Chromium/Firefox/WebKit (nightly).
- Kegagalan satu adapter memblokir rilis komponen.
- Payload security dijalankan untuk semua adapter; tidak boleh ada perbedaan.

---

## 9. Performa adapter

| Aturan | Detail |
|---|---|
| `R-ADP-01` | Jangan re-mount core saat props berubah; update via `option()`. |
| `R-ADP-02` | Batching: beberapa perubahan props dalam satu tick → satu update. |
| `R-ADP-03` | Callback disimpan di ref/closure stabil; jangan memicu effect ulang. |
| `R-ADP-04` | Template di-cache per tipe; jangan membuat root React per render. |
| `R-ADP-05` | Jangan memakai deep equality mahal pada setiap render. |
| `R-ADP-06` | Ukuran adapter ≤ 5 KB gzip per komponen. |
| `R-ADP-07` | Unmount harus < 50 ms untuk grid 1.000 baris. |

---

## 10. Versioning dan peer dependency

- Semua paket memakai versi yang sama (fixed group).
- Peer dependency:
  - React `>=18 <20`
  - Vue `>=3.4 <4`
  - Angular `>=17 <23` (ditinjau tiap rilis)
  - TypeScript `>=5.4`
- CI menguji versi minimum dan versi terbaru yang didukung.
- Kenaikan minimum version = breaking change + ADR + migration note.
- Adapter tidak boleh membundel framework; framework selalu peer.

---

## 11. Checklist adapter baru

- [ ] Host element dibuat dan dibersihkan.
- [ ] Core instance dibuat sekali; update memakai `option()`.
- [ ] Semua event dipetakan dan payload sama.
- [ ] Template bridge mendukung render, update, dispose.
- [ ] Controlled/uncontrolled berfungsi.
- [ ] StrictMode/double mount aman.
- [ ] SSR import-safe dan render host kosong.
- [ ] Cleanup listener, observer, timer, dan instance framework.
- [ ] Parity suite lulus.
- [ ] Ukuran bundle ≤ budget.
- [ ] Docs + contoh + changeset.
- [ ] Test mount/unmount 100× tanpa pertumbuhan listener/memory.

---

*Kontrak detail tiap event dan opsi ada di
[DataGrid API](components/datagrid/03-api.md).*
