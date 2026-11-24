import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsv } from './csv.js';

describe('escapeCsvCell', () => {
  it('memberi prefix kutip untuk karakter formula', () => {
    for (const value of ['=1+1', '+62', '-5', '@user', '\ttext']) {
      expect(escapeCsvCell(value)).toBe(`'${value}`);
    }
  });

  it('tetap mengutip sel yang mengandung CR setelah prefix', () => {
    expect(escapeCsvCell('\rtext')).toBe('"\'\rtext"');
  });

  it('mengutip nilai yang mengandung delimiter, kutip, atau newline', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('kata "kutip"')).toBe('"kata ""kutip"""');
    expect(escapeCsvCell('baris\nbaru')).toBe('"baris\nbaru"');
  });

  it('mengosongkan null/undefined dan mempertahankan teks biasa', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell('Ani')).toBe('Ani');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('mendukung delimiter kustom', () => {
    expect(escapeCsvCell('a;b', ';')).toBe('"a;b"');
  });
});

describe('toCsv', () => {
  it('menulis header dan baris dengan escaping', () => {
    const csv = toCsv([
      { name: 'Ani', note: '=cmd' },
      { name: 'Budi, S.Kom', note: 'baris\nbaru' },
    ]);

    expect(csv).toBe(
      'name,note\r\nAni,\'=cmd\r\n"Budi, S.Kom","baris\nbaru"\r\n',
    );
  });

  it('menghormati pilihan kolom dan urutannya', () => {
    const csv = toCsv([{ a: 1, b: 2 }], { columns: ['b'] });
    expect(csv).toBe('b\r\n2\r\n');
  });

  it('mengembalikan string kosong untuk data kosong', () => {
    expect(toCsv([])).toBe('');
  });
});
