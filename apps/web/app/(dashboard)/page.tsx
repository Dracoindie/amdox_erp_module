'use client';

import Link from 'next/link';
import { Wallet, Users, Package, BarChart3, UserCircle2, Settings, ArrowRight, Activity } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DashboardOverview } from '@repo/types';
import { useApi } from '../../lib/useApi';
import { useAuthUser } from '../../lib/useAuth';
import { money, moneyCompact, monthLabel, timeAgo, titleCase, toNumber } from '../../lib/format';
import { Card, DataState, EmptyState, PageHeader, StatCard } from '../../components/ui';

const PIE_COLORS = ['#ff5a00', '#10b981', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];

const QUICK_LINKS = [
  { href: '/finance', icon: Wallet, label: 'Financial Ledger', desc: 'GL, invoices, expenses, budgets' },
  { href: '/hr', icon: Users, label: 'HR & Payroll', desc: 'Employees, leave, payroll' },
  { href: '/scm', icon: Package, label: 'Supply Chain', desc: 'Inventory, POs, suppliers, forecast' },
  { href: '/crm', icon: UserCircle2, label: 'CRM & Sales', desc: 'Pipeline, contacts, orders' },
  { href: '/bi', icon: BarChart3, label: 'Business Intelligence', desc: 'Trends and reports' },
  { href: '/settings', icon: Settings, label: 'Settings', desc: 'Users, audit log, health' },
];

export default function DashboardPage() {
  const user = useAuthUser();
  const overview = useApi<DashboardOverview>('/bi/overview');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Overview"
        subtitle={`Welcome back${user?.employee?.name ? `, ${user.employee.name}` : ''} · Amdox Technology · AMX-ERP-2026`}
      />

      <DataState state={overview} isEmpty={() => false}>
        {(o) => (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Revenue (year to date)" value={moneyCompact(o.revenueYtd)} hint="Invoiced: sent, paid and overdue" tone="brand" />
              <StatCard label="Active employees" value={o.activeEmployees} hint="Active and onboarding" tone="good" />
              <StatCard label="Open invoices" value={moneyCompact(o.openInvoices.total)} hint={`${o.openInvoices.count} sent or overdue`} tone="warn" />
              <StatCard
                label="Low-stock SKUs"
                value={o.lowStock.count}
                hint={o.lowStock.count ? o.lowStock.skus.join(', ') : 'All SKUs above reorder level'}
                tone={o.lowStock.count ? 'bad' : 'good'}
              />
              <StatCard label="Pipeline value" value={moneyCompact(o.pipeline.value)} hint={`${o.pipeline.count} open deals`} />
              <StatCard
                label="Latest payroll"
                value={o.latestPayroll ? moneyCompact(o.latestPayroll.totalNet) : '—'}
                hint={o.latestPayroll ? `${monthLabel(o.latestPayroll.period)} · ${titleCase(o.latestPayroll.status)} · net pay` : 'No payroll run yet'}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Revenue vs costs" actions={<span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-700">last 6 months</span>} className="lg:col-span-2">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={o.trend.map((m) => ({
                      month: monthLabel(m.month, true),
                      revenue: toNumber(m.revenue),
                      costs: toNumber(m.expenses) + toNumber(m.payroll),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => moneyCompact(v)} width={60} />
                      <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: 'none' }} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#ff5a00" fill="#ff5a00" fillOpacity={0.15} strokeWidth={2.5} />
                      <Area type="monotone" dataKey="costs" name="Expenses + payroll" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Headcount by department">
                {o.headcountByDepartment.length === 0 ? (
                  <EmptyState title="No employees yet" />
                ) : (
                  <>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={o.headcountByDepartment} dataKey="count" nameKey="department" innerRadius={45} outerRadius={68} paddingAngle={3}>
                            {o.headcountByDepartment.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v} people`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {o.headcountByDepartment.map((d, i) => (
                        <li key={d.department} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {d.department}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{d.count}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title={<span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#ff5a00]" /> Recent activity</span>}>
                {o.recentActivity === null ? (
                  <EmptyState title="Activity is visible to administrators" />
                ) : o.recentActivity.length === 0 ? (
                  <EmptyState title="No activity recorded yet" />
                ) : (
                  <ul className="space-y-3">
                    {o.recentActivity.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-4 text-sm">
                        <span className="text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{a.user}</span> · {a.action} {a.entity}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.timestamp)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Modules">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {QUICK_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} className="group flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-[#ff5a00]/40 hover:bg-orange-50/40 dark:border-slate-700 dark:hover:bg-slate-700/40">
                      <l.icon className="mt-0.5 h-5 w-5 text-[#ff5a00]" />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{l.label}</span>
                        <span className="block text-xs text-slate-500">{l.desc}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-[#ff5a00]" />
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}
