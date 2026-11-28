import type { ColumnState } from '../model/columns.js';
import { groupLabel, type GroupDisplayEntry } from './group-view.js';
import { computeSummary, formatSummary } from '../data/summary.js';
import type { SummaryItem } from '../api/types.js';

/** Render satu baris grup (DG-066) dengan toggle expand/collapse. */
export interface GroupRowContext<T extends object> {
  readonly rowElement: HTMLElement;
  readonly entry: Extract<GroupDisplayEntry<T>, { type: 'group' }>;
  readonly index: number;
  readonly totalWidth: number;
  readonly columns: readonly ColumnState<T>[];
  readonly onToggle: (groupKey: string) => void;
  readonly summaryItems?: readonly SummaryItem<T>[] | undefined;
  readonly locale?: string | undefined;
}

export function paintGroupRow<T extends object>(
  context: GroupRowContext<T>,
): void {
  const { rowElement, entry, index, totalWidth, columns, onToggle } = context;
  rowElement.hidden = false;
  rowElement.className = 'sui-grid__row sui-grid__row--group';
  rowElement.setAttribute('role', 'row');
  rowElement.setAttribute('aria-rowindex', String(index + 1));
  rowElement.setAttribute('aria-expanded', String(entry.expanded));
  rowElement.setAttribute('data-group-key', entry.node.key);
  const cell = document.createElement('div');
  cell.className = 'sui-grid__cell sui-grid__cell--group';
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-colindex', '1');
  cell.setAttribute('aria-colspan', String(columns.length));
  cell.style.flexBasis = `${totalWidth}px`;
  cell.style.paddingInlineStart = `${8 + entry.node.depth * 16}px`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sui-grid__group-toggle';
  button.setAttribute('aria-expanded', String(entry.expanded));
  button.setAttribute(
    'aria-label',
    `${entry.expanded ? 'Ciutkan' : 'Bentangkan'} ${groupLabel(entry.node, columns)}`,
  );
  button.textContent = entry.expanded ? '▾' : '▸';
  button.addEventListener('click', () => onToggle(entry.node.key));
  const label = document.createElement('span');
  label.className = 'sui-grid__group-label';
  label.textContent = groupText(context);
  cell.append(button, label);
  rowElement.replaceChildren(cell);
}

function groupText<T extends object>(context: GroupRowContext<T>): string {
  const base = groupLabel(context.entry.node, context.columns);
  const items = context.summaryItems ?? [];
  if (items.length === 0) return base;
  const values = computeSummary(context.entry.node.rows, {
    columns: context.columns,
    items,
  });
  const summaries = items.map((item) => {
    const caption =
      context.columns.find((column) => column.id === item.column)?.caption ??
      item.column;
    const text = formatSummary(item, {
      value: values[item.column] ?? 0,
      data: context.entry.node.rows,
      ...(context.locale ? { locale: context.locale } : {}),
    });
    return `${caption}: ${text}`;
  });
  return `${base} — ${summaries.join(' · ')}`;
}
