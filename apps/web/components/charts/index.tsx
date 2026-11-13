'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { Skeleton, cx } from '../ui';
import type { ChartProps, Series } from './Charts';

export type { Series, ChartProps };

/** Palette slots per business entity: an entity keeps its colour on every page. */
export const SLOT = {
  revenue: 0, // blue
  costs: 1, // orange
  expenses: 1,
  collected: 2, // aqua
  payroll: 3, // yellow
  netProfit: 6, // violet
  actual: 0,
  forecast: 1,
} as const;

function ChartLoading() {
  return <Skeleton className="h-[260px] w-full rounded-lg" />;
}

// Lazy: recharts is only fetched when a chart renders (not on table-only tabs).
export const LineTrend = dynamic(() => import('./Charts').then((m) => m.LineTrend), { ssr: false, loading: ChartLoading });
export const GroupedBars = dynamic(() => import('./Charts').then((m) => m.GroupedBars), { ssr: false, loading: ChartLoading });

/** HTML legend above a chart: swatch + label in text colours (never colour-only). */
export function ChartLegend({ series, note }: { series: Series[]; note?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span
            className={cx('inline-block h-0.5 w-4 rounded-full', s.dashed && 'border-t-2 border-dashed bg-transparent')}
            style={s.dashed ? { borderColor: `var(--series-${s.slot + 1})` } : { background: `var(--series-${s.slot + 1})` }}
            aria-hidden
          />
          {s.label}
        </span>
      ))}
      {note && <span className="text-fg-subtle">{note}</span>}
    </div>
  );
}

/**
 * Horizontal bar list in plain HTML (no chart library): readable labels, values
 * right-aligned, bar length as the visual. Better than a donut for ranked
 * categories with one dominant value.
 */
export function BarList({
  items, format, slot = 0, ariaLabel,
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
  format: (v: number) => string;
  slot?: number;
  ariaLabel: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-fg">{i.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-fg">
              {format(i.value)}
              {i.hint && <span className="ml-1.5 font-normal text-fg-subtle">{i.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden>
            <div className="h-2 rounded-full" style={{ width: `${max > 0 ? Math.max(2, (i.value / max) * 100) : 0}%`, background: `var(--series-${slot + 1})` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "Show data" disclosure under a chart: the same numbers as an accessible table. */
export function ChartDataTable({ columns, rows, caption }: {
  columns: Array<{ key: string; label: string; numeric?: boolean }>;
  rows: Array<Record<string, ReactNode>>;
  caption: string;
}) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-medium text-fg-muted hover:text-fg">Show data table</summary>
      <div className="mt-2 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cx('px-3 py-2 text-xs font-medium text-fg-muted', c.numeric ? 'text-right' : 'text-left')}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={cx('px-3 py-2 text-fg', c.numeric && 'text-right tabular-nums')}>{r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
