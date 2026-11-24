/**
 * Reactive store dengan notifikasi transaksional (FND-012,
 * docs/01-arsitektur.md §5.2).
 *
 * - State selalu objek immutable baru; `getState()` mengembalikan referensi
 *   yang stabil sampai ada perubahan.
 * - `transaction()` menunda notifikasi sampai transaksi terluar selesai.
 * - Notifikasi bersifat sinkron; penjadwalan render ditangani scheduler
 *   terpisah agar listener non-render tidak ikut menunggu frame.
 */

/** Patch state: objek parsial atau fungsi dari state saat ini. */
export type StatePatch<TState> =
  Partial<TState> | ((state: TState) => Partial<TState>);

export type StateListener<TState> = (
  state: Readonly<TState>,
  previous: Readonly<TState>,
) => void;

export interface Store<TState extends object> {
  getState(): Readonly<TState>;
  setState(patch: StatePatch<TState>): void;
  transaction(fn: () => void): void;
  subscribe(listener: StateListener<TState>): () => void;
  dispose(): void;
}

function shallowEqual<TState extends object>(a: TState, b: TState): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) =>
    Object.is(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

class StoreImpl<TState extends object> implements Store<TState> {
  readonly #listeners = new Set<StateListener<TState>>();
  #state: TState;
  #previous: TState | null = null;
  #depth = 0;
  #disposed = false;

  constructor(initial: TState) {
    this.#state = initial;
  }

  getState(): Readonly<TState> {
    return this.#state;
  }

  setState(patch: StatePatch<TState>): void {
    if (this.#disposed) return;

    const resolved = typeof patch === 'function' ? patch(this.#state) : patch;
    const next = { ...this.#state, ...resolved } as TState;
    if (shallowEqual(this.#state, next)) return;

    // Simpan state sebelum perubahan pertama dalam transaksi berjalan.
    if (this.#previous === null) this.#previous = this.#state;
    this.#state = next;

    if (this.#depth === 0) this.#flush();
  }

  transaction(fn: () => void): void {
    if (this.#disposed) return;

    this.#depth += 1;
    try {
      fn();
    } finally {
      this.#depth -= 1;
      if (this.#depth === 0) this.#flush();
    }
  }

  subscribe(listener: StateListener<TState>): () => void {
    if (this.#disposed) return () => {};

    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    this.#disposed = true;
    this.#listeners.clear();
    this.#previous = null;
  }

  #flush(): void {
    if (this.#previous === null) return;

    const previous = this.#previous;
    this.#previous = null;
    const current = this.#state;
    const errors: unknown[] = [];

    for (const listener of [...this.#listeners]) {
      try {
        listener(current, previous);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Listener store melempar error');
    }
  }
}

/** Buat store reaktif dari state awal. */
export function createStore<TState extends object>(
  initial: TState,
): Store<TState> {
  return new StoreImpl(initial);
}
