import {
  exportColumns,
  valueForExport,
  type CsvExportOptions,
} from './export.js';
import { createZip } from './zip.js';

/**
 * Excel export OOXML minimal (DG-071): XLSX tanpa dependensi eksternal,
 * semua sel string sebagai inlineStr (tidak ada formula → aman dari CSV/Excel
 * formula injection), angka/boolean bertipe, dan sanitasi XML.
 */

export interface ExcelExportOptions<T extends object> extends Omit<
  CsvExportOptions<T>,
  'delimiter'
> {
  readonly sheetName?: string;
}

export interface ExcelExportResult {
  readonly content: Uint8Array;
  readonly filename: string;
  readonly rowCount: number;
  readonly mimeType: string;
}

// eslint-disable-next-line no-control-regex -- karakter kontrol XML harus dibuang.
const INVALID_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;
const INVALID_SHEET = /[\\/:*?[\]']/g;

function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index: number): string {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function cellXml(value: unknown, reference: string, style = 0): string {
  const styled = style > 0 ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${styled}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}"${styled} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = escapeXml(
    value instanceof Date ? value.toISOString() : String(value ?? ''),
  );
  // inlineStr tidak pernah dieksekusi sebagai formula, termasuk teks "=...".
  return `<c r="${reference}"${styled} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function sheetXml<T extends object>(options: ExcelExportOptions<T>): string {
  const columns = exportColumns(options.columns);
  const rows: string[] = [];
  if (options.includeHeaders ?? true) {
    rows.push(
      `<row r="1">${columns
        .map((column, index) =>
          cellXml(column.caption, `${columnName(index)}1`, 1),
        )
        .join('')}</row>`,
    );
  }
  options.rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + ((options.includeHeaders ?? true) ? 2 : 1);
    rows.push(
      `<row r="${rowNumber}">${columns
        .map((column, index) =>
          cellXml(
            valueForExport(row, column),
            `${columnName(index)}${rowNumber}`,
          ),
        )
        .join('')}</row>`,
    );
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData></worksheet>`;
}

function workbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;
}

function files<T extends object>(
  options: ExcelExportOptions<T>,
  sheetName: string,
): Record<string, string> {
  return {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': workbookXml(sheetName),
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': stylesXml(),
    'xl/worksheets/sheet1.xml': sheetXml(options),
  };
}

function sanitizeSheetName(input: string | undefined): string {
  const cleaned = (input ?? 'Sheet1').replace(INVALID_SHEET, '-').trim();
  return (cleaned === '' ? 'Sheet1' : cleaned).slice(0, 31);
}

function excelFilename(input: string | undefined): string {
  const base = (input ?? 'simpleui-export')
    .replace(/\.(csv|xlsx)$/i, '')
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, '-')
    .trim();
  return `${base === '' ? 'simpleui-export' : base}.xlsx`;
}

export function exportExcel<T extends object>(
  options: ExcelExportOptions<T>,
): ExcelExportResult {
  const sheetName = sanitizeSheetName(options.sheetName);
  return {
    content: createZip(files(options, sheetName)),
    filename: excelFilename(options.filename),
    rowCount: options.rows.length,
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

export function downloadExcel(result: ExcelExportResult): void {
  const blob = new Blob([result.content as unknown as BlobPart], {
    type: result.mimeType,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
