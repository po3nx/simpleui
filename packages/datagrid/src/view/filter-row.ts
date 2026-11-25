import { createElement, setAttributes } from '@simpleui/core';
import type { FilterExpression, FilterOperator } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import { defaultOperatorForType, operatorsForType } from '../data/filter.js';

/**
 * Filter row DataGrid (DG-040): operator per tipe, input per kolom, dan
 * penggabungan kondisi dengan `and`.
 */

export interface FilterRow {
  readonly element: HTMLElement;
  setColumns(columns: readonly ColumnState<unknown>[]): void;
  setFilterValue(filter: FilterExpression | null): void;
  dispose(): void;
}

export interface FilterRowOptions<T extends object> {
  readonly columns: readonly ColumnState<T>[];
  readonly filterValue?: FilterExpression | null | undefined;
  readonly onFilterChange?:
    ((filter: FilterExpression | null) => void) | undefined;
}

const OPERATOR_LABELS: Readonly<Record<string, string>> = {
  contains: 'mengandung',
  notContains: 'tidak mengandung',
  startsWith: 'diawali',
  endsWith: 'diakhiri',
  eq: 'sama dengan',
  neq: 'tidak sama',
  gt: 'lebih besar',
  gte: 'lebih besar sama',
  lt: 'lebih kecil',
  lte: 'lebih kecil sama',
  between: 'di antara',
  in: 'salah satu',
  notIn: 'bukan salah satu',
  isBlank: 'kosong',
  isNotBlank: 'tidak kosong',
};

interface Entry {
  readonly column: ColumnState<unknown>;
  readonly cell: HTMLElement;
  readonly operator: HTMLSelectElement | null;
  readonly input: HTMLInputElement | HTMLSelectElement;
}

function inputType(dataType: string): string {
  if (dataType === 'number') return 'number';
  if (dataType === 'date') return 'date';
  return 'text';
}

function convertValue(
  value: string,
  dataType: string,
  isBoolean: boolean,
): unknown {
  if (isBoolean) return value === 'true';
  if (dataType === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  return value;
}

function buildCondition(
  column: ColumnState<unknown>,
  operator: FilterOperator,
  value: string,
): FilterExpression | null {
  if (value === '') return null;
  const selector = column.dataField ?? column.id;
  const converted =
    column.dataType === 'boolean'
      ? convertValue(value, column.dataType, true)
      : convertValue(value, column.dataType, false);
  return [selector, operator, converted];
}

function createOperatorSelect(
  column: ColumnState<unknown>,
  current: FilterOperator,
  onChange: () => void,
): HTMLSelectElement | null {
  const operators = operatorsForType(column.dataType);
  if (operators.length <= 1) return null;
  const select = createElement('select', {
    className: 'sui-grid__filter-operator',
  });
  select.setAttribute('aria-label', `Operator filter ${column.caption}`);
  for (const operator of operators) {
    const option = createElement('option', {
      text: OPERATOR_LABELS[operator] ?? operator,
    });
    option.value = operator;
    if (operator === current) option.selected = true;
    select.append(option);
  }
  select.addEventListener('change', onChange);
  return select;
}

function createValueInput(
  column: ColumnState<unknown>,
  onChange: () => void,
): HTMLInputElement | HTMLSelectElement {
  if (column.dataType === 'boolean') {
    const select = createElement('select', {
      className: 'sui-grid__filter-input',
    });
    select.setAttribute('aria-label', `Filter ${column.caption}`);
    for (const [value, label] of [
      ['true', 'Ya'],
      ['false', 'Tidak'],
    ] as const) {
      const option = createElement('option', { text: label });
      option.value = value;
      select.append(option);
    }
    select.addEventListener('change', onChange);
    return select;
  }

  const input = createElement('input', { className: 'sui-grid__filter-input' });
  input.type = inputType(column.dataType);
  input.setAttribute('aria-label', `Filter ${column.caption}`);
  input.addEventListener('change', onChange);
  input.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Enter') onChange();
  });
  return input;
}

function createEntry(
  column: ColumnState<unknown>,
  onChange: () => void,
): Entry {
  const cell = createElement('div', { className: 'sui-grid__filter-cell' });
  setAttributes(cell, {
    role: 'gridcell',
    'data-column-id': column.id,
  });
  const width = column.width === 'auto' ? column.minWidth : column.width;
  cell.style.flexBasis = `${width}px`;

  const operator = createOperatorSelect(
    column,
    defaultOperatorForType(column.dataType),
    onChange,
  );
  const input = createValueInput(column, onChange);
  if (operator) cell.append(operator);
  cell.append(input);
  return { column, cell, operator, input };
}

class FilterRowImpl implements FilterRow {
  readonly element: HTMLElement;
  #entries: Entry[] = [];
  readonly #values = new Map<
    string,
    { operator: FilterOperator; value: string }
  >();
  #onFilterChange: FilterRowOptions<never>['onFilterChange'];

  constructor(options: FilterRowOptions<never>) {
    this.element = createElement('div', {
      className: 'sui-grid__row sui-grid__row--filter',
    });
    setAttributes(this.element, { role: 'row' });
    this.#onFilterChange = options.onFilterChange;
    this.setColumns(options.columns as readonly ColumnState<unknown>[]);
  }

  #commit(): void {
    const conditions: FilterExpression[] = [];
    for (const entry of this.#entries) {
      const state = this.#values.get(entry.column.id);
      if (!state) continue;
      const condition = buildCondition(
        entry.column,
        state.operator,
        state.value,
      );
      if (condition) conditions.push(condition);
    }
    const filter =
      conditions.length === 0
        ? null
        : conditions.length === 1
          ? (conditions[0] as FilterExpression)
          : (['and', ...conditions] as FilterExpression);
    this.#onFilterChange?.(filter);
  }

  #sync(): void {
    for (const entry of this.#entries) {
      const state = this.#values.get(entry.column.id);
      if (!state) continue;
      if (entry.operator) entry.operator.value = state.operator;
      entry.input.value = state.value;
    }
  }

  #onChangeFor(columnId: string): () => void {
    return () => {
      const entry = this.#entries.find((item) => item.column.id === columnId);
      if (!entry) return;
      const operator = (entry.operator?.value ??
        defaultOperatorForType(entry.column.dataType)) as FilterOperator;
      const value = entry.input.value;
      if (value === '') this.#values.delete(columnId);
      else this.#values.set(columnId, { operator, value });
      this.#commit();
    };
  }

  setColumns(columns: readonly ColumnState<unknown>[]): void {
    this.#entries = [];
    this.element.replaceChildren();
    for (const column of columns) {
      if (!column.visible || !column.allowFiltering || column.children)
        continue;
      const entry = createEntry(column, this.#onChangeFor(column.id));
      this.#entries.push(entry);
      this.element.append(entry.cell);
    }
    this.#sync();
  }

  setFilterValue(filter: FilterExpression | null): void {
    this.#values.clear();
    if (filter) {
      const conditions: FilterExpression[] =
        Array.isArray(filter) && (filter[0] === 'and' || filter[0] === 'or')
          ? (filter.slice(1) as FilterExpression[])
          : [filter];
      for (const condition of conditions) {
        if (!Array.isArray(condition) || typeof condition[0] !== 'string')
          continue;
        const [selector, operator, value] = condition as [
          string,
          FilterOperator,
          unknown,
        ];
        const entry = this.#entries.find(
          (item) => (item.column.dataField ?? item.column.id) === selector,
        );
        if (!entry) continue;
        this.#values.set(entry.column.id, {
          operator,
          value: value === undefined ? '' : String(value),
        });
      }
    }
    this.#sync();
  }

  dispose(): void {
    this.#entries = [];
    this.element.remove();
    this.#onFilterChange = undefined;
  }
}

export function createFilterRow(options: FilterRowOptions<never>): FilterRow {
  return new FilterRowImpl(options);
}
