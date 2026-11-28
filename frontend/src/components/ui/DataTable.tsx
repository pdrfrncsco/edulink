'use client';

import React, { useId } from 'react';
import { cn } from './cn';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Marks this column as the `<th scope="row">` sticky row header on desktop and card header on mobile. */
  isRowHeader?: boolean;
  align?: 'left' | 'right' | 'center';
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  caption: string;
  /** Optional ID of an external heading describing this table for `aria-labelledby`. */
  labelledBy?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
  tableClassName?: string;
}

const ALIGN_CLASSES: Record<NonNullable<DataTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/**
 * Responsive accessible data table using `.table-wrapper` sticky headers
 * and container-query stacked cards on narrow screens (`< 600px`).
 */
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  caption,
  labelledBy,
  emptyTitle = 'Sem registos para apresentar',
  emptyDescription,
  emptyAction,
  emptyState,
  loading = false,
  className,
  tableClassName,
}: DataTableProps<T>) {
  const internalCaptionId = useId();
  const labelId = labelledBy || internalCaptionId;

  if (!loading && data.length === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            compact
            className={className}
          />
        )}
      </>
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={labelId}
      aria-busy={loading || undefined}
      className={cn('table-wrapper', className)}
    >
      <table className={cn('edulink-table text-xs sm:text-sm', tableClassName)}>
        <caption id={internalCaptionId} className="sr-only">
          {caption}
        </caption>
        <thead>
          <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('p-3 font-semibold', ALIGN_CLASSES[col.align || 'left'], col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`} aria-hidden="true">
                {columns.map((col, colIdx) => (
                  <td key={col.key} className="p-3">
                    <Skeleton
                      className={cn(
                        'h-3.5',
                        colIdx === 0 ? 'w-36' : colIdx === columns.length - 1 ? 'w-20' : 'w-24'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            data.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-stone-50/70">
                {columns.map((col) =>
                  col.isRowHeader ? (
                    <th
                      key={col.key}
                      scope="row"
                      className={cn('p-3 font-semibold text-stone-900', ALIGN_CLASSES[col.align || 'left'], col.cellClassName)}
                    >
                      {col.render(row)}
                    </th>
                  ) : (
                    <td
                      key={col.key}
                      data-label={col.header}
                      className={cn('p-3 text-stone-700', ALIGN_CLASSES[col.align || 'left'], col.cellClassName)}
                    >
                      {col.render(row)}
                    </td>
                  )
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
