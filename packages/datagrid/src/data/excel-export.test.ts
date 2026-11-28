import { describe, expect, it } from 'vitest';
import { exportExcel } from './excel-export.js';
import { normalizeColumnModel } from '../model/columns.js';

interface Row {
  name: string;
  total: number;
  active: boolean;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama' },
  { dataField: 'total', caption: 'Total', dataType: 'number' },
  { dataField: 'active', caption: 'Aktif', dataType: 'boolean' },
]);

const ROWS: Row[] = [
  { name: '=cmd|calc', total: 42, active: true },
  { name: '<script>', total: 7, active: false },
];

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe('exportExcel', () => {
  it('menghasilkan ZIP/XLSX dengan magic PK dan file OOXML', () => {
    const result = exportExcel({
      rows: ROWS,
      columns: COLUMNS,
      filename: 'laporan penjualan',
    });
    expect(result.filename).toBe('laporan penjualan.xlsx');
    expect(result.rowCount).toBe(2);
    expect(result.content[0]).toBe(0x50);
    expect(result.content[1]).toBe(0x4b);

    const text = decode(result.content);
    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('xl/workbook.xml');
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('sheet name="Sheet1"');
  });

  it('tidak pernah menulis formula dan meng-escape XML', () => {
    const result = exportExcel({ rows: ROWS, columns: COLUMNS });
    const text = decode(result.content);
    expect(text).not.toContain('<f>');
    expect(text).toContain('=cmd|calc');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('t="inlineStr"');
  });

  it('menulis angka dan boolean sebagai tipe Excel', () => {
    const result = exportExcel({ rows: ROWS, columns: COLUMNS });
    const text = decode(result.content);
    expect(text).toContain('<v>42</v>');
    expect(text).toContain('t="b"><v>1</v>');
    expect(text).toContain('t="b"><v>0</v>');
    expect(text).toContain('s="1"');
  });

  it('menyanitasi nama sheet dan nama file berbahaya', () => {
    const result = exportExcel({
      rows: ROWS,
      columns: COLUMNS,
      filename: '../CON*.xlsx',
      sheetName: 'Laporan/Bulan[1]',
    });
    expect(result.filename.endsWith('.xlsx')).toBe(true);
    expect(result.filename).not.toContain('../');
    const text = decode(result.content);
    expect(text).toContain('sheet name="Laporan-Bulan-1-"');
  });

  it('membuang karakter kontrol XML', () => {
    const result = exportExcel({
      rows: [{ name: 'A\u0000B\u0008C', total: 1, active: false }],
      columns: COLUMNS,
    });
    const text = decode(result.content);
    const start = text.indexOf('<worksheet');
    const end = text.indexOf('</worksheet>', start);
    const sheet = text.slice(start, end + '</worksheet>'.length);
    expect(sheet).not.toContain('\u0000');
    expect(sheet).not.toContain('\u0008');
    expect(sheet).toContain('ABC');
  });
});
