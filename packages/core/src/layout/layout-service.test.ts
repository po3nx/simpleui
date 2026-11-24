import { describe, expect, it, vi } from 'vitest';
import {
  createLayoutService,
  measureElement,
  type ResizeEntryLike,
  type ResizeObserverLike,
} from './layout-service.js';

function fakeElement(width: number, height: number): Element {
  return {
    getBoundingClientRect: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  } as unknown as Element;
}

function setupObserver() {
  const observed = new Set<Element>();
  let callback: ((entries: ResizeEntryLike[]) => void) | null = null;
  let disconnected = false;

  const factory = (
    emit: (entries: ResizeEntryLike[]) => void,
  ): ResizeObserverLike => {
    callback = emit;
    return {
      observe: (target) => observed.add(target),
      unobserve: (target) => observed.delete(target),
      disconnect: () => {
        disconnected = true;
        observed.clear();
      },
    };
  };

  return {
    factory,
    observed,
    isDisconnected: () => disconnected,
    emit(entries: ResizeEntryLike[]) {
      callback?.(entries);
    },
  };
}

describe('measureElement', () => {
  it('mengembalikan ukuran dari getBoundingClientRect', () => {
    expect(measureElement(fakeElement(120, 40))).toEqual({
      width: 120,
      height: 40,
    });
  });
});

describe('createLayoutService', () => {
  it('mengukur elemen lewat service', () => {
    const service = createLayoutService();
    expect(service.measure(fakeElement(50, 20))).toEqual({
      width: 50,
      height: 20,
    });
    service.dispose();
  });

  it('memakai measure kustom bila diberikan', () => {
    const service = createLayoutService({
      measure: () => ({ width: 9, height: 9 }),
    });

    expect(service.measure(fakeElement(1, 1))).toEqual({ width: 9, height: 9 });
    service.dispose();
  });

  it('mengamati elemen dan memberi tahu hanya saat ukuran berubah', () => {
    const observer = setupObserver();
    const service = createLayoutService({ createObserver: observer.factory });
    const element = fakeElement(100, 30);
    const listener = vi.fn();

    service.observe(element, listener);
    expect(observer.observed.has(element)).toBe(true);
    expect(service.observedCount).toBe(1);
    // Ukuran awal langsung dikirim agar consumer tidak perlu measure() manual.
    expect(listener).toHaveBeenCalledWith({ width: 100, height: 30 });

    observer.emit([
      { target: element, contentRect: { width: 100, height: 30 } },
    ]);
    expect(listener).toHaveBeenCalledTimes(1);

    observer.emit([
      { target: element, contentRect: { width: 140, height: 30 } },
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ width: 140, height: 30 });

    service.dispose();
  });

  it('mendukung beberapa listener pada satu elemen', () => {
    const observer = setupObserver();
    const service = createLayoutService({ createObserver: observer.factory });
    const element = fakeElement(10, 10);
    const first = vi.fn();
    const second = vi.fn();

    const stopFirst = service.observe(element, first);
    service.observe(element, second);
    observer.emit([
      { target: element, contentRect: { width: 20, height: 10 } },
    ]);

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);

    stopFirst();
    observer.emit([
      { target: element, contentRect: { width: 30, height: 10 } },
    ]);

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(3);
    expect(observer.observed.has(element)).toBe(true);

    service.dispose();
  });

  it('melepas observer saat listener terakhir berhenti', () => {
    const observer = setupObserver();
    const service = createLayoutService({ createObserver: observer.factory });
    const element = fakeElement(10, 10);

    const stop = service.observe(element, () => {});
    stop();

    expect(observer.observed.has(element)).toBe(false);
    expect(service.observedCount).toBe(0);

    service.dispose();
  });

  it('memberi pengukuran awal saat ResizeObserver tidak tersedia', () => {
    const service = createLayoutService();
    const listener = vi.fn();

    service.observe(fakeElement(64, 32), listener);

    expect(listener).toHaveBeenCalledWith({ width: 64, height: 32 });
    expect(service.observedCount).toBe(1);

    service.dispose();
  });

  it('dispose memutus observer dan mengabaikan observe berikutnya', () => {
    const observer = setupObserver();
    const service = createLayoutService({ createObserver: observer.factory });
    const element = fakeElement(10, 10);

    service.observe(element, () => {});
    service.dispose();

    expect(observer.isDisconnected()).toBe(true);
    expect(service.disposed).toBe(true);
    expect(service.observedCount).toBe(0);

    const late = vi.fn();
    const stop = service.observe(fakeElement(1, 1), late);
    stop();
    expect(late).not.toHaveBeenCalled();
  });
});
