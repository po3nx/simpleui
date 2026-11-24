import { DisposableBag, type Disposer } from './disposable.js';
import { Emitter, type EventListener, type EventMap } from './emitter.js';
import { SimpleUIError } from './errors.js';
import { mergeOptions } from './options.js';

/** True bila berjalan di mode development (pesan error lebih tegas). */
export function isDevMode(): boolean {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.NODE_ENV !== 'production';
}

/**
 * Basis kernel komponen (FND-011, docs/01-arsitektur.md §5.1).
 *
 * Lifecycle: `create` (constructor) → `mount` → `render` → `dispose`.
 * - Constructor dan `mount` sebelum dipanggil tidak menyentuh DOM target.
 * - `option()` sebelum `mount` hanya menyimpan konfigurasi.
 * - `dispose()` idempoten dan membersihkan seluruh resource lewat
 *   `DisposableBag` (R-ARC-08).
 * - Setelah `dispose()`, method lain melempar `SUI-CORE-002` di mode
 *   development dan menjadi no-op di production.
 */
export abstract class ComponentKernel<
  TOptions extends object,
  TEvents extends EventMap = Record<string, never>,
> {
  readonly #emitter: Emitter<TEvents>;
  readonly #disposables = new DisposableBag();
  #options: TOptions;
  #element: HTMLElement | null = null;
  #mounted = false;
  #disposed = false;
  #updateDepth = 0;
  #renderPending = false;

  protected constructor(defaults: TOptions, options?: Partial<TOptions>) {
    this.#options = mergeOptions(defaults, options);
    this.#emitter = new Emitter<TEvents>();
  }

  /** Element root komponen, `null` sebelum `mount()` atau setelah dispose. */
  get element(): HTMLElement | null {
    return this.#element;
  }

  get mounted(): boolean {
    return this.#mounted;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /** Baca satu opsi. */
  option<K extends keyof TOptions>(name: K): TOptions[K];
  /** Ubah satu opsi; memicu render bila sudah di-mount. */
  option<K extends keyof TOptions>(name: K, value: TOptions[K]): void;
  /** Ubah beberapa opsi sekaligus. */
  option(options: Partial<TOptions>): void;
  option(...args: unknown[]): unknown {
    if (!this.#guard('option')) return undefined;

    const [first, second] = args;

    if (typeof first === 'object' && first !== null) {
      this.#options = mergeOptions(this.#options, first as Partial<TOptions>);
      this.repaint();
      return undefined;
    }

    const name = first as keyof TOptions;
    if (args.length === 1) return this.#options[name];

    this.#options = mergeOptions(this.#options, {
      [name]: second,
    } as Partial<TOptions>);
    this.repaint();
    return undefined;
  }

  /** Dengarkan event komponen. */
  on<K extends keyof TEvents & string>(
    type: K,
    listener: EventListener<TEvents[K]>,
  ): Disposer {
    if (!this.#guard('on')) return () => {};
    return this.#emitter.on(type, listener);
  }

  /** Lepas listener event komponen. */
  off<K extends keyof TEvents & string>(
    type: K,
    listener: EventListener<TEvents[K]>,
  ): boolean {
    if (!this.#guard('off')) return false;
    return this.#emitter.off(type, listener);
  }

  /** Pasang komponen ke container. Hanya boleh sekali. */
  mount(container: HTMLElement): this {
    if (!this.#guard('mount')) return this;
    if (this.#mounted) {
      throw new SimpleUIError('SUI-CORE-003', 'Kernel sudah di-mount.');
    }

    const element = this.createElement();
    this.#element = element;
    container.append(element);
    this.#mounted = true;

    this.onMount(element);
    this.#renderNow();
    return this;
  }

  /** Mulai batch perubahan: render ditunda sampai `endUpdate()`. */
  beginUpdate(): void {
    if (!this.#guard('beginUpdate')) return;
    this.#updateDepth += 1;
  }

  /** Akhiri batch; render dijalankan sekali bila ada perubahan tertunda. */
  endUpdate(): void {
    if (!this.#guard('endUpdate')) return;
    if (this.#updateDepth === 0) {
      throw new SimpleUIError(
        'SUI-CORE-003',
        'endUpdate() dipanggil tanpa beginUpdate().',
      );
    }

    this.#updateDepth -= 1;
    if (this.#updateDepth === 0 && this.#renderPending) this.#renderNow();
  }

  /** Minta render. Sebelum mount hanya menyimpan konfigurasi. */
  repaint(): void {
    if (!this.#guard('repaint')) return;
    if (!this.#mounted) return;

    if (this.#updateDepth > 0) {
      this.#renderPending = true;
      return;
    }

    this.#renderNow();
  }

  /** Bersihkan resource, lepas element, dan tolak pemakaian berikutnya. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    const errors: unknown[] = [];

    try {
      this.onDispose();
    } catch (error) {
      errors.push(error);
    }

    this.#emitter.dispose();

    try {
      this.#disposables.dispose();
    } catch (error) {
      errors.push(error);
    }

    this.#element?.remove();
    this.#element = null;
    this.#mounted = false;
    this.#renderPending = false;
    this.#updateDepth = 0;

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Gagal membersihkan kernel');
    }
  }

  /** Daftarkan resource agar dibersihkan saat `dispose()` (R-ARC-08). */
  protected addDisposable(dispose: Disposer): Disposer {
    return this.#disposables.add(dispose);
  }

  /** Pancarkan event ke luar. */
  protected emit<K extends keyof TEvents & string>(
    type: K,
    payload: TEvents[K],
  ): void {
    this.#emitter.emit(type, payload);
  }

  /** Jumlah listener aktif; berguna untuk test kebocoran. */
  protected listenerCount<K extends keyof TEvents & string>(type: K): number {
    return this.#emitter.listenerCount(type);
  }

  protected abstract createElement(): HTMLElement;

  protected abstract render(): void;

  /** Hook setelah element terpasang; tempat memasang listener. */
  protected onMount(_element: HTMLElement): void {}

  /** Hook sebelum resource dibersihkan. */
  protected onDispose(): void {}

  /**
   * Hook ketika render melempar error. Default melempar ulang; komponen dapat
   * meng-override untuk merender state error alih-alih membiarkan UI kosong.
   */
  protected onRenderError(error: unknown): void {
    throw error;
  }

  #renderNow(): void {
    this.#renderPending = false;
    try {
      this.render();
    } catch (error) {
      this.onRenderError(error);
    }
  }

  #guard(action: string): boolean {
    if (!this.#disposed) return true;
    if (isDevMode()) {
      throw new SimpleUIError(
        'SUI-CORE-002',
        `${action}() dipanggil setelah dispose().`,
      );
    }
    return false;
  }
}
