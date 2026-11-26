import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  total: number;
  hidden: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 80 },
  { dataField: 'total', caption: 'Total', width: 120, dataType: 'number' },
  { dataField: 'hidden', caption: 'Sembunyi', visible: false },
]);

function mount(
  options: Partial<Parameters<typeof createGridView<Row>>[0]> = {},
) {
  const container = document.createElement('div');
  container.style.height = '300px';
  document.body.append(container);
  const view = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 1000,
    rowHeight: 32,
    footer: true,
    ...options,
  });
  return { container, view };
}

describe('GridView — struktur DOM dan ARIA', () => {
  it('membentuk grid, header, viewport, spacer, footer, live region', () => {
    const { container, view } = mount();

    expect(view.element.getAttribute('role')).toBe('grid');
    expect(view.element.getAttribute('aria-rowcount')).toBe('1000');
    expect(view.element.getAttribute('aria-colcount')).toBe('2');

    expect(view.headerElement.getAttribute('role')).toBe('rowgroup');
    const headerRow = view.headerElement.querySelector('[role="row"]');
    expect(headerRow).not.toBeNull();

    const headers = view.headerElement.querySelectorAll(
      '[role="columnheader"]',
    );
    expect(headers).toHaveLength(2);
    expect(headers[0]?.textContent).toBe('ID');
    expect(headers[1]?.getAttribute('aria-colindex')).toBe('2');

    expect(view.spacerElement.style.blockSize).toBe('32000px');
    expect(view.spacerElement.contains(view.rowsElement)).toBe(true);
    expect(container.contains(view.element)).toBe(true);
  });

  it('mengecualikan kolom tersembunyi dan memakai alignment kolom', () => {
    const { view } = mount();
    const headers = view.headerElement.querySelectorAll(
      '[role="columnheader"]',
    );

    expect([...headers].map((header) => header.textContent)).toEqual([
      'ID',
      'Total',
    ]);
    expect((headers[1] as HTMLElement).style.justifyContent).toBe('flex-end');
    expect((headers[0] as HTMLElement).style.flexBasis).toBe('80px');
  });

  it('header/footer di luar viewport, live region sopan', () => {
    const { view } = mount();

    expect(view.headerElement.parentElement).toBe(view.element);
    expect(view.footerElement.parentElement).toBe(view.element);
    expect(view.viewportElement.contains(view.headerElement)).toBe(false);
    expect(view.footerElement.hidden).toBe(false);
    expect(view.liveElement.getAttribute('aria-live')).toBe('polite');
    expect(view.liveElement.getAttribute('aria-atomic')).toBe('true');
  });

  it('footer tersembunyi secara default', () => {
    const { view } = mount({ footer: false });
    expect(view.footerElement.hidden).toBe(true);
  });

  it('mendukung RTL', () => {
    const { view } = mount({ rtl: true });
    expect(view.element.getAttribute('dir')).toBe('rtl');
  });
});

describe('GridView — pembaruan', () => {
  it('setRowCount memperbarui aria dan spacer', () => {
    const { view } = mount();
    view.setRowCount(250);

    expect(view.element.getAttribute('aria-rowcount')).toBe('250');
    expect(view.spacerElement.style.blockSize).toBe('8000px');
  });

  it('setColumns merender ulang header dan colcount', () => {
    const { view } = mount();
    view.setColumns(
      normalizeColumnModel<Row>([{ dataField: 'id', caption: 'Hanya ID' }]),
    );

    expect(view.element.getAttribute('aria-colcount')).toBe('1');
    const headers = view.headerElement.querySelectorAll(
      '[role="columnheader"]',
    );
    expect(headers).toHaveLength(1);
    expect(headers[0]?.textContent).toBe('Hanya ID');
  });

  it('meneruskan scroll viewport lewat callback', () => {
    const onScroll = vi.fn();
    const { view } = mount({ onScroll });

    view.viewportElement.scrollTop = 128;
    view.viewportElement.dispatchEvent(new Event('scroll'));

    expect(onScroll).toHaveBeenCalledWith(128);
  });

  it('dispose melepas DOM dan listener', () => {
    const onScroll = vi.fn();
    const { container, view } = mount({ onScroll });

    view.dispose();
    view.viewportElement.dispatchEvent(new Event('scroll'));

    expect(container.childElementCount).toBe(0);
    expect(onScroll).not.toHaveBeenCalled();
  });
});
