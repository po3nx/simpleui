import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertBrowser, isBrowser } from './env.js';

describe('isBrowser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return false when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(isBrowser()).toBe(false);
  });

  it('should return false when window exists but document does not', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', undefined);
    expect(isBrowser()).toBe(false);
  });

  it('should return true when window and document exist', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
    expect(isBrowser()).toBe(true);
  });
});

describe('assertBrowser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should throw when called outside a browser', () => {
    vi.stubGlobal('window', undefined);
    expect(() => assertBrowser('DataGrid')).toThrowError(/requires a browser/);
  });

  it('should not throw when called in a browser', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
    expect(() => assertBrowser('DataGrid')).not.toThrow();
  });
});
