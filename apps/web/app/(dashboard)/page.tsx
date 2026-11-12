'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase, FileText, Package, Receipt, Users, Wallet } from 'lucide-react';
import type { DashboardOverview } from '@repo/types';
import { useApi } from '../../lib/useApi';
import { useAuthUser } from '../../lib/useAuth';
import { NAV } from '../../lib/navigation';
import { auditPhrase, isCurrentMonth, money, moneyCompact, monthLabel, timeAgo, titleCase, toNumber } from '../../lib/format';
import { BarList, ChartDataTable, ChartLegend, LineTrend, SLOT } from '../../components/charts';
import { BlockSkeleton, Card, DataState, EmptyState, PageHeader, StatCard, StatsSkeleton } from '../../components/ui';

const TREND_SERIES = [
  { key: 'revenue', label: 'Revenue', slot: SLOT.revenue },
  { key: 'costs', label: 'Expenses + payroll', slot: SLOT.costs },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const user = useAuthUser();
  const overview = useApi<DashboardOverview>('/bi/overview');
  const firstName = user?.employee?.name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="Here's how Amdox Technology is doing today."
      />

      <DataState
        state={overview}
        isEmpty={() => false}
        skeleton={<div className="space-y-6"><StatsSkeleton count={6} /><Card><BlockSkeleton /></Card></div>}
      >
        {(o) => {
          const trend = o.trend.map((m) => ({
            month: isCurrentMonth(m.month) ? `${monthLabel(m.month, true)} (to date)` : monthLabel(m.month, true),
            revenue: toNumber(m.revenue),
            costs: toNumber(m.expenses) + toNumber(m.payroll),
          }));
          const partial = o.trend.find((m) => isCurrentMonth(m.month));
          const hasTrend = trend.some((t) => t.revenue > 0 || t.costs > 0);
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard label="Revenue this year" icon={Wallet} value={moneyCompact(o.revenueYtd)} hint="Invoices sent, paid or overdue" />
                <StatCard
                  label="Open invoices"
                  icon={FileText}
                  value={moneyCompact(o.openInvoices.total)}
                  hint={`${o.openInvoices.count} awaiting payment`}
                  tone={o.openInvoices.count ? 'warn' : 'neutral'}
                />
                <StatCard label="Pipeline value" icon={Briefcase} value={moneyCompact(o.pipeline.value)} hint={`${o.pipeline.count} open deals`} />
                <StatCard label="Active employees" icon={Users} value={o.activeEmployees} hint="Including onboarding" />
                <StatCard
                  label="Low-stock products"
                  icon={Package}
                  value={o.lowStock.count}
                  hint={o.lowStock.count ? `Reorder: ${o.lowStock.skus.join(', ')}` : 'All products above reorder level'}
                  tone={o.lowStock.count ? 'bad' : 'good'}
                />
                <StatCard
                  label="Latest payroll"
                  icon={Receipt}
                  value={o.latestPayroll ? moneyCompact(o.latestPayroll.totalNet) : '—'}
                  hint={o.latestPayroll ? `${monthLabel(o.latestPayroll.period)} · ${titleCase(o.latestPayroll.status)} · net pay` : 'No payroll run yet'}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card title="Revenue vs costs" description="Last 6 months" className="xl:col-span-2">
                  {hasTrend ? (
                    <>
                      <ChartLegend series={TREND_SERIES} note={partial ? 'Shaded: current month, still in progress' : undefined} />
                      <LineTrend
                        data={trend}
                        series={TREND_SERIES}
                        xKey="month"
                        format={money}
                        axisFormat={moneyCompact}
                        partialFrom={partial ? trend[trend.length - 1]?.month : undefined}
                        ariaLabel="Line chart of monthly revenue and costs for the last 6 months"
                      />
                      <ChartDataTable
                        caption="Monthly revenue and costs"
                        columns={[{ key: 'month', label: 'Month' }, { key: 'revenue', label: 'Revenue', numeric: true }, { key: 'costs', label: 'Expenses + payroll', numeric: true }]}
                        rows={trend.map((t) => ({ month: t.month, revenue: money(t.revenue), costs: money(t.costs) }))}
                      />
                    </>
                  ) : (
                    <EmptyState title="No revenue or costs yet" description="Invoices, expenses and payroll runs will show up here." />
                  )}
                </Card>

                <Card title="Headcount by department">
                  {o.headcountByDepartment.length === 0 ? (
                    <EmptyState compact title="No employees yet" />
                  ) : (
                    <BarList
                      ariaLabel="Employees per department"
                      slot={SLOT.revenue}
                      format={(v) => String(v)}
                      items={[...o.headcountByDepartment].sort((a, b) => b.count - a.count).map((d) => ({ label: d.department, value: d.count }))}
                    />
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Recent activity" flush>
                  {o.recentActivity === null ? (
                    <EmptyState compact title="Only administrators can see the activity feed" />
                  ) : o.recentActivity.length === 0 ? (
                    <EmptyState compact title="No activity recorded yet" />
                  ) : (
                    <ul className="divide-y divide-line">
                      {o.recentActivity.map((a) => (
                        <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                          <span className="min-w-0 text-fg-muted">
                            <span className="font-medium text-fg">{a.user}</span> {auditPhrase(a.action, a.entity)}
                          </span>
                          <time dateTime={a.timestamp} className="shrink-0 text-xs text-fg-subtle">{timeAgo(a.timestamp)}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Go to" flush>
                  <ul className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                    {NAV.filter((n) => n.href !== '/').map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted group-hover:bg-primary-soft group-hover:text-primary-soft-fg">
                            <l.icon className="h-[18px] w-[18px]" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-fg">{l.label}</span>
                            <span className="block truncate text-xs text-fg-subtle">{l.description}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          );
        }}
      </DataState>
    </div>
  );
}
