/**
 * Kontrak template bridge (FND-017, docs/02-adapter-cross-framework.md §5).
 *
 * Core tidak mengenal React/Vue/Angular. Adapter menerjemahkan template
 * framework menjadi `TemplateRenderer`; core hanya memanggil render/update/
 * dispose. Aturan yang ditegakkan di sini:
 * - R-TPL-01: template menerima container, tidak mengembalikan string HTML.
 * - R-TPL-02: handle di-dispose saat node didaur ulang.
 * - R-TPL-04: error template ditangkap; satu sel gagal tidak merusak grid.
 */

/** Kolom minimal yang dikenal template; DataGrid dapat memperluasnya. */
export interface TemplateColumn {
  readonly field: string;
  readonly caption?: string;
}

export interface TemplateContext<T = unknown> {
  readonly data: T;
  readonly row?: T;
  readonly column?: TemplateColumn;
  readonly index: number;
  readonly value: unknown;
}

export interface TemplateHandle {
  update(context: TemplateContext<unknown>): void;
  dispose(): void;
}

/** Adapter framework mengimplementasikan ini. */
export type TemplateRenderer = (
  container: HTMLElement,
  context: TemplateContext<unknown>,
) => TemplateHandle;

/** Template vanilla: menulis ke container, tidak mengembalikan handle. */
export type TemplateCallback<T = unknown> = (
  container: HTMLElement,
  context: TemplateContext<T>,
) => void;

export type TemplateSource<T = unknown> =
  TemplateRenderer | TemplateCallback<T>;

export type TemplatePhase = 'render' | 'update' | 'dispose';

export interface TemplateBridgeOptions {
  /** Dipanggil saat template melempar error; default menelan agar UI bertahan. */
  onError?: (error: unknown, phase: TemplatePhase) => void;
}

const NOOP_HANDLE: TemplateHandle = {
  update: () => {},
  dispose: () => {},
};

function isTemplateHandle(value: unknown): value is TemplateHandle {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<TemplateHandle>;
  return (
    typeof candidate.update === 'function' &&
    typeof candidate.dispose === 'function'
  );
}

export class TemplateBridge<T = unknown> {
  readonly #source: TemplateSource<T>;
  readonly #onError: TemplateBridgeOptions['onError'];
  readonly #handles = new Set<TemplateHandle>();
  readonly #originals = new WeakMap<TemplateHandle, TemplateHandle>();
  #disposed = false;

  constructor(source: TemplateSource<T>, options: TemplateBridgeOptions = {}) {
    this.#source = source;
    this.#onError = options.onError;
  }

  get activeCount(): number {
    return this.#handles.size;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Render satu container dan kembalikan handle terkelola.
   * `update`/`dispose` pada handle ini aman dipanggil berkali-kali.
   */
  createHandle(
    container: HTMLElement,
    context: TemplateContext<T>,
  ): TemplateHandle {
    if (this.#disposed) return NOOP_HANDLE;

    let outcome: unknown;
    try {
      outcome = (this.#source as TemplateRenderer)(
        container,
        context as TemplateContext<unknown>,
      );
    } catch (error) {
      this.#report(error, 'render');
      return NOOP_HANDLE;
    }

    const original = isTemplateHandle(outcome)
      ? outcome
      : this.#wrapCallback(container);

    return this.#track(original);
  }

  /** Dispose seluruh handle yang masih hidup (idempoten). */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    for (const tracked of [...this.#handles]) {
      this.#disposeHandle(tracked);
    }
    this.#handles.clear();
  }

  /** Jalur vanilla: template menulis ke container, update membersihkan dulu. */
  #wrapCallback(container: HTMLElement): TemplateHandle {
    return {
      update: (next) => {
        try {
          container.replaceChildren();
          (this.#source as TemplateCallback<T>)(
            container,
            next as TemplateContext<T>,
          );
        } catch (error) {
          this.#report(error, 'update');
        }
      },
      dispose: () => {
        container.replaceChildren();
      },
    };
  }

  #track(original: TemplateHandle): TemplateHandle {
    const tracked: TemplateHandle = {
      update: (next) => {
        if (!this.#handles.has(tracked)) return;
        try {
          original.update(next);
        } catch (error) {
          this.#report(error, 'update');
        }
      },
      dispose: () => {
        this.#disposeHandle(tracked);
      },
    };

    this.#originals.set(tracked, original);
    this.#handles.add(tracked);
    return tracked;
  }

  #disposeHandle(tracked: TemplateHandle): void {
    if (!this.#handles.delete(tracked)) return;

    const original = this.#originals.get(tracked);
    this.#originals.delete(tracked);
    if (!original) return;

    try {
      original.dispose();
    } catch (error) {
      this.#report(error, 'dispose');
    }
  }

  #report(error: unknown, phase: TemplatePhase): void {
    this.#onError?.(error, phase);
  }
}

/** Buat bridge untuk satu sumber template. */
export function createTemplateBridge<T = unknown>(
  source: TemplateSource<T>,
  options: TemplateBridgeOptions = {},
): TemplateBridge<T> {
  return new TemplateBridge(source, options);
}
