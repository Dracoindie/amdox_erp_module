import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, uuid, isoDate } from '../middleware/validate';
import { HttpError } from '../utils/httpError';
import { ROLES, hasRole } from '../middleware/roles';

// ── Journal Entries ───────────────────────────────────────────────────────────

const entrySchema = z.object({
  date: isoDate,
  description: z.string().trim().min(1).max(500),
  lines: z.array(z.object({
    accountId: uuid,
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    memo: z.string().max(500).optional(),
  }).strict()).min(2, 'At least 2 journal lines required').max(100),
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
  const totalDebit = body.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = body.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new HttpError(422, 'Total debits must equal total credits');
  }

  const entry = await prisma.journalEntry.create({
    data: {
      date: new Date(body.date),
      description: body.description,
      createdBy: req.user!.userId,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      lines: { create: body.lines },
    },
    include: { lines: true },
  });
  return created(res, entry, 'Journal entry posted');
});

// ── Invoices ──────────────────────────────────────────────────────────────────

const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'] as const;

const invoiceSchema = z.object({
  customerId: uuid,
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
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
  const count = await prisma.invoice.count();
  const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  const invoice = await prisma.invoice.create({
    data: {
      customerId: body.customerId,
      subtotal: body.subtotal,
      tax: body.tax,
      number,
      total: body.subtotal + body.tax,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
    include: { customer: { select: { name: true } } },
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
  amount: z.number().positive(),
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
    return ok(res, await prisma.expense.findUniqueOrThrow({ where: { id: params.id } }), 'Expense updated');
  },
);
