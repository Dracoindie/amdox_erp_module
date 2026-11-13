'use client';

// Recharts-based charts. Loaded lazily through ./index.tsx (next/dynamic), so the
// charting library is only downloaded when a chart is actually on screen.
//
// Conventions (data-viz guide): one y-axis, 2 px lines, ≥ 8 px markers on hover,
// 4 px rounded bar ends with a 2 px gap, recessive grid, crosshair tooltip,
// colours from the validated palette via fixed slots (never cycled), and all
// text in text colours (never the series colour).

import { useMemo, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipProps,
} from 'recharts';
import { useTheme } from '../../lib/theme';

export interface Series {
  key: string;
  label: string;
  /** Palette slot 0–7; the same entity keeps its slot on every page */
  slot: number;
  dashed?: boolean;
}

export interface ChartProps {
  data: object[];
  series: Series[];
  xKey: string;
  format: (v: number) => string;
  /** Short axis format (e.g. compact currency) */
  axisFormat?: (v: number) => string;
  height?: number;
  /** x value from which the data is incomplete (current month) — shaded */
  partialFrom?: string;
  xInterval?: number | 'preserveStartEnd';
  ariaLabel: string;
}

function useChartTheme() {
  const { dark } = useTheme();
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    return {
      series: Array.from({ length: 8 }, (_, i) => v(`--series-${i + 1}`)),
      grid: v('--chart-grid'),
      axis: v('--chart-axis'),
      surface: v('--surface'),
      shade: v('--surface-2'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);
}

function TooltipCard({ active, payload, label, format, series }: TooltipProps<number, string> & { format: (v: number) => string; series: Series[] }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  if (!rows.length) return null;
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-fg">{label}</p>
      <ul className="space-y-1">
        {rows.map((p) => {
          const s = series.find((x) => x.key === p.dataKey);
          return (
            <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
                {s?.label ?? p.name}
              </span>
              <span className="font-medium tabular-nums text-fg">{format(Number(p.value))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Frame({ height, ariaLabel, children }: { height: number; ariaLabel: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      {children}
    </div>
  );
}

const axisProps = (color: string) => ({
  axisLine: false,
  tickLine: false,
  tick: { fill: color, fontSize: 12 },
  tickMargin: 8,
});

export function LineTrend({ data, series, xKey, format, axisFormat, height = 260, partialFrom, xInterval = 'preserveStartEnd', ariaLabel }: ChartProps) {
  const t = useChartTheme();
  const label = (i: number) => String((data[i] as Record<string, unknown>)[xKey]);
  const last = data.length ? label(data.length - 1) : undefined;
  // On a point axis a one-point area has no width: shade from the previous point instead
  if (partialFrom && partialFrom === last && data.length > 1) partialFrom = label(data.length - 2);
  return (
    <Frame height={height} ariaLabel={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          {partialFrom && last && <ReferenceArea x1={partialFrom} x2={last} fill={t.shade} fillOpacity={0.8} ifOverflow="visible" />}
          <XAxis dataKey={xKey} {...axisProps(t.axis)} interval={xInterval} minTickGap={16} />
          <YAxis {...axisProps(t.axis)} tickFormatter={(v: number) => (axisFormat ?? format)(v)} width={64} />
          <Tooltip content={<TooltipCard format={format} series={series} />} cursor={{ stroke: t.axis, strokeWidth: 1, strokeDasharray: '3 3' }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={t.series[s.slot]}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: t.surface }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function GroupedBars({ data, series, xKey, format, axisFormat, height = 260, partialFrom, ariaLabel }: ChartProps) {
  const t = useChartTheme();
  const last = data.length ? String((data[data.length - 1] as Record<string, unknown>)[xKey]) : undefined;
  return (
    <Frame height={height} ariaLabel={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke={t.grid} />
          {partialFrom && last && <ReferenceArea x1={partialFrom} x2={last} fill={t.shade} fillOpacity={0.8} ifOverflow="visible" />}
          <XAxis dataKey={xKey} {...axisProps(t.axis)} />
          <YAxis {...axisProps(t.axis)} tickFormatter={(v: number) => (axisFormat ?? format)(v)} width={64} />
          <Tooltip content={<TooltipCard format={format} series={series} />} cursor={{ fill: t.shade, fillOpacity: 0.6 }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={t.series[s.slot]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
