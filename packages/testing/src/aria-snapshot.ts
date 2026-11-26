/**
 * Accessibility snapshot DataGrid (DG-057): representasi teks deterministik
 * dari role/nama/atribut ARIA penting, untuk regresi tanpa screen reader.
 */

const INTERESTING_ATTRS = [
  'aria-sort',
  'aria-selected',
  'aria-checked',
  'aria-expanded',
  'aria-rowindex',
  'aria-colindex',
  'aria-rowcount',
  'aria-colcount',
  'aria-multiselectable',
  'aria-busy',
  'aria-label',
] as const;

function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.hidden || node.getAttribute('aria-hidden') === 'true') return '';
  return [...node.childNodes].map(textOf).join(' ');
}

function accessibleName(element: HTMLElement): string {
  const label = element.getAttribute('aria-label');
  if (label) return label;
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') return 'checkbox';
    return element.value || element.type;
  }
  if (element instanceof HTMLSelectElement) {
    return element.value || 'select';
  }
  const text = textOf(element).trim().replace(/\s+/g, ' ');
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function attributesOf(element: HTMLElement): string {
  const parts: string[] = [];
  for (const name of INTERESTING_ATTRS) {
    const value = element.getAttribute(name);
    if (
      value !== null &&
      !(name === 'aria-label' && value === accessibleName(element))
    ) {
      parts.push(`${name}="${value}"`);
    }
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function roleOf(element: HTMLElement): string | null {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit;
  const tag = element.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'input') {
    const type = (element as HTMLInputElement).type;
    return type === 'checkbox'
      ? 'checkbox'
      : type === 'radio'
        ? 'radio'
        : 'textbox';
  }
  if (tag === 'select') return 'combobox';
  return null;
}

function walk(element: HTMLElement, depth: number, lines: string[]): void {
  if (element.hidden) return;
  const role = roleOf(element);
  if (role === 'presentation' || role === 'none') {
    for (const child of element.children) {
      if (child instanceof HTMLElement) walk(child, depth, lines);
    }
    return;
  }
  if (role) {
    const indent = '  '.repeat(depth);
    const name =
      role === 'row' || role === 'rowgroup' ? '' : accessibleName(element);
    lines.push(
      `${indent}${role}${name ? ` "${name}"` : ''}${attributesOf(element)}`,
    );
    depth += 1;
  }
  for (const child of element.children) {
    if (child instanceof HTMLElement) walk(child, depth, lines);
  }
}

export function captureAriaSnapshot(root: HTMLElement): string {
  const lines: string[] = [];
  walk(root, 0, lines);
  return lines.join('\n');
}
