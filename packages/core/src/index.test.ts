import { describe, expect, it } from 'vitest';
import { VERSION, assertBrowser, isBrowser } from './index.js';

describe('public API @simpleui/core', () => {
  it('mengekspor fungsi environment', () => {
    expect(typeof isBrowser).toBe('function');
    expect(typeof assertBrowser).toBe('function');
  });

  it('mengekspor VERSION dalam format semver', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
