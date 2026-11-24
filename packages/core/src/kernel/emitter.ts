/**
 * Emitter event bertipe untuk kernel (docs/01-arsitektur.md §5.1).
 *
 * Nama event mengikuti konvensi `pastTense`/`noun + Changed`, mis.
 * `selectionChanged`, `rowUpdated` (docs/00-rule-umum.md §4.2).
 */
export type EventMap = Record<string, unknown>;

export type EventListener<TPayload> = (payload: TPayload) => void;

export interface EmitterOptions {
  /**
   * Dipanggil ketika satu listener melempar error. Bila tidak disediakan,
   * error dikumpulkan dan dilempar sebagai `AggregateError` setelah semua
   * listener selesai — error tidak boleh ditelan diam-diam.
   */
  onListenerError?: (error: unknown, event: string) => void;
}

type AnyListener = EventListener<unknown>;

interface Entry {
  listener: AnyListener;
  once: boolean;
}

export class Emitter<TEvents extends EventMap> {
  readonly #entries = new Map<string, Entry[]>();
  readonly #onListenerError: EmitterOptions['onListenerError'];
  #disposed = false;

  constructor(options: EmitterOptions = {}) {
    this.#onListenerError = options.onListenerError;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /** Daftarkan listener. Mengembalikan handle untuk melepasnya. */
  on<K extends keyof TEvents & string>(
    type: K,
    listener: EventListener<TEvents[K]>,
  ): () => void {
    return this.#add(type, listener as AnyListener, false);
  }

  /** Listener yang otomatis dilepas setelah dipanggil sekali. */
  once<K extends keyof TEvents & string>(
    type: K,
    listener: EventListener<TEvents[K]>,
  ): () => void {
    return this.#add(type, listener as AnyListener, true);
  }

  /**
   * Lepas listener. Mengembalikan `true` bila ada yang dilepas.
   * Listener `once` yang sudah terpanggil tidak lagi terdaftar.
   */
  off<K extends keyof TEvents & string>(
    type: K,
    listener: EventListener<TEvents[K]>,
  ): boolean {
    const entries = this.#entries.get(type);
    if (!entries) return false;

    const next = entries.filter((entry) => entry.listener !== listener);
    if (next.length === entries.length) return false;

    if (next.length === 0) this.#entries.delete(type);
    else this.#entries.set(type, next);
    return true;
  }

  /**
   * Pancarkan event ke semua listener terdaftar. Listener yang dilepas saat
   * emit berlangsung tidak dipanggil lagi pada emit yang sama.
   */
  emit<K extends keyof TEvents & string>(type: K, payload: TEvents[K]): void {
    if (this.#disposed) return;

    const entries = this.#entries.get(type);
    if (!entries || entries.length === 0) return;

    const snapshot = [...entries];
    const errors: unknown[] = [];

    for (const entry of snapshot) {
      if (entry.once) this.#removeEntry(type, entry);
      try {
        entry.listener(payload);
      } catch (error) {
        if (this.#onListenerError) this.#onListenerError(error, type);
        else errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Listener untuk event "${type}" melempar error`,
      );
    }
  }

  /** Jumlah listener aktif untuk satu event. */
  listenerCount<K extends keyof TEvents & string>(type: K): number {
    return this.#entries.get(type)?.length ?? 0;
  }

  /** Lepas semua listener, atau semua listener untuk satu event. */
  removeAll<K extends keyof TEvents & string>(type?: K): void {
    if (type === undefined) this.#entries.clear();
    else this.#entries.delete(type);
  }

  /** Lepas semua listener dan tolak emit berikutnya (idempoten). */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#entries.clear();
  }

  #add(type: string, listener: AnyListener, once: boolean): () => void {
    if (this.#disposed) return () => {};

    const existing = this.#entries.get(type) ?? [];
    const entry: Entry = { listener, once };
    existing.push(entry);
    this.#entries.set(type, existing);

    return () => {
      this.#removeEntry(type, entry);
    };
  }

  #removeEntry(type: string, entry: Entry): void {
    const entries = this.#entries.get(type);
    if (!entries) return;

    const next = entries.filter((item) => item !== entry);
    if (next.length === 0) this.#entries.delete(type);
    else this.#entries.set(type, next);
  }
}
