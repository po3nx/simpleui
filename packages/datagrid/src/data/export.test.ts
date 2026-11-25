import { describe, expect, it } from 'vitest';
import { normalizeColumnModel } from '../model/columns.js';
import {
  createSelectionColumn,
  SELECTION_COLUMN_ID,
} from '../view/selection-column.js';
import { exportCsv, sanitizeFilename, type CsvExportResult } from './export.js';

interface Row {
  id: number;
  name: string | null;
  total: number;
  born: string;
  secret: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10, born: '2026-01-15', secret: 'x' },
  { id: 2, name: null, total: 20, born: '2026-02-01', secret: 'y' },
];

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
  { dataField: 'born', caption: 'Lahir', width: 120, dataType: 'date' },
  { dataField: 'secret', caption: 'Rahasia', width: 100, visible: false },
]);

const CONTENT = (result: CsvExportResult): string[] =>
  result.content.split('\r\n');

describe('exportCsv — header dan nilai', () => {
  it('memakai caption sebagai header dan CRLF', () => {
    const result = exportCsv({ rows: ROWS, columns: COLUMNS });
    const lines = CONTENT(result);

    expect(lines[0]).toBe('Nama,Total,Lahir');
    expect(lines[1]).toBe('Ani,10,2026-01-15');
    expect(lines[2]).toBe(',20,2026-02-01');
    expect(result.content.endsWith('\r\n')).toBe(true);
    expect(result.rowCount).toBe(2);
  });

  it('mengecualikan kolom tersembunyi dan kolom seleksi', () => {
    const selection = createSelectionColumn<Row>({
      mode: 'multiple',
      getKey: (row) => row.id,
      isSelected: () => false,
      getVisibleKeys: () => [],
      getSelectedKeys: () => [],
      onToggle: () => {},
    });
    expect(selection.id).toBe(SELECTION_COLUMN_ID);

    const result = exportCsv({ rows: ROWS, columns: [selection, ...COLUMNS] });
    expect(CONTENT(result)[0]).toBe('Nama,Total,Lahir');
  });

  it('bisa tanpa header dan dengan delimiter kustom', () => {
    const result = exportCsv({
      rows: ROWS.slice(0, 1),
      columns: COLUMNS,
      includeHeaders: false,
      delimiter: ';',
    });
    expect(result.content).toBe('Ani;10;2026-01-15\r\n');
  });

  it('memakai calculateCellValue', () => {
    const computed = normalizeColumnModel<Row>([
      {
        dataField: 'name',
        caption: 'Nama',
        calculateCellValue: (row) => row.name?.toUpperCase() ?? '',
      },
    ]);
    const result = exportCsv({ rows: ROWS, columns: computed });
    expect(CONTENT(result)[1]).toBe('ANI');
  });

  it('Date menjadi ISO', () => {
    const dateColumn = normalizeColumnModel<Record<string, Date>>([
      { dataField: 'at', caption: 'At' },
    ]);
    const result = exportCsv({
      rows: [{ at: new Date('2026-01-15T10:00:00.000Z') }],
      columns: dateColumn,
    });
    expect(CONTENT(result)[1]).toBe('2026-01-15T10:00:00.000Z');
  });
});

describe('exportCsv — formula guard dan escaping', () => {
  const dangerous = normalizeColumnModel<Record<string, string>>([
    { dataField: 'value', caption: 'Value' },
  ]);

  function exportValue(value: string): string {
    return (
      exportCsv({ rows: [{ value }], columns: dangerous }).content.split(
        '\r\n',
      )[1] ?? ''
    );
  }

  it('memberi prefix kutip pada formula berbahaya', () => {
    for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '\tfoo']) {
      expect(exportValue(value).startsWith("'")).toBe(true);
    }
  });

  it('tidak mengubah teks biasa', () => {
    expect(exportValue('aman')).toBe('aman');
  });

  it('meng-quote koma, kutip, dan newline', () => {
    expect(exportValue('a,b')).toBe('"a,b"');
    expect(exportValue('a"b')).toBe('"a""b"');
    expect(exportValue('a\nb')).toBe('"a\nb"');
  });
});

describe('sanitizeFilename', () => {
  it('membuang path dan karakter tidak valid', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('etc-passwd.csv');
    expect(sanitizeFilename('laporan: q1/2026')).toBe('laporan-q1-2026.csv');
  });

  it('menangani nama kosong dan reserved', () => {
    expect(sanitizeFilename('   ')).toBe('simpleui-export.csv');
    expect(sanitizeFilename('CON.csv')).toMatch(/_CON\.csv$/i);
  });

  it('normalisasi ekstensi dan batas panjang', () => {
    expect(sanitizeFilename('report.CSV')).toBe('report.csv');
    const long = sanitizeFilename('a'.repeat(200));
    expect(long.length).toBe(84);
    expect(long.endsWith('.csv')).toBe(true);
  });

  it('membuang karakter kontrol', () => {
    expect(sanitizeFilename('a\u0000b\nc')).toBe('a-b-c.csv');
  });
});
