import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, notFoundResp, unprocessable, parsePagination, buildMeta } from '../utils/response';

// ── Journal Entries ───────────────────────────────────────────────────────────

const entrySchema = z.object({
  date: z.string().date(),
  description: z.string().min(1),
  lines: z.array(z.object({
    accountId: z.string().uuid(),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    memo: z.string().optional(),
  })).min(2, 'At least 2 journal lines required'),
});

export async function listJournalEntries(req: Request, res: Response) {
  const { page, limit, skip, sort, order, search } = parsePagination(req.query as any);
  const where = search ? { description: { contains: search, mode: 'insensitive' as const } } : {};
  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    }),
    prisma.journalEntry.count({ where }),
  ]);
  return ok(res, entries, 'Journal entries retrieved', buildMeta(page, limit, total));
}

export async function createJournalEntry(req: Request, res: Response) {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());

  const { date, description, lines } = parsed.data;
  const totalDebit  = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return unprocessable(res, 'ACID Violation: Total debits must equal total credits');
  }

  const entry = await prisma.journalEntry.create({
    data: {
      date: new Date(date),
      description,
      createdBy: req.user!.userId,
      totalDebit,
      totalCredit,
      status: 'POSTED',
      lines: { create: lines },
    },
    include: { lines: true },
  });
  return created(res, entry, 'Journal entry posted');
}

// ── Invoices ──────────────────────────────────────────────────────────────────

const invoiceSchema = z.object({
  customerId: z.string().uuid(),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  dueDate: z.string().date().optional(),
});

export async function listInvoices(req: Request, res: Response) {
  const { page, limit, skip, sort, order } = parsePagination(req.query as any);
  const status = req.query.status as string | undefined;
  const where = status ? { status: status as any } : {};
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: { customer: { select: { name: true, company: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  return ok(res, invoices, 'Invoices retrieved', buildMeta(page, limit, total));
}

export async function createInvoice(req: Request, res: Response) {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());

  const count = await prisma.invoice.count();
  const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const invoice = await prisma.invoice.create({
    data: {
      ...parsed.data,
      number,
      total: parsed.data.subtotal + parsed.data.tax,
      ...(parsed.data.dueDate && { dueDate: new Date(parsed.data.dueDate) }),
    },
    include: { customer: { select: { name: true } } },
  });
  return created(res, invoice, 'Invoice created');
}

export async function updateInvoiceStatus(req: Request, res: Response) {
  const { status } = z.object({
    status: z.enum(['DRAFT','SENT','PAID','OVERDUE','VOID']),
  }).parse(req.body);

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return notFoundResp(res, 'Invoice not found');

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { status },
  });
  return ok(res, updated, 'Invoice status updated');
}

// ── Expenses ──────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export async function listExpenses(req: Request, res: Response) {
  const { page, limit, skip, sort, order } = parsePagination(req.query as any);
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ skip, take: limit, orderBy: { [sort]: order } }),
    prisma.expense.count(),
  ]);
  return ok(res, expenses, 'Expenses retrieved', buildMeta(page, limit, total));
}

export async function createExpense(req: Request, res: Response) {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());
  const expense = await prisma.expense.create({
    data: { ...parsed.data, submittedBy: req.user!.userId },
  });
  return created(res, expense, 'Expense submitted');
}
