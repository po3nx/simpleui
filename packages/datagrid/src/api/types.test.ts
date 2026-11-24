import { ArrayStore, type Key } from '@simpleui/core';
import { describe, expectTypeOf, it } from 'vitest';
import type {
  ColumnOptions,
  DataGridApi,
  DataGridOptions,
  SelectionChangedEvent,
  VisibleRow,
} from './types.js';

interface Order {
  id: number;
  customer: string;
  total: number;
}

describe('tipe publik DataGrid', () => {
  it('mengalirkan T ke kolom, dataSource, dan event', () => {
    const store = new ArrayStore<Order>([], { key: 'id' });

    const options: DataGridOptions<Order> = {
      dataSource: store,
      keyExpr: 'id',
      columns: [
        { dataField: 'customer' },
        {
          dataField: 'total',
          dataType: 'number',
          format: { type: 'currency' },
        },
      ],
      selection: { mode: 'multiple', selectedRowKeys: [1] },
      onSelectionChanged(event) {
        expectTypeOf(event.selectedRowKeys).toEqualTypeOf<readonly Key[]>();
      },
    };

    expectTypeOf(options.columns).toEqualTypeOf<
      readonly ColumnOptions<Order>[] | undefined
    >();
  });

  it('menerima array sebagai dataSource', () => {
    const options: DataGridOptions<Order> = {
      dataSource: [{ id: 1, customer: 'Ani', total: 10 }],
    };

    expectTypeOf(options).toEqualTypeOf<DataGridOptions<Order>>();
  });

  it('API mengembalikan tipe yang tepat', () => {
    expectTypeOf<DataGridApi<Order>['getVisibleRows']>().returns.toEqualTypeOf<
      readonly VisibleRow<Order>[]
    >();
    expectTypeOf<
      DataGridApi<Order>['getSelectedRowKeys']
    >().returns.toEqualTypeOf<Key[]>();
  });

  it('event selection membawa keys, bukan data baris', () => {
    expectTypeOf<SelectionChangedEvent>().toEqualTypeOf<{
      readonly selectedRowKeys: readonly Key[];
      readonly added: readonly Key[];
      readonly removed: readonly Key[];
    }>();
  });
});
