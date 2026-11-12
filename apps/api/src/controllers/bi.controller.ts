// Business-intelligence numbers, computed from the ledger tables:
//   revenue   = invoices SENT | PAID | OVERDUE, by invoice month
//   collected = invoices PAID, by invoice month
//   expenses  = expenses not REJECTED, by submission month
//   payroll   = payslip gross, by payroll-run period month
//   netProfit = revenue - expenses - payroll
// No hardcoded figures or fallbacks: an empty database reports zeros.

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { BIMonth, BISummary, DashboardOverview } from '@repo/types';
import { prisma } from '../utils/prisma';
import { ok } from '../utils/response';
import { endpoint, noInput } from '../middleware/validate';
import { ROLES, hasRole } from '../middleware/roles';
import { Decimal, sum } from '../utils/money';

const REVENUE_STATUSES = ['SENT', 'PAID', 'OVERDUE'] as const;

/** First day (UTC) of the month `offset` months from `d`. */
function monthStart(d: Date, offset = 0) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

type Row = { month: Date; total: Prisma.Decimal | null };

function toMap(rows: Row[]) {
  return new Map(rows.map((r) => [monthKey(r.month), new Decimal(r.total ?? 0)]));
}

/** Monthly series for [from, to). */
export async function monthlySeries(from: Date, to: Date): Promise<BIMonth[]> {
  const [revenue, collected, expenses, payroll] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT date_trunc('month', "created_at") AS month, SUM("total") AS total
      FROM "invoices"
      WHERE "status"::text IN (${Prisma.join([...REVENUE_STATUSES])}) AND "created_at" >= ${from} AND "created_at" < ${to}
      GROUP BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT date_trunc('month', "created_at") AS month, SUM("total") AS total
      FROM "invoices"
      WHERE "status" = 'PAID' AND "created_at" >= ${from} AND "created_at" < ${to}
      GROUP BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT date_trunc('month', "created_at") AS month, SUM("amount") AS total
      FROM "expenses"
      WHERE "status" <> 'REJECTED' AND "created_at" >= ${from} AND "created_at" < ${to}
      GROUP BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT date_trunc('month', r."period_start") AS month, SUM(p."gross") AS total
      FROM "payslips" p JOIN "payroll_runs" r ON r."id" = p."payroll_run_id"
      WHERE r."period_start" >= ${from} AND r."period_start" < ${to}
      GROUP BY 1`,
  ]);

  const maps = { revenue: toMap(revenue), collected: toMap(collected), expenses: toMap(expenses), payroll: toMap(payroll) };
  const zero = new Decimal(0);
  const out: BIMonth[] = [];
  for (let m = new Date(from); m < to; m = monthStart(m, 1)) {
    const k = monthKey(m);
    const rev = maps.revenue.get(k) ?? zero;
    const exp = maps.expenses.get(k) ?? zero;
    const pay = maps.payroll.get(k) ?? zero;
    out.push({
      month: k,
      revenue: rev.toFixed(2),
      collected: (maps.collected.get(k) ?? zero).toFixed(2),
      expenses: exp.toFixed(2),
      payroll: pay.toFixed(2),
      netProfit: rev.minus(exp).minus(pay).toFixed(2),
    });
  }
  return out;
}

const summaryQuery = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
}).strict();

/** GET /bi/summary?months=6 — the last N calendar months including the current one. */
export const getBISummary = endpoint({ query: summaryQuery }, async ({ query }, _req, res) => {
  const now = new Date();
  const from = monthStart(now, -(query.months - 1));
  const to = monthStart(now, 1);

  const [months, byCategory, payrollTotal] = await Promise.all([
    monthlySeries(from, to),
    prisma.expense.groupBy({
      by: ['category'],
      where: { status: { not: 'REJECTED' }, createdAt: { gte: from, lt: to } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.payslip.aggregate({
      where: { payrollRun: { periodStart: { gte: from, lt: to } } },
      _sum: { gross: true },
    }),
  ]);

  const expensesByCategory = byCategory.map((c) => ({
    category: c.category,
    amount: new Decimal(c._sum.amount ?? 0).toFixed(2),
  }));
  const payroll = new Decimal(payrollTotal._sum.gross ?? 0);
  if (payroll.gt(0)) expensesByCategory.push({ category: 'Payroll', amount: payroll.toFixed(2) });

  const total = (key: keyof Omit<BIMonth, 'month'>) => sum(months.map((m) => m[key])).toFixed(2);
  const data: BISummary = {
    from: monthKey(from),
    to: monthKey(monthStart(now)),
    months,
    expensesByCategory,
    totals: {
      revenue: total('revenue'),
      collected: total('collected'),
      expenses: total('expenses'),
      payroll: total('payroll'),
      netProfit: total('netProfit'),
    },
  };
  return ok(res, data, 'BI summary retrieved');
});

/** GET /bi/overview — KPIs for the dashboard home page. */
export const getOverview = endpoint({ query: noInput }, async (_input, req, res) => {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [revenueYtd, activeEmployees, openInvoices, levels, pipeline, latestRun, trend, departments, unassigned] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: yearStart } },
        _sum: { total: true },
      }),
      prisma.employee.count({ where: { isArchived: false, status: { in: ['ACTIVE', 'ONBOARDING'] } } }),
      prisma.invoice.aggregate({ where: { status: { in: ['SENT', 'OVERDUE'] } }, _sum: { total: true }, _count: true }),
      prisma.stockLevel.findMany({ select: { quantity: true, product: { select: { sku: true, reorderLevel: true, isActive: true } } } }),
      prisma.lead.aggregate({ where: { stage: { notIn: ['WON', 'LOST'] } }, _sum: { value: true }, _count: true }),
      prisma.payrollRun.findFirst({ orderBy: { periodStart: 'desc' } }),
      monthlySeries(monthStart(now, -5), monthStart(now, 1)),
      prisma.department.findMany({
        select: { name: true, _count: { select: { employees: { where: { isArchived: false } } } } },
      }),
      prisma.employee.count({ where: { isArchived: false, departmentId: null } }),
    ]);

  // A SKU is low when its total stock across warehouses is at or below the reorder level.
  const stockBySku = new Map<string, { qty: number; reorder: number }>();
  for (const l of levels) {
    if (!l.product.isActive) continue;
    const cur = stockBySku.get(l.product.sku) ?? { qty: 0, reorder: l.product.reorderLevel };
    cur.qty += l.quantity;
    stockBySku.set(l.product.sku, cur);
  }
  const lowSkus = [...stockBySku].filter(([, v]) => v.qty <= v.reorder).map(([sku]) => sku).sort();

  const headcountByDepartment = departments
    .map((d) => ({ department: d.name, count: d._count.employees }))
    .filter((d) => d.count > 0);
  if (unassigned > 0) headcountByDepartment.push({ department: 'Unassigned', count: unassigned });

  let recentActivity: DashboardOverview['recentActivity'] = null;
  if (hasRole(req, ROLES.ADMIN)) {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 8,
      include: { user: { select: { email: true } } },
    });
    recentActivity = logs.map((l) => ({
      id: l.id, action: l.action, entity: l.entity, user: l.user.email, timestamp: l.timestamp.toISOString(),
    }));
  }

  const data: DashboardOverview = {
    revenueYtd: new Decimal(revenueYtd._sum.total ?? 0).toFixed(2),
    activeEmployees,
    openInvoices: { count: openInvoices._count, total: new Decimal(openInvoices._sum.total ?? 0).toFixed(2) },
    lowStock: { count: lowSkus.length, skus: lowSkus.slice(0, 10) },
    pipeline: { count: pipeline._count, value: new Decimal(pipeline._sum.value ?? 0).toFixed(2) },
    latestPayroll: latestRun
      ? { period: monthKey(latestRun.periodStart), totalNet: latestRun.totalNet.toFixed(2), status: latestRun.status }
      : null,
    trend,
    headcountByDepartment,
    recentActivity,
  };
  return ok(res, data, 'Overview retrieved');
});
