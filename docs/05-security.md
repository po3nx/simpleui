# 05 — Security Architecture

> **Status:** Draft v1.0 · **Owner:** Security Reviewer · **Reviewer:** Tech Lead
> **Prasyarat:** [00 — Rule Umum §6](00-rule-umum.md#6-aturan-keamanan-ringkasan-wajib)
> **Berlaku untuk:** core, semua komponen, adapter, docs site, dan pipeline rilis.

---

## 1. Posisi keamanan

SimpleUI adalah library client-side yang berjalan di halaman consumer. Ia
**tidak** dapat menjamin keamanan data atau otorisasi; itu tanggung jawab server
dan aplikasi. Namun library **WAJIB**:

- tidak menciptakan kerentanan baru (XSS, injection, prototype pollution);
- memberikan default yang aman;
- menyediakan mekanisme untuk consumer mengamankan konfigurasi mereka;
- mendokumentasikan batas keamanan dengan jelas.

**Security boundary:**

```text
Trusted: kode SimpleUI, konfigurasi yang ditulis developer consumer
Untrusted: data dari API, nilai sel, URL dari data, localStorage, clipboard,
           template string yang berasal dari pengguna, respons jaringan
```

---

## 2. Threat model ringkas

### 2.1 Aset

| Aset                        | Dampak jika bocor/dirusak     |
| --------------------------- | ----------------------------- |
| Data baris yang ditampilkan | Kebocoran PII/data bisnis     |
| Token/session di header     | Account takeover              |
| Integritas DOM              | XSS, phishing, defacement     |
| State persistence           | Kebocoran data, manipulasi UI |
| Supply chain                | Kompromi seluruh consumer     |
| Kepercayaan pengguna        | Reputasi produk               |

### 2.2 Aktor dan vektor

| Aktor                   | Vektor                                 |
| ----------------------- | -------------------------------------- |
| Data berbahaya dari API | XSS via sel, caption, tooltip, summary |
| Developer keliru        | `allowHtml` tanpa sanitasi, URL mentah |
| Dependency terkompromi  | Supply chain, postinstall script       |
| Penyerang jaringan      | MITM, respons besar, redirect          |
| Pengguna lokal          | Manipulasi localStorage, clipboard     |
| Insider                 | Mengubah konfigurasi export/visibility |

### 2.3 Tabel ancaman → kontrol → test

| #   | Ancaman                       | Kontrol                                    | Test                           |
| --- | ----------------------------- | ------------------------------------------ | ------------------------------ |
| T1  | Stored XSS di sel             | `textContent` default; sanitizer opt-in    | XSS corpus di 4 adapter        |
| T2  | XSS di caption/header/tooltip | Semua teks via text node                   | Payload di caption & tooltip   |
| T3  | XSS via template string       | Sanitizer allowlist; `allowHtml` eksplisit | Bypass corpus                  |
| T4  | `javascript:` URL             | `safeUrl` allowlist protokol               | Payload URL di link column     |
| T5  | CSS injection                 | Style via CSSOM, validasi nilai            | Payload `background-image`     |
| T6  | Prototype pollution           | `safeMerge`, null-prototype dict           | Payload `__proto__` di options |
| T7  | CSV/Excel formula injection   | Escape `= + - @ TAB CR`                    | Export payload                 |
| T8  | Filter/OData injection        | AST tertutup + encoding                    | Payload field/value            |
| T9  | ReDoS                         | Tanpa regex pengguna; batas panjang        | Payload regex jahat            |
| T10 | DoS data besar                | Batas rows/cols/group/response             | Dataset ekstrem                |
| T11 | Kebocoran token               | Tanpa log header/body; credentials opt-in  | Log capture                    |
| T12 | State poisoning               | Validasi skema + ukuran                    | JSON korup di storage          |
| T13 | Supply chain                  | Lockfile, audit, provenance, no scripts    | CI audit                       |
| T14 | Clickjacking docs             | Header `frame-ancestors`                   | Header check                   |
| T15 | Kebocoran via export          | Hormati visibility/permission              | Export test                    |
| T16 | Clipboard sensitif            | Opt-in, konfirmasi, batas                  | Test copy tersembunyi          |

---

## 3. XSS dan rendering

### 3.1 Aturan emas

1. Data **selalu** teks, kecuali consumer secara eksplisit meminta HTML.
2. HTML hanya lewat `sanitizeHtml()` dengan konfigurasi ketat.
3. Tidak ada `innerHTML`/`outerHTML`/`insertAdjacentHTML` dengan data mentah.
4. Tidak ada `document.write`, `eval`, `new Function`, `setTimeout(string)`.
5. Tidak ada event handler inline (`onclick`, `onerror`) dari data.

### 3.2 Sanitizer

- Implementasi: wrapper tipis di atas **DOMPurify** (opsional peer) dengan
  konfigurasi tetap:
  - tag allowlist: `b, i, em, strong, u, s, br, span, a, ul, ol, li, p, code, pre`;
  - atribut allowlist: `href`, `title`, `target`, `rel`, `class` (prefix `sui-`);
  - protocol allowlist: `https:`, `http:`, `mailto:`, `tel:`;
  - `ALLOW_UNKNOWN_PROTOCOLS: false`;
  - `FORBID_TAGS: ['script','style','iframe','object','embed','form','input','svg','math']`;
  - `FORBID_ATTR: ['style','srcset','formaction','xlink:href']`;
  - `RETURN_TRUSTED_TYPE: true` bila Trusted Types tersedia.
- Jika DOMPurify tidak tersedia dan `allowHtml: true` diminta, **lempar error**
  `SUI-SEC-001`; jangan fallback ke HTML mentah.
- Sanitizer **DILARANG** dikonfigurasi oleh consumer untuk melonggarkan
  allowlist.

### 3.3 Trusted Types

- Deteksi `window.trustedTypes`.
- Buat policy `simpleui` sekali per halaman.
- Semua assignment ke `innerHTML` (jika ada) memakai policy.
- Test CSP dengan `require-trusted-types-for 'script'`.

### 3.4 Template

| Jenis                                 | Perlakuan                                      |
| ------------------------------------- | ---------------------------------------------- |
| Template function (React/Vue/Angular) | Dianggap kode tepercaya; framework meng-escape |
| String template (vanilla)             | Disanitasi; default `allowHtml: false`         |
| Nama kolom/caption                    | Teks; tidak pernah HTML                        |
| Tooltip                               | Teks; HTML hanya opt-in + sanitasi             |

---

## 4. Injection

### 4.1 Filter dan OData

- Filter direpresentasikan sebagai AST tertutup.
- Serializer OData:
  - field divalidasi terhadap daftar kolom;
  - string di-escape (`'` → `''`) dan di-`encodeURIComponent`;
  - angka/boolean/date diformat ketat;
  - `$filter` maksimum 4.000 karakter, kedalaman 10;
  - **DILARANG** menyisipkan nama operator dari input.
- Store custom bertanggung jawab mengamankan query ke backend; core hanya
  meneruskan AST.

### 4.2 Ekspresi

- Tidak ada ekspresi yang dieksekusi.
- Format/calculated field memakai parser AST kecil dengan allowlist fungsi
  (`abs`, `round`, `min`, `max`, `lower`, `upper`, `concat`, `if`).
- Batas: panjang 500 karakter, kedalaman 10, 50 node.
- Tidak ada akses properti dinamis (`obj[userInput]`) di parser.

### 4.3 CSS

- **DILARANG** menetapkan `style` attribute dari string data.
- Nilai dinamis (lebar, tinggi, warna) divalidasi:
  - angka + unit allowlist (`px`, `rem`, `%`, `em`);
  - warna harus lolos parser warna standar;
  - `url(...)` **DILARANG** dari data.
- Class dari data hanya boleh jika cocok pola `^[a-z][a-z0-9-]{0,40}$` dan
  di-prefix.

### 4.4 CSV/Excel

- Sebelum menulis sel, jika nilai dimulai dengan `=`, `+`, `-`, `@`, TAB, CR,
  atau LF → prefix `'`.
- Quote field yang mengandung delimiter, quote, newline.
- Deteksi encoding; gunakan UTF-8 dengan BOM opsional.
- Export hanya kolom yang terlihat secara default; `exportHiddenColumns` opt-in.
- Excel writer tidak menulis formula/makro; semua sel adalah string/number.

### 4.5 URL

```ts
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:']);

export function safeUrl(value: string, base?: string): string | null {
  const raw = value.trim();
  if (!raw || /[\u0000-\u001F\u007F]/.test(raw)) return null;
  try {
    const url = new URL(raw, base ?? globalThis.location?.href);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}
```

- `data:` dan `blob:` hanya untuk gambar dengan sanitizer khusus dan opt-in.
- Redirect HTTP → HTTPS tidak diikuti otomatis oleh library; tanggung jawab
  server.
- Test payload: spasi di awal, newline, `java\tscript:`, unicode homoglyph,
  `//evil.com`, `https://trusted.com@evil.com`.

---

## 5. Prototype pollution dan merge

- Semua merge opsi memakai `safeMerge`.
- Key terlarang: `__proto__`, `constructor`, `prototype`.
- Dictionary internal memakai `Object.create(null)`.
- `JSON.parse` tidak langsung di-merge; validasi skema dulu.
- Query string/state storage tidak boleh menjadi sumber key dinamis.
- Test payload:

```json
{ "__proto__": { "polluted": true } }
{ "constructor": { "prototype": { "polluted": true } } }
{ "columns": [{ "dataField": "__proto__" }] }
```

---

## 6. CSP dan keamanan browser

- Library **DILARANG** memakai `eval`, `new Function`, atau inline script.
- Tidak ada `<style>` yang di-inject saat runtime; CSS dikirim sebagai file.
- Style dinamis via CSSOM (`element.style.setProperty`) — tidak melanggar
  `style-src` pada umumnya, tetapi tetap diuji dengan CSP ketat.
- Tidak ada inline event handler.
- `postMessage` hanya jika benar-benar diperlukan; validasi `origin` dan
  `source`; payload divalidasi.
- Tidak ada `document.domain`, `window.opener` tanpa `noopener`.
- Link eksternal: `rel="noopener noreferrer"`.
- Docs site mengirim header:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security` (production)

---

## 7. Data, privasi, dan penyimpanan

- Tidak ada telemetry/analytics/cookie di library.
- Tidak ada request ke domain pihak ketiga secara default (font, ikon, CDN).
- `localStorage`/`sessionStorage` hanya untuk state UI yang diizinkan.
- **DILARANG** menyimpan: data baris, token, header, PII, nilai sel.
- State persistence:
  - opt-in (`stateStoring.enabled`);
  - schema version + validasi;
  - batas 100 KB;
  - key namespace;
  - opsi `storage: 'memory' | 'session' | 'local'`.
- Clipboard:
  - hanya menyalin yang diminta;
  - hormati kolom tersembunyi;
  - jangan auto-copy data sensitif;
  - bersihkan setelah waktu tertentu bila memungkinkan.
- Export:
  - default kolom terlihat;
  - data sensitif dapat dikecualikan lewat `export.excludeColumns`;
  - dokumentasikan bahwa export menghasilkan file di perangkat pengguna.

---

## 8. Network

| Kontrol              | Default                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Protokol             | HTTPS; HTTP hanya localhost/dev                                      |
| Timeout              | 30 detik                                                             |
| Batas ukuran respons | 10 MB (dapat dikonfigurasi)                                          |
| Redirect             | maksimum 3; cross-origin redirect ditolak untuk credentialed request |
| Credentials          | `withCredentials: false`                                             |
| CSRF                 | token provider opt-in; header eksplisit                              |
| Retry                | hanya GET/load, maksimum 2, backoff                                  |
| CORS                 | tanggung jawab server; error CORS dinormalisasi                      |
| Cache                | tidak menyimpan response sensitif secara default                     |
| Logging              | tidak ada body/header di log                                         |

- URL dasar store divalidasi dengan `safeUrl`.
- **DILARANG** mengirim token di query string secara default.
- Jika `withCredentials: true`, wajib HTTPS dan origin eksplisit.

---

## 9. Batas DoS

| Parameter               | Default | Maksimum  |
| ----------------------- | ------- | --------- |
| Baris lokal             | —       | 1.000.000 |
| Baris per halaman       | 100     | 10.000    |
| Kolom                   | —       | 500       |
| Level group             | 3       | 10        |
| Kedalaman filter        | 5       | 10        |
| Node filter             | 100     | 200       |
| Nilai `in`              | 100     | 1.000     |
| Panjang sel             | 32 KB   | 1 MB      |
| Panjang ekspresi format | 500     | 1.000     |
| Ukuran respons          | 10 MB   | 50 MB     |
| Request paralel         | 4       | 8         |
| Cache entri             | 20      | 100       |

Pelanggaran menghasilkan error terklasifikasi, bukan crash.

---

## 10. Supply chain

- Lockfile committed; `pnpm install --frozen-lockfile` di CI.
- `.npmrc`: `ignore-scripts=true`, `save-exact=true` untuk tooling.
- Build script hanya yang tercatat di `pnpm-workspace.yaml` `allowBuilds`
  (saat ini `esbuild`).
- Dependency allowlist lisensi: MIT, Apache-2.0, BSD-2/3, ISC, 0BSD.
- Audit: `pnpm audit --audit-level high` (semua), `pnpm audit --prod
--audit-level high` (produksi), laporan lengkap di
  `.github/workflows/security.yml`; jadwal mingguan.
- Dependabot aktif untuk npm dan GitHub Actions (mingguan).
- OSV-Scanner direncanakan sebagai lapisan tambahan.
- Review dependency baru dengan checklist
  [00 §6.4](00-rule-umum.md#64-checklist-dependency-baru).
- Publish dengan npm provenance (OIDC), bukan token long-lived.
- SBOM CycloneDX di setiap rilis.
- Tidak ada dependency runtime untuk core pada v1 (target), kecuali disetujui
  ADR.
- Reproducible build: versi Node/pnpm dikunci; build deterministik.

---

## 11. Keamanan rilis

- Rilis hanya dari commit bertanda tangan/tag protected.
- Dua reviewer untuk perubahan `core/security` dan workflow rilis.
- `npm publish --provenance --access public`.
- Verifikasi artefak: `npm pack`, cek isi, hash, install di app bersih.
- Post-release: smoke test CDN + npm + docs.
- Jika ditemukan kerentanan: patch release di semua versi yang didukung,
  advisory, CVE jika perlu.

---

## 12. Pelaporan kerentanan

- `SECURITY.md` berisi kontak privat (security@…), SLA respons (≤ 3 hari
  kerja), dan kebijakan disclosure (90 hari).
- **DILARANG** melaporkan kerentanan lewat issue publik.
- Credit reporter bila diinginkan.
- Bug bounty opsional setelah 1.0.

---

## 13. Checklist security per PR

- [ ] Input tidak tepercaya dirender sebagai teks.
- [ ] Tidak ada `innerHTML`/`eval` baru.
- [ ] URL divalidasi dengan `safeUrl`.
- [ ] Merge memakai `safeMerge`.
- [ ] Export/clipboard aman dari formula injection dan kebocoran kolom.
- [ ] Storage divalidasi dan tidak menyimpan data sensitif.
- [ ] Network memakai timeout, abort, dan batas ukuran.
- [ ] Error tidak membocorkan detail internal.
- [ ] Dependency baru lolos checklist.
- [ ] Security test ditambahkan.
- [ ] Dokumentasi risiko diperbarui.

---

## 14. Checklist security review komponen baru

- [ ] Threat model komponen ditulis.
- [ ] Permukaan input diidentifikasi (opsi, data, template, URL, storage).
- [ ] Payload corpus dijalankan.
- [ ] CSP E2E lulus.
- [ ] Tidak ada akses jaringan implisit.
- [ ] Batas DoS diuji.
- [ ] Data sensitif tidak masuk log/telemetry.
- [ ] Dokumentasi batas keamanan (client vs server) jelas.
- [ ] Security reviewer menyetujui.

---

_Untuk ancaman spesifik grid, lihat
[DataGrid Security](components/datagrid/04-security.md)._
