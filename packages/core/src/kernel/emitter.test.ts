import { describe, expect, it, vi } from 'vitest';
import { Emitter } from './emitter.js';

type Events = {
  selectionChanged: { rows: number[] };
  errorOccurred: { message: string };
};

describe('Emitter', () => {
  it('memanggil listener dengan payload yang sama', () => {
    const emitter = new Emitter<Events>();
    const listener = vi.fn();

    emitter.on('selectionChanged', listener);
    emitter.emit('selectionChanged', { rows: [1, 2] });

    expect(listener).toHaveBeenCalledWith({ rows: [1, 2] });
  });

  it('melepas listener lewat off()', () => {
    const emitter = new Emitter<Events>();
    const listener = vi.fn();

    emitter.on('selectionChanged', listener);
    expect(emitter.off('selectionChanged', listener)).toBe(true);
    expect(emitter.off('selectionChanged', listener)).toBe(false);

    emitter.emit('selectionChanged', { rows: [] });
    expect(listener).not.toHaveBeenCalled();
  });

  it('melepas listener lewat handle yang dikembalikan on()', () => {
    const emitter = new Emitter<Events>();
    const listener = vi.fn();

    const unsubscribe = emitter.on('errorOccurred', listener);
    unsubscribe();
    emitter.emit('errorOccurred', { message: 'x' });

    expect(listener).not.toHaveBeenCalled();
    expect(emitter.listenerCount('errorOccurred')).toBe(0);
  });

  it('once hanya terpanggil sekali', () => {
    const emitter = new Emitter<Events>();
    const listener = vi.fn();

    emitter.once('selectionChanged', listener);
    emitter.emit('selectionChanged', { rows: [1] });
    emitter.emit('selectionChanged', { rows: [2] });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount('selectionChanged')).toBe(0);
  });

  it('menghitung listener aktif', () => {
    const emitter = new Emitter<Events>();
    emitter.on('selectionChanged', () => {});
    emitter.on('selectionChanged', () => {});
    emitter.on('errorOccurred', () => {});

    expect(emitter.listenerCount('selectionChanged')).toBe(2);
  });

  it('removeAll(type) hanya membersihkan event tersebut', () => {
    const emitter = new Emitter<Events>();
    const other = vi.fn();

    emitter.on('selectionChanged', () => {});
    emitter.on('errorOccurred', other);
    emitter.removeAll('selectionChanged');

    expect(emitter.listenerCount('selectionChanged')).toBe(0);
    emitter.emit('errorOccurred', { message: 'tetap' });
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('removeAll() membersihkan semua event', () => {
    const emitter = new Emitter<Events>();
    emitter.on('selectionChanged', () => {});
    emitter.on('errorOccurred', () => {});

    emitter.removeAll();

    expect(emitter.listenerCount('selectionChanged')).toBe(0);
    expect(emitter.listenerCount('errorOccurred')).toBe(0);
  });

  it('emit tanpa listener tidak melempar', () => {
    const emitter = new Emitter<Events>();
    expect(() => emitter.emit('selectionChanged', { rows: [] })).not.toThrow();
  });

  it('error listener dikumpulkan lalu dilempar setelah semua selesai', () => {
    const emitter = new Emitter<Events>();
    const after = vi.fn();

    emitter.on('selectionChanged', () => {
      throw new Error('listener gagal');
    });
    emitter.on('selectionChanged', after);

    expect(() => emitter.emit('selectionChanged', { rows: [] })).toThrowError(
      AggregateError,
    );
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('onListenerError menerima error tanpa menghentikan emit', () => {
    const onListenerError = vi.fn();
    const emitter = new Emitter<Events>({ onListenerError });
    const after = vi.fn();

    emitter.on('selectionChanged', () => {
      throw new Error('gagal');
    });
    emitter.on('selectionChanged', after);

    expect(() => emitter.emit('selectionChanged', { rows: [] })).not.toThrow();
    expect(onListenerError).toHaveBeenCalledTimes(1);
    expect(onListenerError.mock.calls[0]?.[1]).toBe('selectionChanged');
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('dispose menghentikan emit dan pendaftaran berikutnya', () => {
    const emitter = new Emitter<Events>();
    const listener = vi.fn();

    emitter.dispose();
    emitter.dispose();

    expect(emitter.disposed).toBe(true);
    expect(emitter.on('selectionChanged', listener)).toBeTypeOf('function');
    emitter.emit('selectionChanged', { rows: [] });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Emitter — banyak listener', () => {
  it('off hanya melepas listener yang dimaksud', () => {
    const emitter = new Emitter<Events>();
    const first = vi.fn();
    const second = vi.fn();

    emitter.on('selectionChanged', first);
    emitter.on('selectionChanged', second);
    expect(emitter.off('selectionChanged', first)).toBe(true);

    emitter.emit('selectionChanged', { rows: [] });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount('selectionChanged')).toBe(1);
  });

  it('handle unsubscribe menyisakan listener lain', () => {
    const emitter = new Emitter<Events>();
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribe = emitter.on('selectionChanged', first);
    emitter.on('selectionChanged', second);
    unsubscribe();

    emitter.emit('selectionChanged', { rows: [] });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
