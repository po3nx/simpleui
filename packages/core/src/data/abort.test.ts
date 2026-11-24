import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimeoutSignal, throwIfAborted } from './abort.js';
import { DataError } from './errors.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createTimeoutSignal', () => {
  it('membatalkan dengan SUI-DATA-004 saat timeout', () => {
    vi.useFakeTimers();
    const timeout = createTimeoutSignal(100);

    expect(timeout.signal.aborted).toBe(false);
    vi.advanceTimersByTime(100);

    expect(timeout.signal.aborted).toBe(true);
    expect(timeout.timedOut).toBe(true);
    expect((timeout.signal.reason as DataError).code).toBe('SUI-DATA-004');
    timeout.dispose();
  });

  it('mengikuti pembatalan signal induk sebagai SUI-DATA-005', () => {
    const parent = new AbortController();
    const timeout = createTimeoutSignal(10_000, parent.signal);

    parent.abort();

    expect(timeout.timedOut).toBe(false);
    expect((timeout.signal.reason as DataError).code).toBe('SUI-DATA-005');
    timeout.dispose();
  });

  it('menghormati induk yang sudah dibatalkan', () => {
    const parent = new AbortController();
    parent.abort();

    const timeout = createTimeoutSignal(10_000, parent.signal);

    expect(timeout.signal.aborted).toBe(true);
    timeout.dispose();
  });

  it('dispose mencegah timer membatalkan signal', () => {
    vi.useFakeTimers();
    const timeout = createTimeoutSignal(50);
    timeout.dispose();

    vi.advanceTimersByTime(200);

    expect(timeout.signal.aborted).toBe(false);
  });
});

describe('throwIfAborted', () => {
  it('tidak melempar tanpa signal atau saat belum dibatalkan', () => {
    expect(() => throwIfAborted()).not.toThrow();
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it('meneruskan DataError dari reason signal', () => {
    const controller = new AbortController();
    const error = new DataError('SUI-DATA-004', 'timeout');
    controller.abort(error);

    expect(() => throwIfAborted(controller.signal)).toThrowError(error);
  });

  it('membungkus reason asing menjadi SUI-DATA-005', () => {
    const controller = new AbortController();
    controller.abort('alasan apa pun');

    try {
      throwIfAborted(controller.signal);
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataError).code).toBe('SUI-DATA-005');
    }
  });
});
