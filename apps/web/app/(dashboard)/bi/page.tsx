'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import type { BISummary } from '@repo/types';
import { useApi } from '../../../lib/useApi';
import { isCurrentMonth, money, moneyCompact, monthLabel, pct, toNumber } from '../../../lib/format';
import { BarList, ChartDataTable, ChartLegend, GroupedBars, LineTrend, SLOT } from '../../../components/charts';
import {
  BlockSkeleton, Button, Card, DataState, DataTable, EmptyState, Field, PageHeader, Select, StatCard, StatsSkeleton,
  TabPanel, Tabs, useTabParam, useToast, type Column,
} from '../../../components/ui';

const TABS = [
  { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
  { id: 'builder', label: 'Report builder', icon: FileSpreadsheet },
] as const;

const RANGES = [3, 6, 12, 24] as const;

export default function BIPage() {
  const [tab, setTab] = useTabParam(TABS);
  const [months, setMonths] = useState<number>(6);
  const summary = useApi<BISummary>(`/bi/summary?months=${months}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Computed live from invoices, expenses and payslips."
        actions={
          <div className="w-full sm:w-44">
            <Select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Date range">
              {RANGES.map((r) => <option key={r} value={r}>Last {r} months</option>)}
            </Select>
          </div>
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} label="Analytics sections" />
      <TabPanel id={tab}>
        <DataState
          state={summary}
          isEmpty={() => false}
          skeleton={<div className="space-y-6"><StatsSkeleton /><Card><BlockSkeleton /></Card></div>}
        >
          {(s) => (tab === 'dashboards' ? <Dashboards s={s} /> : <ReportBuilder s={s} />)}
        </DataState>
      </TabPanel>
    </div>
  );
}

function rowsOf(s: BISummary) {
  return s.months.map((m) => ({
    key: m.month,
    month: isCurrentMonth(m.month) ? `${monthLabel(m.month, true)} (to date)` : monthLabel(m.month, true),
    revenue: toNumber(m.revenue),
    collected: toNumber(m.collected),
    expenses: toNumber(m.expenses),
    payroll: toNumber(m.payroll),
    netProfit: toNumber(m.netProfit),
  }));
}

const REVENUE_SERIES = [
  { key: 'revenue', label: 'Invoiced', slot: SLOT.revenue },
  { key: 'collected', label: 'Collected', slot: SLOT.collected },
];
const PROFIT_SERIES = [
  { key: 'revenue', label: 'Revenue', slot: SLOT.revenue },
  { key: 'netProfit', label: 'Net profit', slot: SLOT.netProfit },
];

function Dashboards({ s }: { s: BISummary }) {
  const rows = useMemo(() => rowsOf(s), [s]);
  const revenue = toNumber(s.totals.revenue);
  const net = toNumber(s.totals.netProfit);
  const margin = revenue > 0 ? (net / revenue) * 100 : null;
  const partial = rows.find((r) => isCurrentMonth(r.key));
  const hasData = rows.some((r) => r.revenue || r.expenses || r.payroll || r.collected);
  const costs = [...s.expensesByCategory].map((c) => ({ label: c.category, value: toNumber(c.amount) })).sort((a, b) => b.value - a.value);
  const costTotal = costs.reduce((t, c) => t + c.value, 0);

  if (!hasData) {
    return <Card><EmptyState icon={BarChart3} title="No financial activity in this range" description="Pick a longer range, or create invoices and expenses first." /></Card>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={moneyCompact(revenue)} hint={`${moneyCompact(s.totals.collected)} collected`} />
        <StatCard label="Expenses" value={moneyCompact(s.totals.expenses)} hint="Excluding rejected claims" />
        <StatCard label="Payroll" value={moneyCompact(s.totals.payroll)} hint="Gross pay on payslips" />
        <StatCard
          label="Net profit"
          value={moneyCompact(net)}
          hint={margin === null ? 'No revenue in range' : `${pct(margin)} margin`}
          tone={margin === null ? 'neutral' : net >= 0 ? 'good' : 'bad'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card title="Invoiced vs collected" description="Per month" className="xl:col-span-3">
          <ChartLegend series={REVENUE_SERIES} note={partial ? 'Shaded: month in progress' : undefined} />
          <GroupedBars
            data={rows}
            series={REVENUE_SERIES}
            xKey="month"
            format={money}
            axisFormat={moneyCompact}
            partialFrom={partial?.month}
            ariaLabel="Bar chart of invoiced and collected revenue per month"
          />
          <ChartDataTable
            caption="Invoiced and collected per month"
            columns={[{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Invoiced', numeric: true }, { key: 'collected', label: 'Collected', numeric: true }]}
            rows={rows.map((r) => ({ month: r.month, revenue: money(r.revenue), collected: money(r.collected) }))}
          />
        </Card>

        <Card title="Where the money goes" description={`${moneyCompact(costTotal)} in costs`} className="xl:col-span-2">
          {costs.length === 0 ? <EmptyState compact title="No costs in this range" /> : (
            <BarList
              ariaLabel="Costs by category"
              slot={SLOT.costs}
              format={moneyCompact}
              items={costs.map((c) => ({ ...c, hint: costTotal > 0 ? pct((c.value / costTotal) * 100) : undefined }))}
            />
          )}
        </Card>
      </div>

      <Card title="Revenue and net profit" description="Per month">
        <ChartLegend series={PROFIT_SERIES} note={partial ? 'Shaded: month in progress' : undefined} />
        <LineTrend
          data={rows}
          series={PROFIT_SERIES}
          xKey="month"
          format={money}
          axisFormat={moneyCompact}
          partialFrom={partial?.month}
          ariaLabel="Line chart of revenue and net profit per month"
        />
        <ChartDataTable
          caption="Revenue and net profit per month"
          columns={[{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue', numeric: true }, { key: 'netProfit', label: 'Net profit', numeric: true }]}
          rows={rows.map((r) => ({ month: r.month, revenue: money(r.revenue), netProfit: money(r.netProfit) }))}
        />
      </Card>
    </div>
  );
}

type ReportType = 'sales' | 'profit' | 'expenses';
type Row = Record<string, string>;

const REPORTS: Record<ReportType, { label: string; columns: Array<{ key: string; label: string; money?: boolean }> }> = {
  sales: { label: 'Monthly sales', columns: [{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Invoiced', money: true }, { key: 'collected', label: 'Collected', money: true }] },
  profit: {
    label: 'Profit & loss',
    columns: [
      { key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue', money: true }, { key: 'expenses', label: 'Expenses', money: true },
      { key: 'payroll', label: 'Payroll', money: true }, { key: 'netProfit', label: 'Net profit', money: true },
    ],
  },
  expenses: { label: 'Costs by category', columns: [{ key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount', money: true }] },
};

function ReportBuilder({ s }: { s: BISummary }) {
  const toast = useToast();
  const [type, setType] = useState<ReportType>('sales');
  const report = REPORTS[type];
  const rows: Row[] = type === 'expenses'
    ? s.expensesByCategory.map((c) => ({ category: c.category, amount: c.amount }))
    : s.months.map((m) => ({ ...m, month: monthLabel(m.month) }));

  const exportCsv = () => {
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [
      report.columns.map((c) => c.label).join(','),
      ...rows.map((r) => report.columns.map((c) => escape(String(r[c.key] ?? ''))).join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${s.from}-to-${s.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${report.label} exported (${rows.length} rows)`);
  };

  const columns: Column<Row>[] = report.columns.map((c, i) => ({
    key: c.key,
    header: c.label,
    primary: i === 0,
    numeric: c.money,
    sortValue: (r: Row) => (c.money ? toNumber(r[c.key]) : r[c.key]),
    cell: (r: Row) => (c.money ? money(r[c.key]) : <span className="font-medium">{r[c.key]}</span>),
  }));

  return (
    <Card
      title={report.label}
      description={`${monthLabel(s.from)} – ${monthLabel(s.to)}`}
      flush
      actions={
        <>
          <Field label="Report" className="w-full sm:w-52 [&>label]:sr-only">
            <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
              {Object.entries(REPORTS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </Select>
          </Field>
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
        </>
      }
    >
      {rows.length === 0 ? <EmptyState title="No data for this range" /> : (
        <DataTable key={type} caption={report.label} columns={columns} rows={rows} rowKey={(r) => r.month ?? r.category ?? ''} />
      )}
    </Card>
  );
}
