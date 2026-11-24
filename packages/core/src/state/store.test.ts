import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store.js';

interface State {
  count: number;
  label: string;
}

function setup(): { store: ReturnType<typeof createStore<State>> } {
  return { store: createStore<State>({ count: 0, label: 'awal' }) };
}

describe('createStore', () => {
  it('mengembalikan state awal', () => {
    const { store } = setup();
    expect(store.getState()).toEqual({ count: 0, label: 'awal' });
  });

  it('setState parsial menggabungkan state', () => {
    const { store } = setup();
    store.setState({ count: 1 });

    expect(store.getState()).toEqual({ count: 1, label: 'awal' });
  });

  it('setState dengan fungsi menerima state terkini', () => {
    const { store } = setup();
    store.setState((state) => ({ count: state.count + 5 }));

    expect(store.getState().count).toBe(5);
  });

  it('tidak memberi notifikasi bila state tidak berubah', () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 0 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe menerima state baru dan sebelumnya', () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    const [current, previous] = listener.mock.calls[0] as [State, State];
    expect(current.count).toBe(2);
    expect(previous.count).toBe(0);
  });

  it('unsubscribe menghentikan notifikasi', () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setState({ count: 3 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('transaction menggabungkan perubahan menjadi satu notifikasi', () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);

    store.transaction(() => {
      store.setState({ count: 1 });
      store.setState({ count: 2 });
      store.setState({ label: 'baru' });
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const [current, previous] = listener.mock.calls[0] as [State, State];
    expect(current).toEqual({ count: 2, label: 'baru' });
    expect(previous).toEqual({ count: 0, label: 'awal' });
  });

  it('transaction bersarang tetap menghasilkan satu notifikasi', () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);

    store.transaction(() => {
      store.setState({ count: 1 });
      store.transaction(() => {
        store.setState({ count: 2 });
      });
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getState di dalam transaksi sudah melihat perubahan', () => {
    const { store } = setup();

    store.transaction(() => {
      store.setState({ count: 7 });
      expect(store.getState().count).toBe(7);
    });
  });

  it('listener error dikumpulkan tanpa menghentikan listener lain', () => {
    const { store } = setup();
    const healthy = vi.fn();

    store.subscribe(() => {
      throw new Error('listener gagal');
    });
    store.subscribe(healthy);

    expect(() => store.setState({ count: 1 })).toThrowError(AggregateError);
    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it('dispose menghentikan notifikasi dan perubahan berikutnya', () => {
    const { store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispose();
    store.setState({ count: 9 });
    store.transaction(() => store.setState({ count: 10 }));

    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().count).toBe(0);
  });

  it('subscribe setelah dispose tidak mendaftar', () => {
    const { store } = setup();
    store.dispose();

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setState({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
  });
});
