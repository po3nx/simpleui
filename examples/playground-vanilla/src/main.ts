import '@simpleui/theme/styles.css';
import './style.css';
import { createVanillaBridge } from '@simpleui/vanilla';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemen ${selector} tidak ditemukan`);
  return element;
}

const host = requireElement<HTMLElement>('#host');
const status = requireElement<HTMLElement>('#status');

const bridge = createVanillaBridge();
let items = ['Baris 1', 'Baris 2'];
let mounted = false;

const LABEL = 'Daftar playground';

function updateStatus(): void {
  status.textContent = mounted ? `mounted: ${items.length} item` : 'unmounted';
}

function mount(): void {
  bridge.mount(host, { items, label: LABEL });
  mounted = true;
  updateStatus();
}

function rerender(): void {
  if (mounted) void bridge.update({ items, label: LABEL });
  updateStatus();
}

document
  .querySelector<HTMLButtonElement>('#add')
  ?.addEventListener('click', () => {
    items = [...items, `Baris ${items.length + 1}`];
    rerender();
  });

document
  .querySelector<HTMLButtonElement>('#clear')
  ?.addEventListener('click', () => {
    items = [];
    rerender();
  });

document
  .querySelector<HTMLButtonElement>('#unmount')
  ?.addEventListener('click', () => {
    bridge.unmount();
    mounted = false;
    updateStatus();
  });

document
  .querySelector<HTMLButtonElement>('#mount')
  ?.addEventListener('click', () => {
    if (!mounted) mount();
  });

mount();
