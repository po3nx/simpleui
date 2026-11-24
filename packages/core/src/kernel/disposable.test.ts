import { describe, expect, it, vi } from 'vitest';
import { DisposableBag } from './disposable.js';

describe('DisposableBag', () => {
  it('membersihkan resource dengan urutan LIFO', () => {
    const bag = new DisposableBag();
    const order: string[] = [];

    bag.add(() => order.push('pertama'));
    bag.add(() => order.push('kedua'));
    bag.add(() => order.push('ketiga'));

    bag.dispose();

    expect(order).toEqual(['ketiga', 'kedua', 'pertama']);
  });

  it('idempoten dan hanya membersihkan sekali', () => {
    const bag = new DisposableBag();
    const dispose = vi.fn();
    bag.add(dispose);

    bag.dispose();
    bag.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(bag.disposed).toBe(true);
  });

  it('melaporkan jumlah resource aktif', () => {
    const bag = new DisposableBag();
    expect(bag.size).toBe(0);

    bag.add(() => {});
    bag.add(() => {});
    expect(bag.size).toBe(2);
  });

  it('handle dapat membatalkan pendaftaran', () => {
    const bag = new DisposableBag();
    const dispose = vi.fn();

    const cancel = bag.add(dispose);
    cancel();
    cancel();

    bag.dispose();
    expect(dispose).not.toHaveBeenCalled();
    expect(bag.size).toBe(0);
  });

  it('langsung membersihkan resource yang didaftarkan setelah dispose', () => {
    const bag = new DisposableBag();
    bag.dispose();

    const dispose = vi.fn();
    bag.add(dispose);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(bag.size).toBe(0);
  });

  it('tetap membersihkan resource lain meski satu gagal', () => {
    const bag = new DisposableBag();
    const later = vi.fn();

    bag.add(() => {
      throw new Error('gagal bersih');
    });
    bag.add(later);

    expect(() => bag.dispose()).toThrowError(AggregateError);
    expect(later).toHaveBeenCalledTimes(1);
  });
});
