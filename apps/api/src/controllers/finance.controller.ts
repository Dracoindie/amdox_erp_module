import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, uuid, isoDate } from '../middleware/validate';
import { HttpError } from '../utils/httpError';
import { ROLES, hasRole } from '../middleware/roles';
import { Decimal, nonNegativeMoney, positiveMoney, sum } from '../utils/money';
import { nextCounterValue } from '../services/counter.service';
import { notifyUsers } from '../services/notify.service';
import type { BudgetLine, BudgetReport } from '@repo/types';

// ── Journal Entries ───────────────────────────────────────────────────────────

const lineSchema = z.object({
  accountId: uuid,
  debit: nonNegativeMoney.optional(),
  credit: nonNegativeMoney.optional(),
  memo: z.string().max(500).optional(),
}).strict().refine(
  (l) => (l.debit instanceof Decimal && l.debit.gt(0)) !== (l.credit instanceof Decimal && l.credit.gt(0)),
  { message: "Each line needs exactly one of debit or credit, greater than 0" },
);

const entrySchema = z.object({
  date: isoDate,
  description: z.string().trim().min(1).max(500),
  lines: z.array(lineSchema).min(2, "At least 2 journal lines required").max(100),
}).strict();

const ledgerQuery = listQuery(['date', 'createdAt', 'totalDebit']);

export const listJournalEntries = endpoint({ query: ledgerQuery }, async ({ query }, _req, res) => {
  const where = query.search ? { description: { contains: query.search, mode: 'insensitive' as const } } : {};
  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      ...paging(query),
      orderBy: { [query.sort]: query.order },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    }),
    prisma.journalEntry.count({ where }),
  ]);
  return ok(res, entries, 'Journal entries retrieved', buildMeta(query.page, query.limit, total));
});

export const createJournalEntry = endpoint({ body: entrySchema }, async ({ body }, req, res) => {
  const lines = body.lines.map((l) => ({
    accountId: l.accountId,
    debit: l.debit ?? new Decimal(0),
    credit: l.credit ?? new Decimal(0),
    memo: l.memo,
  }));
  const totalDebit = sum(lines.map((l) => l.debit));
  const totalCredit = sum(lines.map((l) => l.credit));
  if (!totalDebit.eq(totalCredit)) {
    throw new HttpError(422, `Total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)})`);
  }

  const entry = await prisma.$transaction(async (tx) => {
    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const found = await tx.account.findMany({ where: { id: { in: accountIds }, isActive: true }, select: { id: true } });
    if (found.length !== accountIds.length) {
      const known = new Set(found.map((a) => a.id));
      throw new HttpError(422, "Unknown or inactive account", { accountIds: accountIds.filter((id) => !known.has(id)) });
    }
    return tx.journalEntry.create({
      data: {
        date: new Date(body.date),
        description: body.description,
        createdBy: req.user!.userId,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        lines: { create: lines },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  });
  return created(res, entry, 'Journal entry posted');
});

// ── Invoices ──────────────────────────────────────────────────────────────────

const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'] as const;

const invoiceSchema = z.object({
  customerId: uuid,
  subtotal: nonNegativeMoney,
  tax: nonNegativeMoney.default(0),
  dueDate: isoDate.optional(),
}).strict();

const invoiceQuery = listQuery(['createdAt', 'dueDate', 'total', 'number']).extend({
  status: z.enum(INVOICE_STATUSES).optional(),
});

export const listInvoices = endpoint({ query: invoiceQuery }, async ({ query }, _req, res) => {
  const where = query.status ? { status: query.status } : {};
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      ...paging(query),
      orderBy: { [query.sort]: query.order },
      include: { customer: { select: { name: true, company: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  return ok(res, invoices, 'Invoices retrieved', buildMeta(query.page, query.limit, total));
});

export const createInvoice = endpoint({ body: invoiceSchema }, async ({ body }, _req, res) => {
  const year = new Date().getUTCFullYear();
  const invoice = await prisma.$transaction(async (tx) => {
    const n = await nextCounterValue(tx, `invoice:${year}`);
    return tx.invoice.create({
      data: {
        customerId: body.customerId,
        number: `INV-${year}-${String(n).padStart(5, "0")}`,
        subtotal: body.subtotal,
        tax: body.tax,
        total: body.subtotal.plus(body.tax),
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
      include: { customer: { select: { name: true } } },
    });
  });
  return created(res, invoice, 'Invoice created');
});

export const updateInvoiceStatus = endpoint(
  { params: idParams, body: z.object({ status: z.enum(INVOICE_STATUSES) }).strict() },
  async ({ params, body }, _req, res) => {
    const updated = await prisma.invoice.update({ where: { id: params.id }, data: { status: body.status } });
    return ok(res, updated, 'Invoice status updated');
  },
);

// ── Expenses ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  amount: positiveMoney,
  description: z.string().max(1000).optional(),
}).strict();

const EXPENSE_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const;

const expenseQuery = listQuery(['createdAt', 'amount', 'category']).extend({
  status: z.enum(EXPENSE_STATUSES).optional(),
});

// Finance (and read-only auditors) see every expense; staff see their own.
export const listExpenses = endpoint({ query: expenseQuery }, async ({ query }, req, res) => {
  const seesAll = hasRole(req, [...ROLES.FINANCE, 'READ_ONLY']);
  const where = {
    ...(seesAll ? {} : { submittedBy: req.user!.userId }),
    ...(query.status && { status: query.status }),
  };
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, ...paging(query), orderBy: { [query.sort]: query.order } }),
    prisma.expense.count({ where }),
  ]);
  return ok(res, expenses, 'Expenses retrieved', buildMeta(query.page, query.limit, total));
});

export const createExpense = endpoint({ body: expenseSchema }, async ({ body }, req, res) => {
  const expense = await prisma.expense.create({ data: { ...body, submittedBy: req.user!.userId } });
  return created(res, expense, 'Expense submitted');
});

// Allowed transitions: SUBMITTED → APPROVED | REJECTED, APPROVED → REIMBURSED
const NEXT_STATUS: Record<string, readonly string[]> = {
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['REIMBURSED'],
};

export const updateExpenseStatus = endpoint(
  { params: idParams, body: z.object({ status: z.enum(['APPROVED', 'REJECTED', 'REIMBURSED']) }).strict() },
  async ({ params, body }, req, res) => {
    const expense = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!expense) throw new HttpError(404, 'Expense not found');
    if (expense.submittedBy === req.user!.userId) {
      throw new HttpError(403, 'You cannot approve your own expense');
    }
    if (!NEXT_STATUS[expense.status]?.includes(body.status)) {
      throw new HttpError(409, `Cannot move an expense from ${expense.status} to ${body.status}`);
    }
    const { count } = await prisma.expense.updateMany({
      where: { id: params.id, status: expense.status },
      data: { status: body.status, approvedBy: req.user!.userId },
    });
    if (count === 0) throw new HttpError(409, 'Expense was changed by someone else; reload and retry');
    await notifyUsers(
      [expense.submittedBy],
      body.status === 'REJECTED' ? 'alert' : 'success',
      `Expense ${body.status.toLowerCase()}`,
      `${expense.category}: ${expense.amount.toFixed(2)}`,
    );
    return ok(res, await prisma.expense.findUniqueOrThrow({ where: { id: params.id } }), 'Expense updated');
  },
);

// ── Chart of accounts ─────────────────────────────────────────────────────────

export const listAccounts = endpoint({ query: z.object({}).strict() }, async (_input, _req, res) => {
  const accounts = await prisma.account.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
  return ok(res, accounts, 'Accounts retrieved');
});

// ── Budgets (budget vs actual per expense category) ───────────────────────────

const periodQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
}).strict();

export const getBudgetReport = endpoint({ query: periodQuery }, async ({ query }, _req, res) => {
  const now = new Date();
  const year = query.year ?? now.getUTCFullYear();
  const month = query.month ?? now.getUTCMonth() + 1;
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const [budgets, actuals] = await Promise.all([
    prisma.budget.findMany({ where: { year, month } }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { status: { not: 'REJECTED' }, createdAt: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);

  const categories = new Set([...budgets.map((b) => b.category), ...actuals.map((a) => a.category)]);
  const zero = new Decimal(0);
  const lines: BudgetLine[] = [...categories].sort().map((category) => {
    const budget = budgets.find((b) => b.category === category)?.amount ?? zero;
    const actual = new Decimal(actuals.find((a) => a.category === category)?._sum.amount ?? 0);
    return { category, budget: budget.toFixed(2), actual: actual.toFixed(2), variance: budget.minus(actual).toFixed(2) };
  });
  const totalBudget = sum(lines.map((l) => l.budget));
  const totalActual = sum(lines.map((l) => l.actual));
  const report: BudgetReport = {
    year,
    month,
    lines,
    totals: { budget: totalBudget.toFixed(2), actual: totalActual.toFixed(2), variance: totalBudget.minus(totalActual).toFixed(2) },
  };
  return ok(res, report, 'Budget report retrieved');
});

export const upsertBudget = endpoint(
  {
    body: z.object({
      category: z.string().trim().min(1).max(100),
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
      amount: nonNegativeMoney,
    }).strict(),
  },
  async ({ body }, req, res) => {
    const { category, year, month, amount } = body;
    const budget = await prisma.budget.upsert({
      where: { category_year_month: { category, year, month } },
      create: { category, year, month, amount, updatedBy: req.user!.userId },
      update: { amount, updatedBy: req.user!.userId },
    });
    return ok(res, budget, 'Budget saved');
  },
);
