import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Token adalah kontrak publik: nilai yang salah langsung terasa di consumer.
 * Test ini menjaga kelengkapan token, kontras teks (WCAG), density, dan
 * larangan nilai warna hardcoded di CSS dasar (docs/06 §1).
 */

const read = (file: string): string =>
  readFileSync(new URL(file, import.meta.url), 'utf8');

const tokensCss = read('./tokens.css');
const baseCss = read('./base.css');
const indexCss = read('./index.css');

/** Ambil deklarasi custom property dari blok CSS pertama yang cocok. */
function blockOf(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector tidak ditemukan: ${selector}`);

  const open = css.indexOf('{', start);
  let depth = 0;
  let end = -1;

  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  const body = css.slice(open + 1, end);
  const declarations: Record<string, string> = {};
  for (const match of body.matchAll(/(--sui-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations[match[1]] = match[2].trim();
  }
  return declarations;
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const size = value.length === 3 ? 1 : 2;
  const parts = [0, 1, 2].map((index) =>
    Number.parseInt(value.slice(index * size, index * size + size), 16),
  );
  const [red, green, blue] = parts.map(channelToLinear) as [
    number,
    number,
    number,
  ];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

const defaults = blockOf(tokensCss, ':root,\n  .sui-theme');
const dark = blockOf(tokensCss, "[data-theme='dark']");
const highContrast = blockOf(tokensCss, "[data-theme='high-contrast']");

describe('token tema', () => {
  it('default mendefinisikan seluruh kategori token', () => {
    const required = [
      '--sui-color-bg-surface',
      '--sui-color-text-primary',
      '--sui-color-accent-default',
      '--sui-space-4',
      '--sui-font-family-base',
      '--sui-font-size-md',
      '--sui-line-height-normal',
      '--sui-radius-md',
      '--sui-shadow-overlay',
      '--sui-border-width',
      '--sui-focus-ring-width',
      '--sui-z-modal',
      '--sui-motion-duration-fast',
      '--sui-density-row-height',
    ];

    for (const token of required) {
      expect(defaults[token], `token ${token} hilang`).toBeTruthy();
    }
  });

  it('tema gelap menimpa permukaan dan teks', () => {
    expect(dark['--sui-color-bg-surface']).not.toBe(
      defaults['--sui-color-bg-surface'],
    );
    expect(dark['--sui-color-text-primary']).not.toBe(
      defaults['--sui-color-text-primary'],
    );
  });

  it('kontras teks default memenuhi WCAG AA (>= 4.5:1)', () => {
    const surface = defaults['--sui-color-bg-surface'];
    expect(
      contrast(defaults['--sui-color-text-primary'], surface),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(defaults['--sui-color-text-secondary'], surface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('kontras teks tema gelap memenuhi WCAG AA', () => {
    const surface = dark['--sui-color-bg-surface'];
    expect(
      contrast(dark['--sui-color-text-primary'], surface),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(dark['--sui-color-text-secondary'], surface),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('tema kontras tinggi memenuhi WCAG AAA (>= 7:1)', () => {
    const surface = highContrast['--sui-color-bg-surface'];
    expect(
      contrast(highContrast['--sui-color-text-primary'], surface),
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(highContrast['--sui-color-text-secondary'], surface),
    ).toBeGreaterThanOrEqual(7);
  });

  it('density mengubah tinggi baris sesuai docs/06 §1.5', () => {
    expect(defaults['--sui-density-row-height']).toBe('40px');
    expect(
      blockOf(tokensCss, "[data-density='compact']")[
        '--sui-density-row-height'
      ],
    ).toBe('28px');
    expect(
      blockOf(tokensCss, "[data-density='spacious']")[
        '--sui-density-row-height'
      ],
    ).toBe('48px');
  });
});

describe('disiplin CSS', () => {
  it('CSS dasar tidak memakai warna hardcoded', () => {
    // Semua warna harus lewat var(--sui-*), bukan literal.
    expect(baseCss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(baseCss).not.toMatch(/\brgba?\(/i);
  });

  it('index.css mendeklarasikan urutan layer lengkap sebelum @import', () => {
    const layerOrder =
      '@layer simpleui.reset, simpleui.tokens, simpleui.base, simpleui.component, simpleui.utilities';
    expect(indexCss.replace(/\s+/g, ' ')).toContain(layerOrder);

    // Komentar boleh menyebut nama aturan; yang diperiksa adalah deklarasi asli.
    const withoutComments = indexCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const layerIndex = withoutComments.indexOf('@layer simpleui.reset');
    const firstImport = withoutComments.indexOf("@import './");

    expect(layerIndex).toBeGreaterThanOrEqual(0);
    expect(firstImport).toBeGreaterThanOrEqual(0);
    expect(layerIndex).toBeLessThan(firstImport);
  });
});
