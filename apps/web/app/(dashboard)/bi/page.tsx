'use client';

import { useMemo, useState } from 'react';
import { BarChart3, FileSpreadsheet, Download } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { BISummary } from '@repo/types';
import { useApi } from '../../../lib/useApi';
import { money, moneyCompact, monthLabel, toNumber } from '../../../lib/format';
import { Button, Card, DataState, EmptyState, Field, PageHeader, Select, StatCard, Table, Tabs, Td } from '../../../components/ui';

type Tab = 'dashboards' | 'builder';
const TABS = [
  { id: 'dashboards', label: 'Dashboards', icon: BarChart3 },
  { id: 'builder', label: 'Report Builder', icon: FileSpreadsheet },
] as const;

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#ff5a00', '#10b981'];
const RANGES = [3, 6, 12, 24] as const;

export default function BIPage() {
  const [tab, setTab] = useState<Tab>('dashboards');
  const [months, setMonths] = useState<number>(6);
  const summary = useApi<BISummary>(`/bi/summary?months=${months}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Intelligence"
        subtitle="Computed live from invoices, expenses and payslips"
        actions={
          <Select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Range" className="w-40">
            {RANGES.map((r) => <option key={r} value={r}>Last {r} months</option>)}
          </Select>
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <DataState state={summary} isEmpty={() => false}>
        {(s) => (tab === 'dashboards' ? <Dashboards s={s} /> : <ReportBuilder s={s} />)}
      </DataState>
    </div>
  );
}

function chartRows(s: BISummary) {
  return s.months.map((m) => ({
    month: monthLabel(m.month, true),
    revenue: toNumber(m.revenue),
    collected: toNumber(m.collected),
    expenses: toNumber(m.expenses),
    payroll: toNumber(m.payroll),
    netProfit: toNumber(m.netProfit),
  }));
}

function Dashboards({ s }: { s: BISummary }) {
  const rows = useMemo(() => chartRows(s), [s]);
  const pie = s.expensesByCategory.map((c) => ({ name: c.category, value: toNumber(c.amount) }));
  const margin = toNumber(s.totals.revenue) > 0 ? (toNumber(s.totals.netProfit) / toNumber(s.totals.revenue)) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={moneyCompact(s.totals.revenue)} hint={`Collected ${moneyCompact(s.totals.collected)}`} tone="brand" />
        <StatCard label="Expenses" value={moneyCompact(s.totals.expenses)} hint="Excluding rejected claims" />
        <StatCard label="Payroll" value={moneyCompact(s.totals.payroll)} hint="Payslip gross" />
        <StatCard
          label="Net profit"
          value={moneyCompact(s.totals.netProfit)}
          hint={margin === null ? 'No revenue in range' : `${margin.toFixed(1)}% margin`}
          tone={toNumber(s.totals.netProfit) >= 0 ? 'good' : 'bad'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Revenue vs collected">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => moneyCompact(v)} tick={{ fill: '#94a3b8', fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Invoiced" fill="#ff5a00" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Cost breakdown">
          {pie.length === 0 ? <EmptyState title="No expenses or payroll in this range" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title="Net profit trend">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => moneyCompact(v)} tick={{ fill: '#94a3b8', fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#ff5a00" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="netProfit" name="Net profit" stroke="#6366f1" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

type ReportType = 'sales' | 'profit' | 'expenses';

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
  const [type, setType] = useState<ReportType>('sales');
  const report = REPORTS[type];
  const rows: Array<Record<string, string>> = type === 'expenses'
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
  };

  return (
    <Card
      title={`${report.label} · ${monthLabel(s.from)} – ${monthLabel(s.to)}`}
      actions={
        <div className="flex items-end gap-2">
          <Field label="Report">
            <Select value={type} onChange={(e) => setType(e.target.value as ReportType)} className="w-48">
              {Object.entries(REPORTS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </Select>
          </Field>
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" /> CSV</Button>
        </div>
      }
    >
      {rows.length === 0 ? <EmptyState title="No data for this range" /> : (
        <Table head={report.columns.map((c) => c.label)}>
          {rows.map((r, i) => (
            <tr key={i}>
              {report.columns.map((c) => <Td key={c.key} className={c.money ? 'tabular-nums' : 'font-medium'}>{c.money ? money(r[c.key]) : r[c.key]}</Td>)}
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
