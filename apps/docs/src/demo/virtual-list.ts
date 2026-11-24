import {
  classNames,
  createElement,
  setAttributes,
  setStyle,
  Virtualizer,
} from '@simpleui/core';

const ROW_HEIGHT = 36;
const VIEWPORT_HEIGHT = 380;

function createRow(index: number, total: number): HTMLElement {
  const row = createElement('div', {
    className: classNames(
      'sui-demo-row',
      index % 2 === 0 && 'sui-demo-row--even',
    ),
  });
  setAttributes(row, {
    role: 'option',
    'aria-posinset': index + 1,
    'aria-setsize': total,
  });
  setStyle(row, 'block-size', `${ROW_HEIGHT}px`);
  row.textContent = `Baris ${(index + 1).toLocaleString('id-ID')}`;
  return row;
}

/**
 * Demo virtualisasi: 10.000 baris, hanya baris di viewport yang masuk DOM.
 * Mengembalikan fungsi pembersihan (listener + virtualizer).
 */
export function mountVirtualList(
  root: HTMLElement,
  itemCount = 10_000,
): () => void {
  const viewport = createElement('div', {
    className: 'sui-demo-viewport',
    attrs: {
      role: 'listbox',
      'aria-label': 'Contoh daftar 10.000 baris',
      tabindex: 0,
    },
  });
  setStyle(viewport, 'block-size', `${VIEWPORT_HEIGHT}px`);

  const spacer = createElement('div', { className: 'sui-demo-spacer' });
  setStyle(spacer, 'block-size', `${itemCount * ROW_HEIGHT}px`);

  const windowElement = createElement('div', { className: 'sui-demo-window' });
  spacer.append(windowElement);
  viewport.append(spacer);
  root.append(viewport);

  const virtualizer = new Virtualizer({
    itemCount,
    itemSize: ROW_HEIGHT,
    viewportSize: VIEWPORT_HEIGHT,
  });

  const render = (): void => {
    const { start, end, offsetTop } = virtualizer.range;
    setStyle(windowElement, 'transform', `translateY(${offsetTop}px)`);

    const rows: HTMLElement[] = [];
    for (let index = start; index < end; index += 1) {
      rows.push(createRow(index, itemCount));
    }
    windowElement.replaceChildren(...rows);
  };

  virtualizer.onChange(render);

  const onScroll = (): void => {
    virtualizer.setScrollOffset(viewport.scrollTop);
  };
  viewport.addEventListener('scroll', onScroll, { passive: true });

  render();

  return () => {
    viewport.removeEventListener('scroll', onScroll);
    virtualizer.dispose();
    root.replaceChildren();
  };
}
