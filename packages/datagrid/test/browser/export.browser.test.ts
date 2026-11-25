import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadCsv } from '../../src/data/export.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadCsv', () => {
  it('membuat blob CSV ber-BOM dan memicu download', async () => {
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:simpleui');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    downloadCsv({ content: 'a,b\r\n', filename: 'laporan.csv', rowCount: 1 });

    expect(create).toHaveBeenCalledTimes(1);
    const blob = create.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await blob.text()).toBe('a,b\r\n');
    expect(revoke).toHaveBeenCalledWith('blob:simpleui');

    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('laporan.csv');
  });

  it('bom dapat dimatikan', async () => {
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:no-bom');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadCsv(
      { content: 'a\r\n', filename: 'x.csv', rowCount: 0 },
      { bom: false },
    );

    const blob = create.mock.calls[0]?.[0] as Blob;
    expect(await blob.text()).toBe('a\r\n');
  });
});
