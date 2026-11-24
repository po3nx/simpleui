/**
 * Penjadwal render dan notifikasi (FND-012, docs/01-arsitektur.md §5.4).
 *
 * - Render visual dijadwalkan sekali per frame dan digabung (coalesced).
 * - Notifikasi state memakai microtask agar tidak menunggu frame.
 * - Pekerjaan panjang dapat memanggil `yieldToMain()` untuk memberi kesempatan
 *   browser merender (memakai `scheduler.yield()` bila tersedia).
 *
 * Host dapat di-inject agar test deterministik (service `Clock` pada §5.5).
 */

export interface SchedulerHost {
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
  scheduleMicrotask?: (callback: () => void) => void;
}

export interface Scheduler {
  /** Jadwalkan render; panggilan berulang digabung menjadi satu frame. */
  scheduleRender(callback: () => void): void;
  /** Jadwalkan notifikasi state; penggabungan dilakukan per microtask. */
  scheduleNotification(callback: () => void): void;
  /** Jalankan pekerjaan tertunda sekarang juga (dipakai saat dispose/test). */
  flush(): void;
  dispose(): void;
  readonly renderPending: boolean;
  readonly notificationPending: boolean;
}

const FALLBACK_FRAME_MS = 16;

interface AnimationHost {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
  scheduler?: { yield?: () => Promise<void> };
}

function createDefaultHost(): Required<SchedulerHost> {
  const runtime = globalThis as AnimationHost;

  return {
    requestFrame: (callback) =>
      runtime.requestAnimationFrame
        ? runtime.requestAnimationFrame(() => callback())
        : (setTimeout(callback, FALLBACK_FRAME_MS) as unknown as number),
    cancelFrame: (handle) => {
      if (runtime.cancelAnimationFrame) runtime.cancelAnimationFrame(handle);
      else clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
    },
    scheduleMicrotask: (callback) => queueMicrotask(callback),
  };
}

class SchedulerImpl implements Scheduler {
  readonly #host: Required<SchedulerHost>;
  #renderHandle: number | null = null;
  #renderCallback: (() => void) | null = null;
  #notificationCallback: (() => void) | null = null;
  #disposed = false;

  constructor(host: Required<SchedulerHost>) {
    this.#host = host;
  }

  get renderPending(): boolean {
    return this.#renderHandle !== null;
  }

  get notificationPending(): boolean {
    return this.#notificationCallback !== null;
  }

  scheduleRender(callback: () => void): void {
    if (this.#disposed) return;

    // Callback terbaru menang agar yang dirender adalah state terkini.
    this.#renderCallback = callback;
    if (this.#renderHandle !== null) return;

    this.#renderHandle = this.#host.requestFrame(() => {
      this.#renderHandle = null;
      const pending = this.#renderCallback;
      this.#renderCallback = null;
      pending?.();
    });
  }

  scheduleNotification(callback: () => void): void {
    if (this.#disposed) return;

    this.#notificationCallback = callback;
    this.#host.scheduleMicrotask(() => {
      const pending = this.#notificationCallback;
      this.#notificationCallback = null;
      pending?.();
    });
  }

  flush(): void {
    if (this.#disposed) return;

    const notification = this.#notificationCallback;
    this.#notificationCallback = null;
    notification?.();

    if (this.#renderHandle === null) return;

    this.#host.cancelFrame(this.#renderHandle);
    this.#renderHandle = null;
    const render = this.#renderCallback;
    this.#renderCallback = null;
    render?.();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    if (this.#renderHandle !== null) this.#host.cancelFrame(this.#renderHandle);

    this.#renderHandle = null;
    this.#renderCallback = null;
    this.#notificationCallback = null;
  }
}

/** Buat scheduler; host opsional untuk test atau lingkungan non-browser. */
export function createScheduler(host: SchedulerHost = {}): Scheduler {
  const defaults = createDefaultHost();
  return new SchedulerImpl({
    requestFrame: host.requestFrame ?? defaults.requestFrame,
    cancelFrame: host.cancelFrame ?? defaults.cancelFrame,
    scheduleMicrotask: host.scheduleMicrotask ?? defaults.scheduleMicrotask,
  });
}

/**
 * Beri kesempatan browser merender sebelum melanjutkan pekerjaan berat.
 * Memakai `scheduler.yield()` bila tersedia, fallback ke `setTimeout(0)`.
 */
export async function yieldToMain(): Promise<void> {
  const runtime = globalThis as AnimationHost;

  if (runtime.scheduler?.yield) {
    await runtime.scheduler.yield();
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
