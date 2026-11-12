'use client';

// DataTable: one column definition drives two layouts.
//   ≥ md : a real <table> (sortable headers with aria-sort, numbers right-aligned)
//   < md : a stacked card per row (label: value), so nothing scrolls sideways on phones.

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

export type SortOrder = 'asc' | 'desc';
export interface SortState { key: string; order: SortOrder }

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Numeric column: right-aligned, tabular figures */
  numeric?: boolean;
  /** Server sort field (controlled mode, needs onSortChange) */
  sortKey?: string;
  /** Client sort accessor (uncontrolled mode) */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Shown as the card title on phones */
  primary?: boolean;
  /** Hidden in the phone card layout */
  hideOnMobile?: boolean;
  /** Label in the phone card layout (defaults to header) */
  mobileLabel?: string;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns, rows, rowKey, caption, sort, onSortChange, defaultSort, onRowClick, selectedKey, footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Accessible table name (visually hidden) */
  caption: string;
  sort?: SortState;
  onSortChange?: (s: SortState) => void;
  defaultSort?: SortState;
  /** Makes rows selectable (keyboard accessible via a button in the first cell) */
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  footer?: ReactNode;
}) {
  const [localSort, setLocalSort] = useState<SortState | undefined>(defaultSort);
  const controlled = !!onSortChange;
  const active = controlled ? sort : localSort;

  const sorted = useMemo(() => {
    if (controlled || !active) return rows;
    const col = columns.find((c) => c.key === active.key);
    if (!col?.sortValue) return rows;
    const dir = active.order === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a);
      const y = col.sortValue!(b);
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [rows, columns, active, controlled]);

  const sortable = (c: Column<T>) => (controlled ? !!c.sortKey : !!c.sortValue);
  const sortId = (c: Column<T>) => (controlled ? c.sortKey! : c.key);
  const toggle = (c: Column<T>) => {
    const key = sortId(c);
    const next: SortState = active?.key === key
      ? { key, order: active.order === 'asc' ? 'desc' : 'asc' }
      : { key, order: c.numeric ? 'desc' : 'asc' };
    if (controlled) onSortChange!(next);
    else setLocalSort(next);
  };
  const alignOf = (c: Column<T>) => c.align ?? (c.numeric ? 'right' : 'left');
  const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {columns.map((c) => {
                const isSorted = active?.key === sortId(c);
                const ariaSort = sortable(c) ? (isSorted ? (active!.order === 'asc' ? 'ascending' : 'descending') : 'none') : undefined;
                const SortIcon = !isSorted ? ArrowUpDown : active!.order === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cx('whitespace-nowrap px-4 py-2.5 text-xs font-medium text-fg-muted first:pl-5 last:pr-5', alignClass[alignOf(c)], c.headerClassName)}
                  >
                    {sortable(c) ? (
                      <button
                        type="button"
                        onClick={() => toggle(c)}
                        className={cx('-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-fg', alignOf(c) === 'right' && 'flex-row-reverse', isSorted && 'text-fg')}
                      >
                        {c.header}
                        <SortIcon className={cx('h-3.5 w-3.5', !isSorted && 'opacity-50')} aria-hidden />
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  aria-selected={onRowClick ? key === selectedKey : undefined}
                  className={cx(
                    'transition-colors hover:bg-surface-2/60',
                    onRowClick && 'cursor-pointer',
                    key === selectedKey && 'bg-primary-soft hover:bg-primary-soft',
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cx(
                        'px-4 py-3 align-middle text-fg first:pl-5 last:pr-5',
                        alignClass[alignOf(c)],
                        c.numeric && 'whitespace-nowrap tabular-nums',
                        c.className,
                      )}
                    >
                      {i === 0 && onRowClick ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onRowClick(row); }} className="text-left font-medium hover:underline">
                          {c.cell(row)}
                        </button>
                      ) : c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {sorted.map((row) => {
          const key = rowKey(row);
          const body = (
            <>
              <div className="min-w-0 font-medium text-fg">{primary.cell(row)}</div>
              {rest.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {rest.map((c) => {
                    const label = c.mobileLabel ?? (typeof c.header === 'string' ? c.header : '');
                    const isAction = !label;
                    return (
                      <div key={c.key} className={cx('min-w-0', isAction && 'col-span-2')}>
                        {label && <dt className="text-xs text-fg-subtle">{label}</dt>}
                        <dd className={cx('min-w-0 break-words text-sm text-fg', c.numeric && 'tabular-nums')}>{c.cell(row)}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </>
          );
          return (
            <li key={key} className={cx('px-4 py-3.5', key === selectedKey && 'bg-primary-soft')}>
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)} className="block w-full text-left" aria-pressed={key === selectedKey}>
                  {body}
                </button>
              ) : body}
            </li>
          );
        })}
      </ul>
      {footer}
    </>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────────────

export function Pagination({
  meta, onPage, noun = 'records',
}: {
  meta?: { page: number; limit: number; total: number; totalPages: number };
  onPage: (p: number) => void;
  noun?: string;
}) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-fg-muted sm:px-5">
      <p>
        <span className="tabular-nums">{from}–{to}</span> of <span className="tabular-nums">{meta.total}</span> {noun}
      </p>
      {meta.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
            Previous
          </Button>
          <span className="tabular-nums text-xs">Page {meta.page} of {meta.totalPages}</span>
          <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  );
}
