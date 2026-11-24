/**
 * Kumpulan fungsi pembersihan milik satu instance (docs/01-arsitektur.md §5.6).
 *
 * Setiap resource — listener, timer, observer, instance framework, atau node
 * DOM — wajib didaftarkan di sini agar `dispose()` tidak meninggalkan apa pun
 * (R-ARC-08).
 */
export type Disposer = () => void;

interface Entry {
  dispose: Disposer;
  active: boolean;
}

export class DisposableBag {
  #entries: Entry[] = [];
  #disposed = false;

  /** Jumlah resource yang masih terdaftar. */
  get size(): number {
    return this.#entries.length;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Daftarkan fungsi pembersihan. Mengembalikan handle untuk membatalkan
   * pendaftaran (mis. listener yang dilepas lebih awal).
   */
  add(dispose: Disposer): Disposer {
    if (this.#disposed) {
      // Resource yang lahir setelah pembersihan harus langsung dibersihkan,
      // bukan dibiarkan menggantung.
      dispose();
      return () => {};
    }

    const entry: Entry = { dispose, active: true };
    this.#entries.push(entry);

    return () => {
      if (!entry.active) return;
      entry.active = false;
      this.#entries = this.#entries.filter((item) => item !== entry);
    };
  }

  /**
   * Jalankan seluruh pembersihan dengan urutan LIFO (resource terakhir lebih
   * dulu). Idempoten; error dikumpulkan lalu dilempar sebagai AggregateError
   * agar satu kegagalan tidak menghentikan pembersihan lain.
   */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    const errors: unknown[] = [];

    for (let index = this.#entries.length - 1; index >= 0; index -= 1) {
      const entry = this.#entries[index];
      if (!entry) continue;

      entry.active = false;
      try {
        entry.dispose();
      } catch (error) {
        errors.push(error);
      }
    }

    this.#entries = [];

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Gagal membersihkan sebagian resource');
    }
  }
}
