'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase, CalendarDays, Clock, FileText, Package, Receipt, Users, Wallet } from 'lucide-react';
import type { DashboardOverview } from '@repo/types';
import { useApi } from '../../lib/useApi';
import { useAuthUser } from '../../lib/useAuth';
import { navFor } from '../../lib/navigation';
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

// Each section of the overview is null when the role can't read that module,
// so the dashboard is assembled from whatever the API returned.
export default function DashboardPage() {
  const user = useAuthUser();
  const overview = useApi<DashboardOverview>('/bi/overview');
  const firstName = user?.employee?.name?.split(' ')[0];
  const links = navFor(user).filter((n) => n.href !== '/');

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}${firstName ? `, ${firstName}` : ''}`} description="Here's what needs your attention today." />

      <DataState
        state={overview}
        isEmpty={() => false}
        skeleton={<div className="space-y-6"><StatsSkeleton count={4} /><Card><BlockSkeleton /></Card></div>}
      >
        {(o) => (
          <div className="space-y-6">
            {o.me && <MySection me={o.me} />}
            <Kpis o={o} />
            {(o.finance || o.people) && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {o.finance && <TrendCard finance={o.finance} wide={!!o.people} />}
                {o.people && (
                  <Card title="Headcount by department" className={o.finance ? undefined : 'xl:col-span-3'}>
                    {o.people.headcountByDepartment.length === 0 ? (
                      <EmptyState compact title="No employees yet" />
                    ) : (
                      <BarList
                        ariaLabel="Employees per department"
                        slot={SLOT.revenue}
                        format={(v) => String(v)}
                        items={[...o.people.headcountByDepartment].sort((a, b) => b.count - a.count).map((d) => ({ label: d.department, value: d.count }))}
                      />
                    )}
                  </Card>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {o.recentActivity && (
                <Card title="Recent activity" flush>
                  {o.recentActivity.length === 0 ? (
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
              )}
              {links.length > 0 && (
                <Card title="Go to" flush className={o.recentActivity ? undefined : 'xl:col-span-2'}>
                  <ul className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                    {links.map((l) => (
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
              )}
            </div>
          </div>
        )}
      </DataState>
    </div>
  );
}

function MySection({ me }: { me: NonNullable<DashboardOverview['me']> }) {
  return (
    <section aria-label="Your day" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link href="/hr?tab=attendance" className="rounded-xl focus-visible:outline-offset-4">
        <StatCard
          label="Attendance"
          icon={Clock}
          value={me.clockedIn ? 'Clocked in' : 'Not clocked in'}
          hint={me.clockedIn ? 'Remember to clock out' : 'Clock in from Attendance'}
          tone={me.clockedIn ? 'good' : 'neutral'}
        />
      </Link>
      <Link href="/hr?tab=leave" className="rounded-xl focus-visible:outline-offset-4">
        <StatCard
          label="Leave requests"
          icon={CalendarDays}
          value={me.pendingLeave}
          hint={me.pendingLeave ? 'Awaiting HR approval' : 'Nothing pending'}
          tone={me.pendingLeave ? 'warn' : 'neutral'}
        />
      </Link>
      <Link href="/hr?tab=payroll" className="rounded-xl focus-visible:outline-offset-4">
        <StatCard
          label="Latest payslip"
          icon={Receipt}
          value={me.latestPayslip ? money(me.latestPayslip.net) : '—'}
          hint={me.latestPayslip ? `${monthLabel(me.latestPayslip.period)} · net pay` : 'No payslips yet'}
        />
      </Link>
    </section>
  );
}

function Kpis({ o }: { o: DashboardOverview }) {
  const cards = [
    o.finance && <StatCard key="rev" label="Revenue this year" icon={Wallet} value={moneyCompact(o.finance.revenueYtd)} hint="Invoices sent, paid or overdue" />,
    o.finance && (
      <StatCard
        key="open"
        label="Open invoices"
        icon={FileText}
        value={moneyCompact(o.finance.openInvoices.total)}
        hint={`${o.finance.openInvoices.count} awaiting payment`}
        tone={o.finance.openInvoices.count ? 'warn' : 'neutral'}
      />
    ),
    o.sales && <StatCard key="pipe" label="Pipeline value" icon={Briefcase} value={moneyCompact(o.sales.pipeline.value)} hint={`${o.sales.pipeline.count} open deals`} />,
    o.people && <StatCard key="emp" label="Active employees" icon={Users} value={o.people.activeEmployees} hint="Including onboarding" />,
    o.inventory && (
      <StatCard
        key="low"
        label="Low-stock products"
        icon={Package}
        value={o.inventory.lowStock.count}
        hint={o.inventory.lowStock.count ? `Reorder: ${o.inventory.lowStock.skus.join(', ')}` : 'All products above reorder level'}
        tone={o.inventory.lowStock.count ? 'bad' : 'good'}
      />
    ),
    o.payroll && (
      <StatCard
        key="pay"
        label="Latest payroll"
        icon={Receipt}
        value={o.payroll.latest ? moneyCompact(o.payroll.latest.totalNet) : '—'}
        hint={o.payroll.latest ? `${monthLabel(o.payroll.latest.period)} · ${titleCase(o.payroll.latest.status)} · net pay` : 'No payroll run yet'}
      />
    ),
  ].filter(Boolean);
  if (cards.length === 0) return null;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards}</div>;
}

function TrendCard({ finance, wide }: { finance: NonNullable<DashboardOverview['finance']>; wide: boolean }) {
  const trend = finance.trend.map((m) => ({
    month: isCurrentMonth(m.month) ? `${monthLabel(m.month, true)} (to date)` : monthLabel(m.month, true),
    revenue: toNumber(m.revenue),
    costs: toNumber(m.expenses) + toNumber(m.payroll),
  }));
  const partial = finance.trend.find((m) => isCurrentMonth(m.month));
  const hasTrend = trend.some((t) => t.revenue > 0 || t.costs > 0);
  return (
    <Card title="Revenue vs costs" description="Last 6 months" className={wide ? 'xl:col-span-2' : 'xl:col-span-3'}>
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
  );
}
