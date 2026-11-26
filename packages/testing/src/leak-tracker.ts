/**
 * Pelacak kebocoran dispose (DG-085): listener global document/window dan timer
 * yang dibuat selama siklus mount/unmount. Hanya untuk test browser.
 */

export interface LeakSnapshot {
  readonly documentListeners: number;
  readonly windowListeners: number;
  readonly timers: number;
}

export interface LeakTracker {
  snapshot(): LeakSnapshot;
  dispose(): void;
}

function createCounters(): {
  add(type: string): void;
  remove(type: string): void;
  total(): number;
} {
  const map = new Map<string, number>();
  return {
    add: (type) => map.set(type, (map.get(type) ?? 0) + 1),
    remove: (type) => map.set(type, Math.max(0, (map.get(type) ?? 0) - 1)),
    total: () => [...map.values()].reduce((sum, count) => sum + count, 0),
  };
}

type AddListener = (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => void;
type RemoveListener = (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | EventListenerOptions,
) => void;

interface ListenerPatch {
  readonly documentTotal: () => number;
  readonly windowTotal: () => number;
  readonly restore: () => void;
}

function patchListeners(): ListenerPatch {
  const documentCounters = createCounters();
  const windowCounters = createCounters();
  const originalDocumentAdd = document.addEventListener.bind(document);
  const originalDocumentRemove = document.removeEventListener.bind(document);
  const originalWindowAdd = window.addEventListener.bind(window);
  const originalWindowRemove = window.removeEventListener.bind(window);

  const addDocument: AddListener = (type, listener, options) => {
    documentCounters.add(type);
    originalDocumentAdd(type, listener, options);
  };
  const removeDocument: RemoveListener = (type, listener, options) => {
    documentCounters.remove(type);
    originalDocumentRemove(type, listener, options);
  };
  const addWindow: AddListener = (type, listener, options) => {
    windowCounters.add(type);
    originalWindowAdd(type, listener, options);
  };
  const removeWindow: RemoveListener = (type, listener, options) => {
    windowCounters.remove(type);
    originalWindowRemove(type, listener, options);
  };
  document.addEventListener = addDocument as typeof document.addEventListener;
  document.removeEventListener =
    removeDocument as typeof document.removeEventListener;
  window.addEventListener = addWindow as typeof window.addEventListener;
  window.removeEventListener =
    removeWindow as typeof window.removeEventListener;

  return {
    documentTotal: () => documentCounters.total(),
    windowTotal: () => windowCounters.total(),
    restore: () => {
      document.addEventListener =
        originalDocumentAdd as typeof document.addEventListener;
      document.removeEventListener =
        originalDocumentRemove as typeof document.removeEventListener;
      window.addEventListener =
        originalWindowAdd as typeof window.addEventListener;
      window.removeEventListener =
        originalWindowRemove as typeof window.removeEventListener;
    },
  };
}

interface TimerPatch {
  readonly pending: () => number;
  readonly restore: () => void;
}

function patchTimers(): TimerPatch {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();
  const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
  const originalClearTimeout = globalThis.clearTimeout.bind(globalThis);
  const originalSetInterval = globalThis.setInterval.bind(globalThis);
  const originalClearInterval = globalThis.clearInterval.bind(globalThis);

  globalThis.setTimeout = ((handler, timeout, ...args) => {
    const id = originalSetTimeout(() => {
      timers.delete(id);
      if (typeof handler === 'function') handler(...args);
      else if (typeof handler === 'string') (0, eval)(handler);
    }, timeout);
    timers.add(id);
    return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((id) => {
    if (id !== undefined) timers.delete(id);
    originalClearTimeout(id);
  }) as typeof clearTimeout;
  globalThis.setInterval = ((handler, timeout, ...args) => {
    const id = originalSetInterval(handler, timeout, ...args);
    intervals.add(id);
    return id;
  }) as typeof setInterval;
  globalThis.clearInterval = ((id) => {
    if (id !== undefined) intervals.delete(id);
    originalClearInterval(id);
  }) as typeof clearInterval;

  return {
    pending: () => timers.size + intervals.size,
    restore: () => {
      globalThis.setTimeout = originalSetTimeout as typeof setTimeout;
      globalThis.clearTimeout = originalClearTimeout as typeof clearTimeout;
      globalThis.setInterval = originalSetInterval as typeof setInterval;
      globalThis.clearInterval = originalClearInterval as typeof clearInterval;
    },
  };
}

export function createLeakTracker(): LeakTracker {
  const listeners = patchListeners();
  const timers = patchTimers();
  let disposed = false;
  return {
    snapshot: () => ({
      documentListeners: listeners.documentTotal(),
      windowListeners: listeners.windowTotal(),
      timers: timers.pending(),
    }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      listeners.restore();
      timers.restore();
    },
  };
}
