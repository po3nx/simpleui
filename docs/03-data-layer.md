# 03 — Data Layer

> **Status:** Draft v1.0 · **Owner:** Core engineer · **Reviewer:** Tech Lead
> **Prasyarat:** [01 — Arsitektur](01-arsitektur.md) · [05 — Security](05-security.md)
> **Dipakai oleh:** DataGrid, PivotGrid, TreeList, Chart (data adapter)

---

## 1. Tujuan

Data layer menyediakan satu abstraksi data yang:

- dapat memakai array lokal, REST, OData, atau custom store;
- mendukung paging, sorting, filtering, grouping, summary, dan CRUD;
- aman terhadap input tidak tepercaya;
- dapat dibatalkan, di-cache, dan di-retry dengan benar;
- berperilaku sama di semua framework.

---

## 2. Interface publik

```ts
export type Key = string | number;
export type KeyExpr<T> = keyof T | readonly (keyof T)[] | ((row: T) => Key);

export interface SortDescriptor {
  readonly selector: string;
  readonly desc: boolean;
}

export type FilterOperator =
  | 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte'
  | 'contains' | 'notContains' | 'startsWith' | 'endsWith'
  | 'in' | 'notIn' | 'between'
  | 'isNull' | 'isNotNull';

export type FilterExpression =
  | readonly [field: string, operator: FilterOperator, value?: unknown]
  | readonly ['and' | 'or', ...FilterExpression[]]
  | readonly ['not', FilterExpression];

export interface GroupDescriptor {
  readonly selector: string;
  readonly desc?: boolean;
  readonly isExpanded?: boolean;
}

export interface LoadOptions {
  readonly skip?: number;
  readonly take?: number;
  readonly sort?: readonly SortDescriptor[];
  readonly filter?: FilterExpression;
  readonly group?: readonly GroupDescriptor[];
  readonly requireTotalCount?: boolean;
  readonly requireGroupCount?: boolean;
  readonly signal?: AbortSignal;
}

export interface LoadResult<T> {
  readonly data: readonly T[];
  readonly totalCount?: number;
  readonly groupCount?: number;
  readonly summary?: Readonly<Record<string, number>>;
}

export interface StoreCapabilities {
  readonly remote: boolean;
  readonly sort: boolean;
  readonly filter: boolean;
  readonly group: boolean;
  readonly summary: boolean;
  readonly paging: boolean;
  readonly crud: boolean;
}

export interface Store<T> {
  readonly key: KeyExpr<T>;
  readonly capabilities: StoreCapabilities;
  load(options: LoadOptions): Promise<LoadResult<T>>;
  byKey(key: Key, signal?: AbortSignal): Promise<T | undefined>;
  insert?(values: Partial<T>): Promise<T>;
  update?(key: Key, values: Partial<T>): Promise<T>;
  remove?(key: Key): Promise<void>;
}
```

Aturan:

- `LoadOptions` dan `LoadResult` read-only; core tidak memutasi objek consumer.
- `signal` wajib dihormati oleh semua store.
- Store yang tidak mendukung operasi tertentu mengembalikan
  `capabilities.* = false`, bukan silently mengabaikan.
- `byKey` opsional untuk store remote yang tidak mendukung lookup tunggal;
  core memiliki fallback pencarian di halaman saat ini dengan peringatan.

---

## 3. Store bawaan

| Store | Kapan dipakai | Catatan |
|---|---|---|
| `ArrayStore<T>` | Data sudah di memori | Pipeline lokal penuh, mendukung CRUD |
| `CustomStore<T>` | Integrasi API arbitrer | Callback `load`, `byKey`, `insert`, `update`, `remove` |
| `ODataStore<T>` | OData v4 | Pushdown filter/sort/page/group, encoding aman |
| `RestStore<T>` | REST generik | Kontrak endpoint dapat dikonfigurasi |
| `CachedStore<T>` | Membungkus store lain | TTL, LRU, dedupe, invalidasi |

### 3.1 ArrayStore

- Menyimpan salinan dangkal array; tidak memutasi array consumer.
- Pipeline: filter → sort → group → summary → page.
- Mendukung `insert/update/remove` dengan validasi key.
- Duplicate key **WAJIB** terdeteksi dan menghasilkan error
  `SUI-DATA-003` (bukan menimpa diam-diam).

### 3.2 CustomStore

```ts
const store = new CustomStore<Order>({
  key: 'id',
  load: async (options) => {
    const response = await api.list(toQuery(options), { signal: options.signal });
    return { data: response.items, totalCount: response.total };
  },
  byKey: (key, signal) => api.get(key, { signal }),
  update: (key, values) => api.patch(key, values),
  capabilities: { remote: true, sort: true, filter: true, group: false, summary: false, paging: true, crud: true },
});
```

- Callback **WAJIB** menghormati `signal`.
- Error dari callback dinormalisasi menjadi `SimpleUIError` dengan code
  `SUI-DATA-*`.
- `load` harus mengembalikan bentuk `LoadResult`; core memvalidasi bentuknya.

### 3.3 ODataStore

- Hanya mendukung OData v4 JSON.
- Filter diserialisasi dari AST dengan encoding ketat; **DILARANG**
  menyambung string mentah dari input pengguna.
- `$top` dibatasi (`MAX_TAKE`), `$skip` non-negatif, `$orderby` hanya field yang
  lolos validasi.
- `$filter` dibatasi panjang dan kedalaman.
- URL dasar divalidasi (`https:` default; `http:` hanya untuk localhost/dev).
- Tidak mengirim credentials kecuali `withCredentials: true`.

---

## 4. Query pipeline lokal

Urutan **WAJIB** tetap:

```text
normalize → filter → sort → group → summary → page
```

Alasan: hasil grouping/summary harus konsisten dengan filter dan sort; paging
dilakukan paling akhir.

### 4.1 Filter

- Operator tertutup (union di atas); tidak ada operator dinamis dari string.
- Perbandingan string memakai `Intl.Collator` dengan locale eksplisit.
- `null`/`undefined` diperlakukan sama; `isNull` mencakup keduanya.
- `in`/`notIn` dibatasi jumlah nilai (default 1.000).
- Kedalaman ekspresi maksimum 10; jumlah node maksimum 200.
- **DILARANG** menerima regex dari pengguna secara default. Jika fitur regex
  diaktifkan (opt-in), pattern dibatasi panjang dan diperiksa dengan
  `safe-regex`; eksekusi di worker dengan timeout.

### 4.2 Sort

- Stable sort; multi-column mengikuti urutan descriptor.
- Null ordering eksplisit (`nullsFirst` default: `false` untuk asc).
- String sort memakai collator; numeric sort tidak mengubah tipe.
- Sort tidak boleh memutasi array input.

### 4.3 Group

- Group key dapat berupa satu atau beberapa field.
- Group descriptor mendukung `isExpanded` awal.
- Group count dibatasi (default 10.000); jika terlampaui, error
  `SUI-DATA-006` atau fallback dengan peringatan.
- Group summary dihitung dari item yang lolos filter.

### 4.4 Summary

- Agregasi bawaan: `sum`, `avg`, `min`, `max`, `count`.
- Custom summary adalah fungsi murni `(rows: readonly T[]) => number`.
- Summary untuk group dan total dihitung sekali per pipeline run.
- Nilai non-finite (`NaN`, `Infinity`) dinormalisasi dan dilaporkan.

### 4.5 Paging

- `skip`/`take` divalidasi: `skip >= 0`, `1 <= take <= MAX_TAKE` (default 10.000).
- Total count dihitung dari hasil sebelum paging.
- Untuk remote, `requireTotalCount` diteruskan; jika server tidak mengirim,
  UI menampilkan mode "unknown total".

---

## 5. Remote pushdown

Store mendeklarasikan kemampuan. Core memilih strategi:

```text
if (store.capabilities.filter && canPushdown(filter)) → kirim ke server
else → fetch halaman yang diperlukan → filter lokal (dengan batas)
```

Aturan:

- `R-DATA-01` **DILARANG** berpura-pura pushdown jika store tidak mendukung;
  hasil bisa salah.
- `R-DATA-02` **WAJIB**: jika filter lokal diterapkan pada data remote,
  batasi jumlah baris yang di-fetch (default 10.000) dan tampilkan peringatan
  di dev mode.
- `R-DATA-03` **WAJIB**: grouping remote hanya jika `capabilities.group`;
  jika tidak, gunakan grouping lokal pada halaman yang dimuat dan dokumentasikan
  keterbatasannya.
- `R-DATA-04` **WAJIB**: select-all pada data remote memerlukan dukungan server;
  jika tidak ada, select-all hanya untuk halaman saat ini dan UI menjelaskannya.

---

## 6. Caching, dedupe, cancellation, retry

### 6.1 Cache

- Cache key = hash dari normalized `LoadOptions` (sort, filter, group, skip,
  take) + versi data source.
- LRU dengan batas entri (default 20) dan TTL (default 5 menit).
- Invalidasi otomatis setelah `insert/update/remove`.
- Cache **DILARANG** menyimpan data sensitif jika `cacheSensitiveData` tidak
  diaktifkan (default `false`).

### 6.2 Dedupe

- Request identik yang sedang berjalan digabung; semua caller menerima hasil
  yang sama.
- Request dengan `signal` berbeda tetap berbagi promise; pembatalan satu caller
  tidak membatalkan yang lain.
- Request yang lebih baru untuk key yang sama membatalkan yang lama
  (last-write-wins) dan hasil lama diabaikan.

### 6.3 Retry

- Hanya untuk operasi idempoten (`GET`/`load`, `byKey`).
- Maksimum 2 retry, exponential backoff + jitter (200 ms, 800 ms).
- Tidak retry untuk 4xx (kecuali 408/429 dengan `Retry-After`).
- Retry dihentikan saat `signal` dibatalkan.
- **DILARANG** retry `POST/PATCH/DELETE` tanpa idempotency key.

### 6.4 Timeout

- Default 30 detik; dapat dikonfigurasi.
- Timeout memakai `AbortController` dan error `SUI-DATA-004`.
- UI menampilkan state error dengan tombol retry; tidak ada retry loop otomatis
  tanpa batas.

---

## 7. CRUD dan konsistensi

### 7.1 Mode editing

| Mode | Perilaku |
|---|---|
| `row` | Satu baris diedit, commit per baris |
| `cell` | Satu sel, commit per sel |
| `batch` | Banyak perubahan dikumpulkan, commit sekali |
| `popup`/`form` | Edit di dialog, commit saat simpan |

### 7.2 Alur simpan

```text
validasi lokal → onSaving (dapat dibatalkan) → store.update/insert/remove
→ sukses: update cache + state + onSaved
→ gagal: rollback state optimistik + tampilkan error + onSaveFailed
```

- Default **pessimistic**: UI menunggu server sebelum menutup editor.
- Optimistic mode opt-in; wajib punya rollback dan penanganan konflik.
- Konflik `409` dinormalisasi menjadi `SUI-DATA-409` dan memicu
  `saveConflict` event dengan data server (jika tersedia).
- **DILARANG** menganggap sukses hanya karena HTTP 200; validasi body.

### 7.3 Transaksi batch

- `beginBatch()` → kumpulkan perubahan → `commitBatch()`.
- Commit mengirim operasi secara berurutan; jika satu gagal, perilaku default
  adalah rollback seluruh batch (dapat dikonfigurasi).
- Batch kosong tidak mengirim request.

### 7.4 Otorisasi

- Data layer **tidak** menegakkan otorisasi; server wajib melakukannya.
- UI hanya menyembunyikan aksi berdasarkan konfigurasi (`allowEditing`,
  `allowDeleting`), bukan sebagai kontrol keamanan.
- Dokumentasikan di setiap halaman komponen.

---

## 8. State persistence

- Hanya state UI yang aman: sorting, filter, paging, column width/order,
  visibility, group expansion.
- **DILARANG** menyimpan data baris, token, atau nilai sel.
- Skema state memiliki `version` dan migrasi eksplisit.
- Validasi ukuran (default ≤ 100 KB) dan skema saat load; state korup diabaikan.
- Storage key diberi namespace `simpleui:<component>:<id>`.
- `StorageService` dapat diganti (memory, session, custom).
- **DILARANG** menyimpan state sensitif secara default; opsi
  `persistSensitiveState` harus opt-in dan didokumentasikan risikonya.

---

## 9. Error codes

| Code | Arti |
|---|---|
| `SUI-DATA-001` | Load options tidak valid |
| `SUI-DATA-002` | Bentuk respons store tidak valid |
| `SUI-DATA-003` | Duplicate key |
| `SUI-DATA-004` | Timeout |
| `SUI-DATA-005` | Request dibatalkan |
| `SUI-DATA-006` | Melebihi batas group/rows |
| `SUI-DATA-007` | Filter tidak valid / terlalu dalam |
| `SUI-DATA-008` | Operasi CRUD tidak didukung store |
| `SUI-DATA-009` | Konflik versi (409) |
| `SUI-DATA-010` | Response terlalu besar |

Error membawa `context` yang sudah disanitasi (tanpa token/PII) dan
`retryable: boolean`.

---

## 10. Keamanan data layer

| Risiko | Kontrol |
|---|---|
| Injeksi filter/OData | AST tertutup + encoding + validasi field |
| SSRF/URL berbahaya | `safeUrl`, protokol allowlist, blokir IP internal? (dokumentasikan sebagai tanggung jawab server) |
| Kebocoran token | Tidak log header/body; `withCredentials` opt-in; header tidak disimpan di state |
| Data besar / DoS | Batas `take`, ukuran respons, jumlah group, kedalaman filter |
| Prototype pollution | Sanitasi respons sebelum merge; `safeMerge` |
| Cache poisoning | Key deterministik, invalidasi, tidak cache error |
| XSS dari respons | Data dirender sebagai teks; sanitizer hanya jika opt-in |
| CSRF | Token provider, header eksplisit, credentials opt-in |
| Kesalahan otorisasi | Server-side enforcement; UI bukan boundary |

Detail di [05 — Security](05-security.md).

---

## 11. Test plan data layer

| Area | Test |
|---|---|
| Filter | setiap operator, null, tipe campuran, Unicode, batas kedalaman |
| Sort | stable, multi, null ordering, collator locale |
| Group | multi-level, expand/collapse, group count limit |
| Summary | sum/avg/min/max/count, custom, NaN/Infinity |
| Paging | skip/take, total count, page terakhir |
| Remote | pushdown, fallback, dedupe, cancel, retry, timeout |
| CRUD | insert/update/remove, konflik 409, rollback batch |
| Cache | hit/miss, invalidasi, TTL, LRU |
| Security | payload filter, OData encoding, prototype pollution, response besar |
| Performance | 100.000 baris filter/sort/group di bawah budget |

Target coverage: **≥ 90% lines/branches** untuk `src/data/`.

---

## 12. Benchmark

| Skenario | Target |
|---|---|
| Filter 100.000 baris (1 kondisi) | ≤ 50 ms |
| Sort 100.000 baris | ≤ 150 ms |
| Group 100.000 baris, 3 level | ≤ 300 ms |
| Summary 100.000 baris | ≤ 30 ms |
| Pipeline lengkap 10.000 baris | ≤ 100 ms |

Benchmark dijalankan di CI nightly; regresi > 20% memblokir rilis.

---

*Untuk cara data ditampilkan dan di-virtualisasi, lihat
[DataGrid arsitektur](components/datagrid/02-arsitektur.md).*
