import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScheduler, yieldToMain } from './scheduler.js';

function createFakeHost() {
  const frames = new Map<number, () => void>();
  const microtasks: Array<() => void> = [];
  const canceled: number[] = [];
  let nextHandle = 1;

  return {
    host: {
      requestFrame: (callback: () => void) => {
        const handle = nextHandle;
        nextHandle += 1;
        frames.set(handle, callback);
        return handle;
      },
      cancelFrame: (handle: number) => {
        canceled.push(handle);
        frames.delete(handle);
      },
      scheduleMicrotask: (callback: () => void) => {
        microtasks.push(callback);
      },
    },
    frames,
    microtasks,
    canceled,
    runFrames() {
      for (const [handle, callback] of [...frames]) {
        frames.delete(handle);
        callback();
      }
    },
    runMicrotasks() {
      while (microtasks.length > 0) microtasks.shift()?.();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createScheduler', () => {
  it('menggabungkan banyak permintaan render menjadi satu frame', () => {
    const fake = createFakeHost();
    const scheduler = createScheduler(fake.host);
    const first = vi.fn();
    const second = vi.fn();

    scheduler.scheduleRender(first);
    scheduler.scheduleRender(second);

    expect(fake.frames.size).toBe(1);
    expect(scheduler.renderPending).toBe(true);

    fake.runFrames();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(scheduler.renderPending).toBe(false);
  });

  it('menjalankan notifikasi lewat microtask host', () => {
    const fake = createFakeHost();
    const scheduler = createScheduler(fake.host);
    const notify = vi.fn();

    scheduler.scheduleNotification(notify);
    expect(notify).not.toHaveBeenCalled();

    fake.runMicrotasks();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(scheduler.notificationPending).toBe(false);
  });

  it('flush menjalankan notifikasi lebih dulu, lalu render', () => {
    const fake = createFakeHost();
    const scheduler = createScheduler(fake.host);
    const order: string[] = [];

    scheduler.scheduleRender(() => order.push('render'));
    scheduler.scheduleNotification(() => order.push('notification'));
    scheduler.flush();

    expect(order).toEqual(['notification', 'render']);
    expect(fake.canceled).toHaveLength(1);
    expect(scheduler.renderPending).toBe(false);
  });

  it('dispose membatalkan frame tertunda dan mengabaikan permintaan baru', () => {
    const fake = createFakeHost();
    const scheduler = createScheduler(fake.host);
    const render = vi.fn();

    scheduler.scheduleRender(render);
    scheduler.dispose();
    scheduler.scheduleRender(render);
    scheduler.flush();

    expect(fake.canceled).toHaveLength(1);
    expect(render).not.toHaveBeenCalled();
    expect(scheduler.renderPending).toBe(false);
  });

  it('mengabaikan scheduleNotification setelah dispose', () => {
    const fake = createFakeHost();
    const scheduler = createScheduler(fake.host);
    const notify = vi.fn();

    scheduler.dispose();
    scheduler.scheduleNotification(notify);
    fake.runMicrotasks();

    expect(notify).not.toHaveBeenCalled();
  });
});

describe('yieldToMain', () => {
  it('memakai scheduler.yield bila tersedia', async () => {
    const yieldFn = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('scheduler', { yield: yieldFn });

    await yieldToMain();

    expect(yieldFn).toHaveBeenCalledTimes(1);
  });

  it('jatuh ke setTimeout bila scheduler.yield tidak ada', async () => {
    vi.stubGlobal('scheduler', undefined);

    await expect(yieldToMain()).resolves.toBeUndefined();
  });
});

describe('createScheduler — host default', () => {
  it('memakai fallback setTimeout bila requestAnimationFrame tidak ada', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.useFakeTimers();

    const scheduler = createScheduler();
    const render = vi.fn();
    scheduler.scheduleRender(render);

    expect(render).not.toHaveBeenCalled();
    vi.advanceTimersByTime(16);
    expect(render).toHaveBeenCalledTimes(1);

    scheduler.dispose();
    vi.useRealTimers();
  });

  it('membatalkan fallback frame saat dispose', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.useFakeTimers();

    const scheduler = createScheduler();
    const render = vi.fn();
    scheduler.scheduleRender(render);
    scheduler.dispose();
    vi.advanceTimersByTime(32);

    expect(render).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('menjalankan notifikasi lewat microtask default', async () => {
    const scheduler = createScheduler();
    const notify = vi.fn();
    scheduler.scheduleNotification(notify);

    await Promise.resolve();

    expect(notify).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });
});
