'use client';

import { useMemo, useState } from 'react';
import { BookOpen, FileText, Receipt, PieChart as PieIcon, LineChart, Plus, Trash2 } from 'lucide-react';
import type { Account, BISummary, BudgetReport, Customer, Expense, Invoice, InvoiceStatus, JournalEntry } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { can } from '../../../lib/permissions';
import { date, money, monthLabel, todayISO, toNumber } from '../../../lib/format';
import {
  Badge, Button, Card, DataState, Field, InlineError, Input, Modal, PageHeader, Pager, Select, StatCard, Table, Tabs, Td,
} from '../../../components/ui';

type Tab = 'ledger' | 'invoices' | 'expenses' | 'budget' | 'reports';
const TABS = [
  { id: 'ledger', label: 'General Ledger', icon: BookOpen },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'budget', label: 'Budgets', icon: PieIcon },
  { id: 'reports', label: 'Reports', icon: LineChart },
] as const;

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('ledger');
  return (
    <div className="space-y-6">
      <PageHeader title="Financial Ledger" subtitle="Double-entry general ledger, receivables, expenses and budgets" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'expenses' && <ExpensesTab />}
      {tab === 'budget' && <BudgetTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

// ── Ledger ────────────────────────────────────────────────────────────────────

function LedgerTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const q = new URLSearchParams({ page: String(page), limit: '20', sort: 'date', ...(search && { search }) });
  const ledger = useApi<JournalEntry[]>(`/finance/ledger?${q}`);

  return (
    <Card
      title="Journal entries"
      actions={
        <div className="flex gap-2">
          <Input placeholder="Search description" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
          {can(user, 'FINANCE') && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New entry</Button>}
        </div>
      }
    >
      <DataState state={ledger} empty={{ title: 'No journal entries', hint: search ? 'Try another search' : undefined }}>
        {(entries) => (
          <>
            <Table head={['Date', 'Description', 'Lines', 'Debit', 'Credit', 'Status']}>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td>{date(e.date)}</Td>
                  <Td className="font-medium">{e.description}</Td>
                  <Td className="text-xs text-slate-500">
                    {e.lines.map((l) => (
                      <div key={l.id}>{l.account?.code} {l.account?.name}: {toNumber(l.debit) > 0 ? `Dr ${money(l.debit)}` : `Cr ${money(l.credit)}`}</div>
                    ))}
                  </Td>
                  <Td>{money(e.totalDebit)}</Td>
                  <Td>{money(e.totalCredit)}</Td>
                  <Td><Badge>{e.status}</Badge></Td>
                </tr>
              ))}
            </Table>
            <Pager meta={ledger.meta} onPage={setPage} />
          </>
        )}
      </DataState>
      <JournalEntryModal open={open} onClose={() => setOpen(false)} onSaved={ledger.reload} />
    </Card>
  );
}

interface DraftLine { accountId: string; side: 'debit' | 'credit'; amount: string }

function JournalEntryModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const accounts = useApi<Account[]>(open ? '/finance/accounts' : null);
  const [entryDate, setEntryDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    { accountId: '', side: 'debit', amount: '' },
    { accountId: '', side: 'credit', amount: '' },
  ]);
  const totals = useMemo(() => lines.reduce(
    (t, l) => ({ ...t, [l.side]: t[l.side] + (Number(l.amount) || 0) }), { debit: 0, credit: 0 },
  ), [lines]);
  const balanced = totals.debit > 0 && Math.abs(totals.debit - totals.credit) < 0.005;

  const save = useMutation(async () => {
    await api.post('/finance/ledger', {
      date: entryDate,
      description,
      lines: lines.map((l) => ({ accountId: l.accountId, [l.side]: l.amount })),
    });
    onSaved();
    onClose();
    setDescription('');
    setLines([{ accountId: '', side: 'debit', amount: '' }, { accountId: '', side: 'credit', amount: '' }]);
  });

  const update = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <Modal title="New journal entry" open={open} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" required value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></Field>
          <Field label="Description"><Input required maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_110px_32px] gap-2">
              <Select required value={l.accountId} onChange={(e) => update(i, { accountId: e.target.value })} aria-label="Account">
                <option value="">Account…</option>
                {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </Select>
              <Select value={l.side} onChange={(e) => update(i, { side: e.target.value as DraftLine['side'] })} aria-label="Side">
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </Select>
              <Input required type="number" min="0.01" step="0.01" placeholder="0.00" value={l.amount} onChange={(e) => update(i, { amount: e.target.value })} aria-label="Amount" />
              <Button type="button" variant="ghost" size="sm" aria-label="Remove line" disabled={lines.length <= 2} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setLines((ls) => [...ls, { accountId: '', side: 'credit', amount: '' }])}>
            <Plus className="h-3.5 w-3.5" /> Add line
          </Button>
        </div>
        <p className={balanced ? 'text-sm text-emerald-600' : 'text-sm text-amber-600'}>
          Debits {money(totals.debit)} · Credits {money(totals.credit)} {balanced ? '· balanced' : '· must balance'}
        </p>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!balanced || save.pending}>{save.pending ? 'Posting…' : 'Post entry'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Invoices ──────────────────────────────────────────────────────────────────

const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'];

function InvoicesTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const q = new URLSearchParams({ page: String(page), limit: '20', ...(status && { status }) });
  const invoices = useApi<Invoice[]>(`/finance/invoices?${q}`);
  const setInvoiceStatus = useMutation(async (id: string, next: InvoiceStatus) => {
    await api.patch(`/finance/invoices/${id}`, { status: next });
    invoices.reload();
  });

  return (
    <Card
      title="Invoices"
      actions={
        <div className="flex gap-2">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="w-40">
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          {can(user, 'FINANCE') && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New invoice</Button>}
        </div>
      }
    >
      <InlineError message={setInvoiceStatus.error} />
      <DataState state={invoices} empty={{ title: 'No invoices' }}>
        {(rows) => (
          <>
            <Table head={['Number', 'Customer', 'Issued', 'Due', 'Total', 'Status']}>
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <Td className="font-mono text-xs">{inv.number}</Td>
                  <Td>{inv.customer.name}{inv.customer.company ? <span className="text-xs text-slate-400"> · {inv.customer.company}</span> : null}</Td>
                  <Td>{date(inv.createdAt)}</Td>
                  <Td>{date(inv.dueDate)}</Td>
                  <Td className="font-semibold">{money(inv.total)}</Td>
                  <Td>
                    {can(user, 'FINANCE') ? (
                      <Select aria-label={`Status of ${inv.number}`} value={inv.status} disabled={setInvoiceStatus.pending} onChange={(e) => void setInvoiceStatus.run(inv.id, e.target.value as InvoiceStatus)} className="w-32 py-1 text-xs">
                        {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    ) : <Badge>{inv.status}</Badge>}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager meta={invoices.meta} onPage={setPage} />
          </>
        )}
      </DataState>
      <InvoiceModal open={open} onClose={() => setOpen(false)} onSaved={invoices.reload} />
    </Card>
  );
}

function InvoiceModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const customers = useApi<Customer[]>(open ? '/customers?limit=100&sort=name&order=asc' : null);
  const [form, setForm] = useState({ customerId: '', subtotal: '', tax: '', dueDate: '' });
  const save = useMutation(async () => {
    await api.post('/finance/invoices', {
      customerId: form.customerId,
      subtotal: form.subtotal,
      tax: form.tax || '0',
      ...(form.dueDate && { dueDate: form.dueDate }),
    });
    onSaved();
    onClose();
    setForm({ customerId: '', subtotal: '', tax: '', dueDate: '' });
  });
  return (
    <Modal title="New invoice" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <Field label="Customer">
          <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">Select…</option>
            {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subtotal"><Input required type="number" min="0" step="0.01" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></Field>
          <Field label="Tax"><Input type="number" min="0" step="0.01" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></Field>
        </div>
        <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Creating…' : 'Create invoice'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Expenses ──────────────────────────────────────────────────────────────────

function ExpensesTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const expenses = useApi<Expense[]>(`/finance/expenses?page=${page}&limit=20`);
  const [form, setForm] = useState({ category: '', amount: '', description: '' });
  const submit = useMutation(async () => {
    await api.post('/finance/expenses', { category: form.category, amount: form.amount, ...(form.description && { description: form.description }) });
    setForm({ category: '', amount: '', description: '' });
    expenses.reload();
  });
  const decide = useMutation(async (id: string, status: 'APPROVED' | 'REJECTED' | 'REIMBURSED') => {
    await api.patch(`/finance/expenses/${id}/status`, { status });
    expenses.reload();
  });
  const isFinance = can(user, 'FINANCE');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card title={isFinance ? 'All expenses' : 'My expenses'} className="lg:col-span-2">
        <InlineError message={decide.error} />
        <DataState state={expenses} empty={{ title: 'No expenses yet' }}>
          {(rows) => (
            <>
              <Table head={['Date', 'Category', 'Description', 'Amount', 'Status', '']}>
                {rows.map((x) => (
                  <tr key={x.id}>
                    <Td>{date(x.createdAt)}</Td>
                    <Td>{x.category}</Td>
                    <Td className="text-slate-500">{x.description ?? '—'}</Td>
                    <Td className="font-semibold">{money(x.amount)}</Td>
                    <Td><Badge>{x.status}</Badge></Td>
                    <Td>
                      {isFinance && x.submittedBy !== user?.id && (
                        <div className="flex gap-1">
                          {x.status === 'SUBMITTED' && (
                            <>
                              <Button size="sm" disabled={decide.pending} onClick={() => void decide.run(x.id, 'APPROVED')}>Approve</Button>
                              <Button size="sm" variant="secondary" disabled={decide.pending} onClick={() => void decide.run(x.id, 'REJECTED')}>Reject</Button>
                            </>
                          )}
                          {x.status === 'APPROVED' && <Button size="sm" variant="secondary" disabled={decide.pending} onClick={() => void decide.run(x.id, 'REIMBURSED')}>Reimburse</Button>}
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
              <Pager meta={expenses.meta} onPage={setPage} />
            </>
          )}
        </DataState>
      </Card>
      {can(user, 'STAFF') && (
        <Card title="Submit an expense">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit.run(); }}>
            <Field label="Category"><Input required list="expense-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <datalist id="expense-categories">
              {['Marketing', 'Travel', 'Infrastructure', 'Office', 'Software'].map((c) => <option key={c} value={c} />)}
            </datalist>
            <Field label="Amount"><Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Description"><Input maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <InlineError message={submit.error} />
            <Button type="submit" disabled={submit.pending} className="w-full">{submit.pending ? 'Submitting…' : 'Submit'}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── Budget ────────────────────────────────────────────────────────────────────

function BudgetTab() {
  const user = useAuthUser();
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`);
  const [year, month] = period.split('-').map(Number);
  const report = useApi<BudgetReport>(`/finance/budget?year=${year}&month=${month}`);
  const [form, setForm] = useState({ category: '', amount: '' });
  const save = useMutation(async () => {
    await api.put('/finance/budget', { category: form.category, amount: form.amount, year, month });
    setForm({ category: '', amount: '' });
    report.reload();
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card
        title={`Budget vs actual · ${monthLabel(period)}`}
        actions={<Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="w-44" aria-label="Period" />}
        className="lg:col-span-2"
      >
        <DataState state={report} isEmpty={(r) => r.lines.length === 0} empty={{ title: 'No budgets or expenses for this month' }}>
          {(r) => (
            <div className="space-y-4">
              {r.lines.map((l) => {
                const budget = toNumber(l.budget);
                const actual = toNumber(l.actual);
                const pctUsed = budget > 0 ? Math.min(100, (actual / budget) * 100) : actual > 0 ? 100 : 0;
                const over = actual > budget;
                return (
                  <div key={l.category}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{l.category}</span>
                      <span className={over ? 'font-semibold text-rose-600' : 'text-slate-500'}>
                        {money(actual)} of {budget > 0 ? money(budget) : 'no budget'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className={over ? 'h-2 rounded-full bg-rose-500' : 'h-2 rounded-full bg-[#ff5a00]'} style={{ width: `${pctUsed}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Total {money(r.totals.actual)} of {money(r.totals.budget)} · variance{' '}
                <span className={toNumber(r.totals.variance) < 0 ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-600'}>{money(r.totals.variance)}</span>
              </p>
            </div>
          )}
        </DataState>
      </Card>
      {can(user, 'FINANCE') && (
        <Card title="Set a budget">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
            <Field label="Category"><Input required list="budget-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <datalist id="budget-categories">
              {report.data?.lines.map((l) => <option key={l.category} value={l.category} />)}
            </datalist>
            <Field label={`Amount for ${monthLabel(period)}`}><Input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <InlineError message={save.error} />
            <Button type="submit" disabled={save.pending} className="w-full">{save.pending ? 'Saving…' : 'Save budget'}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── Reports (P&L) ─────────────────────────────────────────────────────────────

function ReportsTab() {
  const summary = useApi<BISummary>('/bi/summary?months=12');
  return (
    <DataState state={summary} isEmpty={() => false}>
      {(s) => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue (12 mo)" value={money(s.totals.revenue)} tone="brand" />
            <StatCard label="Expenses (12 mo)" value={money(s.totals.expenses)} />
            <StatCard label="Payroll (12 mo)" value={money(s.totals.payroll)} />
            <StatCard label="Net profit (12 mo)" value={money(s.totals.netProfit)} tone={toNumber(s.totals.netProfit) >= 0 ? 'good' : 'bad'} />
          </div>
          <Card title="Profit & loss by month">
            <Table head={['Month', 'Revenue', 'Collected', 'Expenses', 'Payroll', 'Net profit']}>
              {s.months.map((m) => (
                <tr key={m.month}>
                  <Td className="font-medium">{monthLabel(m.month)}</Td>
                  <Td>{money(m.revenue)}</Td>
                  <Td>{money(m.collected)}</Td>
                  <Td>{money(m.expenses)}</Td>
                  <Td>{money(m.payroll)}</Td>
                  <Td className={toNumber(m.netProfit) >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{money(m.netProfit)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </DataState>
  );
}
