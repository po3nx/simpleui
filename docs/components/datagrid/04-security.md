# DataGrid 04 — Security

> **Status:** Draft v1.0 · **Owner:** Security Reviewer · **Reviewer:** Grid squad
> **Prasyarat:** [05 — Security](../../05-security.md) · [03 — API](03-api.md)
> **Tujuan:** mengidentifikasi permukaan serangan spesifik DataGrid dan
> memastikan setiap permukaan memiliki kontrol + test.

---

## 1. Aset dan trust boundary

| Aset | Contoh | Dampak |
|---|---|---|
| Data baris | Nama customer, nomor rekening | Kebocoran PII |
| Data kolom | Caption, format, template | XSS |
| URL | Link column, store endpoint | XSS/SSRF |
| Export | CSV/Excel berisi formula | Formula injection |
| Clipboard | Copy sel | Kebocoran data |
| State | LocalStorage | Manipulasi UI/kebocoran |
| Network | Header/token | Account takeover |
| DOM | id, class, atribut | Clobbering/XSS |

**Trusted:** kode SimpleUI, konfigurasi developer.
**Untrusted:** semua nilai data, termasuk caption/tooltip/summary yang berasal
dari API; URL; state storage; clipboard; template string.

---

## 2. Threat model

| # | Ancaman | Vektor | Dampak | Kontrol | Test |
|---|---|---|---|---|---|
| DG-S1 | Stored XSS di sel | Nilai string berisi `<img onerror>` | Eksekusi script | `textContent` default | XSS corpus |
| DG-S2 | XSS di caption/header | API mengirim caption berbahaya | Eksekusi script | Caption sebagai teks | Payload caption |
| DG-S3 | XSS via template string | `cellTemplate` string | Eksekusi script | Sanitizer + `allowHtml` opt-in | Bypass corpus |
| DG-S4 | XSS via tooltip | Nilai tooltip HTML | Eksekusi script | Teks; HTML opt-in + sanitasi | Payload tooltip |
| DG-S5 | XSS via summary text | Custom summary mengembalikan HTML | Eksekusi script | Summary sebagai teks | Payload summary |
| DG-S6 | `javascript:` URL | Link column | Eksekusi saat klik | `safeUrl` allowlist | URL corpus |
| DG-S7 | CSS injection | Width/color/style dari data | UI spoofing, exfiltration | Validasi + CSSOM | Payload style |
| DG-S8 | Prototype pollution | Opsi `__proto__` | RCE/logic bypass | `safeMerge` | Pollution corpus |
| DG-S9 | CSV formula injection | Sel `=cmd\|...` | Eksekusi saat buka Excel | Prefix `'` | Export corpus |
| DG-S10 | Excel formula injection | Sama, via XLSX | Sama | Semua sel string/number | Export corpus |
| DG-S11 | Filter/OData injection | Nilai filter | Query manipulation | AST + encoding | Injection corpus |
| DG-S12 | ReDoS | Filter regex | CPU hang | Tanpa regex pengguna | Payload regex |
| DG-S13 | DoS data besar | 1 juta baris/kolom | Browser crash | Batas + virtualisasi | Stress test |
| DG-S14 | Kebocoran token | Log request | Account takeover | Tanpa log header/body | Log capture |
| DG-S15 | State poisoning | localStorage dimanipulasi | UI salah/kebocoran | Validasi skema + ukuran | Corrupt state |
| DG-S16 | Export melebihi hak | Kolom tersembunyi ikut | Kebocoran data | Hormati visibility | Export test |
| DG-S17 | Clipboard sensitif | Copy otomatis | Kebocoran | Opt-in + batas | Copy test |
| DG-S18 | Clickjacking | Grid di iframe | UI redress | Docs header; consumer bertanggung jawab | Header test |
| DG-S19 | Dependency compromised | Supply chain | Kompromi | Lockfile, audit, provenance | CI audit |
| DG-S20 | Error leakage | Stack/PII di UI | Informasi | Pesan generik + kode | Error test |

---

## 3. Kontrol per permukaan

### 3.1 Rendering sel

**Default:** `textContent`. Tidak ada HTML.

```ts
// core/cell-renderer.ts
function setCellContent(cell: HTMLElement, value: unknown, column: ColumnState): void {
  if (column.allowHtml && typeof value === 'string') {
    cell.replaceChildren(sanitizeHtml(value)); // hanya jika opt-in
    return;
  }
  cell.textContent = value == null ? '' : String(value);
}
```

Aturan:

- `allowHtml` default `false`; jika `true` tanpa sanitizer tersedia → error
  `SUI-SEC-001`.
- Sanitizer tidak dapat dikonfigurasi untuk melonggarkan allowlist.
- `cellTemplate` function dianggap kode tepercaya; tetapi jika mengembalikan
  string, string disanitasi.
- `caption`, `tooltip`, `noDataText`, `summary` selalu teks.
- `column.id` dan `dataField` tidak boleh dipakai sebagai `id` DOM mentah;
  gunakan ID yang di-generate dan di-escape.

### 3.2 URL dan link column

- Gunakan `safeUrl` untuk semua `href`.
- Hanya `https:`, `http:`, `mailto:`, `tel:`.
- `target="_blank"` selalu disertai `rel="noopener noreferrer"`.
- URL yang tidak valid → render sebagai teks, bukan link.
- **DILARANG** memuat gambar dari URL data tanpa allowlist.

### 3.3 Export

CSV:

- Escape formula: jika nilai diawali `=`, `+`, `-`, `@`, TAB, CR, LF → prefix
  `'`.
- Quote field yang mengandung delimiter/quote/newline.
- UTF-8; BOM opsional.
- Nama file disanitasi (`[^\w.-]` → `_`, maksimal 100 karakter).
- Default hanya kolom terlihat; `exportHiddenColumns` opt-in.
- Default hanya baris yang terlihat/dipilih sesuai opsi; jangan mengekspor
  seluruh dataset tanpa permintaan eksplisit.

Excel:

- OOXML minimal; semua sel string/number; **tidak ada formula/makro**.
- Sheet name disanitasi.
- Tidak menyertakan hidden sheet atau metadata sensitif.
- Ukuran dibatasi (default 100.000 baris/50 MB).

### 3.4 Clipboard

- Copy hanya dari aksi pengguna eksplisit.
- Hormati kolom tersembunyi.
- Format TSV; escape newline/tab di dalam nilai.
- Jangan auto-copy setelah selection.
- Bersihkan buffer setelah 60 detik bila memungkinkan (best effort).

### 3.5 State persistence

- Schema allowlist: hanya field yang diketahui.
- Validasi tipe, panjang, dan nilai enum.
- Batas 100 KB; tolak state lebih besar.
- `version` + migrasi; state versi lama yang tidak dikenal diabaikan.
- **DILARANG** menyimpan data baris, selection default, atau nilai sel.
- Key namespace `simpleui:datagrid:<storageKey>`.

### 3.6 Remote data

- URL divalidasi (`safeUrl`); HTTPS default.
- `withCredentials` default `false`.
- Timeout 30 detik; batas respons 10 MB.
- Abort saat dispose/reload.
- Tidak log header/body.
- Redirect cross-origin ditolak untuk request credentialed.
- Respons divalidasi bentuknya sebelum dipakai.
- **DILARANG** menaruh token di query string secara default.
- CSRF: token provider opt-in, header eksplisit.

### 3.7 Editing

- Nilai editor divalidasi sebelum dikirim.
- **DILARANG** mempercayai nilai dari DOM sebagai sumber kebenaran; gunakan
  draft state.
- Pesan validasi di-escape.
- Konflik 409 tidak menimpa data server.
- `allowEditing` bukan kontrol keamanan; server wajib memeriksa izin.
- Editor kaya teks (jika ada) memakai sanitizer.

### 3.8 Error dan log

- Pesan pengguna: generik + kode.
- Log development: tanpa PII/token; gunakan redaction.
- `console.error` hanya di development; production memakai event.
- Jangan menampilkan stack trace di UI.

### 3.9 DoS

| Batas | Default |
|---|---|
| Baris lokal | 1.000.000 |
| Baris per halaman | 10.000 |
| Kolom | 500 |
| Nilai `in` | 1.000 |
| Kedalaman filter | 10 |
| Node filter | 200 |
| Panjang sel | 32 KB |
| Ukuran state | 100 KB |
| Ukuran respons | 10 MB |
| Request paralel | 4 |

Pelanggaran → error terklasifikasi; UI tetap responsif.

---

## 4. Secure defaults

| Opsi | Default aman | Jika diubah |
|---|---|---|
| `allowHtml` | `false` | Wajib sanitizer; dokumentasikan risiko |
| `export.csv.sanitizeFormulas` | `true` | Hanya untuk data non-spreadsheet |
| `export.exportHiddenColumns` | `false` | Risiko kebocoran |
| `stateStoring.enabled` | `false` | Validasi + batas |
| `withCredentials` | `false` | Wajib HTTPS |
| `selection.selectAllMode` | `'page'` | `'allPages'` butuh server |
| `editing.allowUpdating` | `false` | Server tetap wajib cek izin |
| `remoteOperations` | `'auto'` | Pastikan server memvalidasi |
| `cacheEnabled` | `true` | Jangan cache data sensitif |
| `showCheckBoxes` | `false` | — |

---

## 5. Security test corpus

### 5.1 XSS

```text
<img src=x onerror=alert(1)>
<svg/onload=alert(1)>
<iframe srcdoc="<script>alert(1)</script>">
<math><mtext><script>alert(1)</script></mtext></math>
javascript:alert(1)
JaVaScRiPt:alert(1)
java\tscript:alert(1)
data:text/html,<script>alert(1)</script>
"><script>alert(1)</script>
'><img src=x onerror=alert(1)>
<style>@import 'https://evil.test/x.css'</style>
<div style="background:url(https://evil.test/x)">x</div>
```

Ekspektasi: dirender sebagai teks; tidak ada node `script`/`iframe`/`img`;
tidak ada request ke `evil.test`.

### 5.2 URL

```text
javascript:alert(1)
 javaScript:alert(1)
java\tscript:alert(1)
data:text/html;base64,...
//evil.test
https://trusted.test@evil.test
https://evil.test\@trusted.test
```

Ekspektasi: hanya URL valid yang lolos; sisanya teks.

### 5.3 Prototype pollution

```json
{ "__proto__": { "polluted": true } }
{ "constructor": { "prototype": { "polluted": true } } }
{ "columns": [{ "id": "__proto__", "dataField": "x" }] }
```

Ekspektasi: `({}).polluted === undefined`; grid tetap berfungsi.

### 5.4 CSV/Excel

```text
=cmd|' /C calc'!A0
+1+1
-1+1
@SUM(1,1)
\t=cmd
\r=cmd
```

Ekspektasi: file berisi prefix `'`; tidak ada formula aktif.

### 5.5 Filter/OData

```text
name eq 'x' or 1 eq 1
name'; DROP TABLE --
$filter=name eq 'x'&$top=999999
```

Ekspektasi: field/nilai di-encode; `take` dibatasi; tidak ada query mentah.

### 5.6 State

```json
{ "version": 999, "columns": [{ "width": -1 }], "filter": { "__proto__": {} } }
```

Ekspektasi: ditolak/diabaikan; tidak ada crash.

---

## 6. Checklist security per PR DataGrid

- [ ] Nilai sel dirender sebagai teks.
- [ ] Caption/tooltip/summary tidak HTML.
- [ ] `allowHtml` hanya jika sanitizer tersedia.
- [ ] URL divalidasi.
- [ ] Export memakai formula guard.
- [ ] Clipboard menghormati kolom tersembunyi.
- [ ] State divalidasi + dibatasi.
- [ ] Network memakai timeout/abort/batas ukuran.
- [ ] Error tidak membocorkan detail.
- [ ] Batas DoS diuji.
- [ ] Security test ditambahkan.
- [ ] Dokumentasi risiko diperbarui.

---

## 7. Sign-off

Security reviewer **WAJIB** menyetujui sebelum:

- DataGrid beta (M3);
- DataGrid GA (M4);
- perubahan pada rendering HTML, export, state, atau network.

Sign-off meliputi:

- [ ] Threat model diperbarui.
- [ ] Corpus dijalankan di 4 adapter.
- [ ] CSP E2E lulus.
- [ ] Tidak ada temuan critical/high terbuka.
- [ ] Dokumentasi batas keamanan jelas.

---

*Untuk kebijakan umum, lihat [05 — Security](../../05-security.md).*
