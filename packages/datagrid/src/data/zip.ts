/**
 * ZIP writer minimal (store method) untuk OOXML export (DG-071).
 * Tanpa dependensi eksternal; cukup untuk beberapa file XML kecil.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

interface CentralEntry {
  readonly name: Uint8Array;
  readonly crc: number;
  readonly size: number;
  readonly offset: number;
}

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function writeLocal(
  chunks: number[],
  name: string,
  content: string,
): CentralEntry {
  const nameBytes = encode(name);
  const data = encode(content);
  const checksum = crc32(data);
  const offset = chunks.length;
  chunks.push(
    ...u32(0x04034b50),
    ...u16(20),
    ...u16(0x0800),
    ...u16(0),
    ...u16(0),
    ...u16(0x21),
    ...u32(checksum),
    ...u32(data.length),
    ...u32(data.length),
    ...u16(nameBytes.length),
    ...u16(0),
    ...nameBytes,
    ...data,
  );
  return { name: nameBytes, crc: checksum, size: data.length, offset };
}

function writeCentral(chunks: number[], entry: CentralEntry): void {
  chunks.push(
    ...u32(0x02014b50),
    ...u16(20),
    ...u16(20),
    ...u16(0x0800),
    ...u16(0),
    ...u16(0),
    ...u16(0x21),
    ...u32(entry.crc),
    ...u32(entry.size),
    ...u32(entry.size),
    ...u16(entry.name.length),
    ...u16(0),
    ...u16(0),
    ...u16(0),
    ...u16(0),
    ...u32(0),
    ...u32(entry.offset),
    ...entry.name,
  );
}

export function createZip(files: Readonly<Record<string, string>>): Uint8Array {
  const chunks: number[] = [];
  const central: CentralEntry[] = [];
  for (const [name, content] of Object.entries(files)) {
    central.push(writeLocal(chunks, name, content));
  }
  const centralStart = chunks.length;
  for (const entry of central) writeCentral(chunks, entry);
  const centralSize = chunks.length - centralStart;
  chunks.push(
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(central.length),
    ...u16(central.length),
    ...u32(centralSize),
    ...u32(centralStart),
    ...u16(0),
  );
  return new Uint8Array(chunks);
}
