import '@simpleui/theme/styles.css';
import './style.css';
import { createAngularBridge } from '@simpleui/angular';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemen ${selector} tidak ditemukan`);
  return element;
}

const host = requireElement<HTMLElement>('#host');
const status = requireElement<HTMLElement>('#status');

const bridge = createAngularBridge();
const LABEL = 'Daftar playground';
let items = ['Baris 1', 'Baris 2'];
let mounted = false;

function updateStatus(): void {
  status.textContent = mounted ? `mounted: ${items.length} item` : 'unmounted';
}

async function mount(): Promise<void> {
  await bridge.mount(host, { items, label: LABEL });
  mounted = true;
  updateStatus();
}

function rerender(): void {
  if (mounted) bridge.update({ items, label: LABEL });
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
    if (!mounted) void mount();
  });

void mount();
