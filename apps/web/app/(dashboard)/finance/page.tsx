'use client';

import { useMemo, useState } from 'react';
import { BookOpen, FileText, LineChart, PieChart, Plus, Receipt, Trash2 } from 'lucide-react';
import type { Account, BISummary, BudgetReport, Customer, Expense, Invoice, InvoiceStatus, JournalEntry } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { useDebounced } from '../../../lib/useDebounced';
import { can } from '../../../lib/permissions';
import { CURRENCY_SYMBOL, date, isCurrentMonth, money, monthLabel, titleCase, todayISO, toNumber } from '../../../lib/format';
import {
  Alert, Badge, Button, Card, DataState, DataTable, EmptyState, Field, Form, FormActions, IconButton, Input, Modal,
  PageHeader, Pagination, SearchInput, Select, StatCard, StatsSkeleton, TabPanel, Tabs, cx, useTabParam,
  type Column, type SortState,
} from '../../../components/ui';

const TABS = [
  { id: 'ledger', label: 'General ledger', icon: BookOpen },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'budget', label: 'Budgets', icon: PieChart },
  { id: 'reports', label: 'Reports', icon: LineChart },
] as const;

export default function FinancePage() {
  const [tab, setTab] = useTabParam(TABS);
  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="Double-entry general ledger, receivables, expenses and budgets." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} label="Finance sections" />
      <TabPanel id={tab}>
        {tab === 'ledger' && <LedgerTab />}
        {tab === 'invoices' && <InvoicesTab />}
        {tab === 'expenses' && <ExpensesTab />}
        {tab === 'budget' && <BudgetTab />}
        {tab === 'reports' && <ReportsTab />}
      </TabPanel>
    </div>
  );
}

const sortQuery = (s: SortState) => ({ sort: s.key, order: s.order });

// ── Ledger ────────────────────────────────────────────────────────────────────

function LedgerTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'date', order: 'desc' });
  const [open, setOpen] = useState(false);
  const q = useDebounced(search);
  const params = new URLSearchParams({ page: String(page), limit: '20', ...sortQuery(sort), ...(q && { search: q }) });
  const ledger = useApi<JournalEntry[]>(`/finance/ledger?${params}`);
  const canPost = can(user, 'FINANCE');

  const columns: Column<JournalEntry>[] = [
    { key: 'date', header: 'Date', cell: (e) => date(e.date), sortKey: 'date', className: 'whitespace-nowrap' },
    { key: 'description', header: 'Description', primary: true, cell: (e) => <span className="font-medium">{e.description}</span> },
    {
      key: 'lines', header: 'Lines', hideOnMobile: true, hideBelow: 'xl',
      cell: (e) => (
        <ul className="space-y-0.5 text-xs text-fg-muted">
          {e.lines.map((l) => (
            <li key={l.id} className="flex gap-2">
              <span className={cx('w-5 shrink-0 font-medium', toNumber(l.debit) > 0 ? 'text-fg' : 'pl-2')}>{toNumber(l.debit) > 0 ? 'Dr' : 'Cr'}</span>
              <span className="truncate">{l.account?.code} {l.account?.name}</span>
              <span className="ml-auto tabular-nums">{money(toNumber(l.debit) > 0 ? l.debit : l.credit)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    { key: 'debit', header: 'Debit', numeric: true, sortKey: 'totalDebit', cell: (e) => money(e.totalDebit) },
    { key: 'credit', header: 'Credit', numeric: true, cell: (e) => money(e.totalCredit) },
    { key: 'status', header: 'Status', cell: (e) => <Badge>{e.status}</Badge> },
  ];

  return (
    <Card
      title="Journal entries"
      flush
      actions={
        <>
          <SearchInput label="Search descriptions" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {canPost && <Button icon={Plus} onClick={() => setOpen(true)}>New entry</Button>}
        </>
      }
    >
      <DataState
        state={ledger}
        empty={{
          icon: BookOpen,
          title: q ? 'No entries match your search' : 'No journal entries yet',
          description: q ? 'Try a different description.' : canPost ? 'Post the first double-entry transaction.' : undefined,
          action: !q && canPost ? <Button icon={Plus} onClick={() => setOpen(true)}>New entry</Button> : undefined,
        }}
      >
        {(rows) => (
          <DataTable
            caption="Journal entries"
            columns={columns}
            rows={rows}
            rowKey={(e) => e.id}
            sort={sort}
            onSortChange={(s) => { setSort(s); setPage(1); }}
            footer={<Pagination meta={ledger.meta} onPage={setPage} noun="entries" />}
          />
        )}
      </DataState>
      <Modal title="New journal entry" description="Debits and credits must balance before the entry can be posted." open={open} onClose={() => setOpen(false)} size="lg">
        <JournalEntryForm onDone={() => { setOpen(false); ledger.reload(); }} onCancel={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

interface DraftLine { key: number; accountId: string; side: 'debit' | 'credit'; amount: string }

function JournalEntryForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const accounts = useApi<Account[]>('/finance/accounts');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [nextKey, setNextKey] = useState(3);
  const [lines, setLines] = useState<DraftLine[]>([
    { key: 1, accountId: '', side: 'debit', amount: '' },
    { key: 2, accountId: '', side: 'credit', amount: '' },
  ]);
  const totals = useMemo(() => lines.reduce(
    (t, l) => ({ ...t, [l.side]: t[l.side] + (Number(l.amount) || 0) }), { debit: 0, credit: 0 },
  ), [lines]);
  const difference = Math.round((totals.debit - totals.credit) * 100) / 100;
  const balanced = totals.debit > 0 && difference === 0;

  const save = useMutation(async () => {
    await api.post('/finance/ledger', {
      date: entryDate,
      description,
      lines: lines.map((l) => ({ accountId: l.accountId, [l.side]: l.amount })),
    });
    onDone();
  }, { success: 'Journal entry posted' });

  const update = (key: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <Form onSubmit={() => (balanced ? save.run() : undefined)} errors={save.fieldErrors} error={save.error}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date" name="date" required><Input type="date" value={entryDate} max={todayISO()} onChange={(e) => setEntryDate(e.target.value)} /></Field>
        <Field label="Description" name="description" required className="sm:col-span-2">
          <Input maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Office rent for November" />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-fg">Lines</legend>
        <div className="hidden grid-cols-[1fr_7rem_9rem_2.25rem] gap-2 text-xs font-medium text-fg-muted sm:grid">
          <span>Account</span><span>Side</span><span className="text-right">Amount</span><span />
        </div>
        {lines.map((l, i) => (
          <div key={l.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_7rem_9rem_2.25rem] sm:border-0 sm:p-0">
            <Select required name={`account-${l.key}`} value={l.accountId} onChange={(e) => update(l.key, { accountId: e.target.value })} aria-label={`Line ${i + 1} account`} className="col-span-2 sm:col-span-1">
              <option value="">{accounts.loading ? 'Loading accounts…' : 'Select account…'}</option>
              {accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </Select>
            <Select name={`side-${l.key}`} value={l.side} onChange={(e) => update(l.key, { side: e.target.value as DraftLine['side'] })} aria-label={`Line ${i + 1} side`}>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </Select>
            <Input
              required type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" prefix={CURRENCY_SYMBOL}
              name={`amount-${l.key}`} value={l.amount} onChange={(e) => update(l.key, { amount: e.target.value })} aria-label={`Line ${i + 1} amount`}
              className="col-span-2 sm:col-span-1 [&_input]:text-right"
            />
            <IconButton
              icon={Trash2} aria-label={`Remove line ${i + 1}`} disabled={lines.length <= 2}
              onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              className="col-start-2 row-start-2 justify-self-end sm:col-start-auto sm:row-start-auto"
            />
          </div>
        ))}
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => { setLines((ls) => [...ls, { key: nextKey, accountId: '', side: 'credit', amount: '' }]); setNextKey((k) => k + 1); }}>
          Add line
        </Button>
      </fieldset>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-sm" aria-live="polite">
        <div><p className="text-xs text-fg-muted">Debits</p><p className="font-medium tabular-nums">{money(totals.debit)}</p></div>
        <div><p className="text-xs text-fg-muted">Credits</p><p className="font-medium tabular-nums">{money(totals.credit)}</p></div>
        <div>
          <p className="text-xs text-fg-muted">Difference</p>
          <p className={cx('font-medium tabular-nums', balanced ? 'text-success' : 'text-warning')}>
            {balanced ? 'Balanced' : money(Math.abs(difference))}
          </p>
        </div>
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending} disabled={!balanced}>Post entry</Button>
      </FormActions>
    </Form>
  );
}

// ── Invoices ──────────────────────────────────────────────────────────────────

const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID'];

function InvoicesTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', order: 'desc' });
  const [open, setOpen] = useState(false);
  const params = new URLSearchParams({ page: String(page), limit: '20', ...sortQuery(sort), ...(status && { status }) });
  const invoices = useApi<Invoice[]>(`/finance/invoices?${params}`);
  const isFinance = can(user, 'FINANCE');
  const setInvoiceStatus = useMutation(async (inv: Invoice, next: InvoiceStatus) => {
    await api.patch(`/finance/invoices/${inv.id}`, { status: next });
    invoices.reload();
    return `${inv.number} marked as ${titleCase(next).toLowerCase()}`;
  }, { success: (m) => m, errorToast: true });

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice', primary: true, sortKey: 'number', cell: (i) => <span className="font-mono text-xs font-medium">{i.number}</span> },
    {
      key: 'customer', header: 'Customer',
      cell: (i) => <><span className="block">{i.customer.name}</span>{i.customer.company && <span className="block text-xs text-fg-subtle">{i.customer.company}</span>}</>,
    },
    { key: 'issued', header: 'Issued', sortKey: 'createdAt', cell: (i) => date(i.createdAt), className: 'whitespace-nowrap' },
    { key: 'due', header: 'Due', sortKey: 'dueDate', cell: (i) => date(i.dueDate), className: 'whitespace-nowrap' },
    { key: 'total', header: 'Total', numeric: true, sortKey: 'total', cell: (i) => <span className="font-medium">{money(i.total)}</span> },
    {
      key: 'status', header: 'Status',
      cell: (i) => isFinance ? (
        <Select
          aria-label={`Status of ${i.number}`}
          value={i.status}
          disabled={setInvoiceStatus.pending}
          onChange={(e) => void setInvoiceStatus.run(i, e.target.value as InvoiceStatus)}
          className="w-32"
        >
          {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </Select>
      ) : <Badge>{i.status}</Badge>,
    },
  ];

  return (
    <Card
      title="Invoices"
      flush
      actions={
        <>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="w-full sm:w-40">
            <option value="">All statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
          {isFinance && <Button icon={Plus} onClick={() => setOpen(true)}>New invoice</Button>}
        </>
      }
    >
      <DataState
        state={invoices}
        empty={{
          icon: FileText,
          title: status ? `No ${titleCase(status).toLowerCase()} invoices` : 'No invoices yet',
          description: status ? 'Try another status filter.' : undefined,
          action: !status && isFinance ? <Button icon={Plus} onClick={() => setOpen(true)}>New invoice</Button> : undefined,
        }}
      >
        {(rows) => (
          <DataTable
            caption="Invoices"
            columns={columns}
            rows={rows}
            rowKey={(i) => i.id}
            sort={sort}
            onSortChange={(s) => { setSort(s); setPage(1); }}
            footer={<Pagination meta={invoices.meta} onPage={setPage} noun="invoices" />}
          />
        )}
      </DataState>
      <Modal title="New invoice" open={open} onClose={() => setOpen(false)}>
        <InvoiceForm onDone={() => { setOpen(false); invoices.reload(); }} onCancel={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

function InvoiceForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const customers = useApi<Customer[]>('/customers?limit=100&sort=name&order=asc');
  const [form, setForm] = useState({ customerId: '', subtotal: '', tax: '', dueDate: '' });
  const total = (Number(form.subtotal) || 0) + (Number(form.tax) || 0);
  const save = useMutation(async () => {
    await api.post('/finance/invoices', {
      customerId: form.customerId,
      subtotal: form.subtotal,
      tax: form.tax || '0',
      ...(form.dueDate && { dueDate: form.dueDate }),
    });
    onDone();
  }, { success: 'Invoice created' });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <Field label="Customer" name="customerId" required>
        <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">{customers.loading ? 'Loading customers…' : 'Select a customer…'}</option>
          {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Subtotal" name="subtotal" required>
          <Input type="number" inputMode="decimal" min="0" step="0.01" prefix={CURRENCY_SYMBOL} value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} />
        </Field>
        <Field label="Tax" name="tax" optional>
          <Input type="number" inputMode="decimal" min="0" step="0.01" prefix={CURRENCY_SYMBOL} value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
        </Field>
      </div>
      <Field label="Due date" name="dueDate" optional hint="Defaults to 30 days from today">
        <Input type="date" min={todayISO()} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
      </Field>
      <p className="flex justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <span className="text-fg-muted">Invoice total</span><span className="font-semibold tabular-nums">{money(total)}</span>
      </p>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Create invoice</Button>
      </FormActions>
    </Form>
  );
}

// ── Expenses ──────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Marketing', 'Travel', 'Infrastructure', 'Office', 'Software'];

function ExpensesTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', order: 'desc' });
  const expenses = useApi<Expense[]>(`/finance/expenses?${new URLSearchParams({ page: String(page), limit: '20', ...sortQuery(sort) })}`);
  const isFinance = can(user, 'FINANCE');
  const canSubmit = can(user, 'STAFF');
  const decide = useMutation(async (x: Expense, status: 'APPROVED' | 'REJECTED' | 'REIMBURSED') => {
    await api.patch(`/finance/expenses/${x.id}/status`, { status });
    expenses.reload();
    return `${x.category} expense ${titleCase(status).toLowerCase()}`;
  }, { success: (m) => m, errorToast: true });

  const columns: Column<Expense>[] = [
    { key: 'category', header: 'Category', primary: true, sortKey: 'category', cell: (x) => <span className="font-medium">{x.category}</span> },
    { key: 'date', header: 'Submitted', sortKey: 'createdAt', cell: (x) => date(x.createdAt), className: 'whitespace-nowrap' },
    { key: 'description', header: 'Description', cell: (x) => <span className="text-fg-muted">{x.description ?? '—'}</span> },
    { key: 'amount', header: 'Amount', numeric: true, sortKey: 'amount', cell: (x) => <span className="font-medium">{money(x.amount)}</span> },
    { key: 'status', header: 'Status', cell: (x) => <Badge>{x.status}</Badge> },
    ...(isFinance ? [{
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right' as const, mobileLabel: '',
      cell: (x: Expense) => x.submittedBy === user?.id ? (
        <span className="text-xs text-fg-subtle">Your claim</span>
      ) : (
        <div className="flex justify-end gap-2">
          {x.status === 'SUBMITTED' && (
            <>
              <Button size="sm" variant="secondary" disabled={decide.pending} onClick={() => void decide.run(x, 'REJECTED')}>Reject</Button>
              <Button size="sm" disabled={decide.pending} onClick={() => void decide.run(x, 'APPROVED')}>Approve</Button>
            </>
          )}
          {x.status === 'APPROVED' && <Button size="sm" variant="secondary" disabled={decide.pending} onClick={() => void decide.run(x, 'REIMBURSED')}>Mark reimbursed</Button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card title={isFinance ? 'All expense claims' : 'My expense claims'} flush className={canSubmit ? 'xl:col-span-2' : 'xl:col-span-3'}>
        <DataState state={expenses} empty={{ icon: Receipt, title: 'No expense claims yet', description: canSubmit ? 'Submit a claim with the form.' : undefined }}>
          {(rows) => (
            <DataTable
              caption="Expense claims"
              columns={columns}
              rows={rows}
              rowKey={(x) => x.id}
              sort={sort}
              onSortChange={(s) => { setSort(s); setPage(1); }}
              footer={<Pagination meta={expenses.meta} onPage={setPage} noun="claims" />}
            />
          )}
        </DataState>
      </Card>
      {canSubmit && <ExpenseForm onSaved={expenses.reload} />}
    </div>
  );
}

function ExpenseForm({ onSaved }: { onSaved: () => void }) {
  const blank = { category: '', amount: '', description: '' };
  const [form, setForm] = useState(blank);
  const submit = useMutation(async () => {
    await api.post('/finance/expenses', { category: form.category, amount: form.amount, ...(form.description && { description: form.description }) });
    setForm(blank);
    onSaved();
  }, { success: 'Expense submitted for approval' });
  return (
    <Card title="Submit an expense" description="Finance reviews claims before reimbursement." className="self-start">
      <Form onSubmit={submit.run} errors={submit.fieldErrors} error={submit.error}>
        <Field label="Category" name="category" required hint="Pick one or type your own">
          <Input list="expense-categories" maxLength={100} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <datalist id="expense-categories">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        <Field label="Amount" name="amount" required>
          <Input type="number" inputMode="decimal" min="0.01" step="0.01" prefix={CURRENCY_SYMBOL} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Description" name="description" optional>
          <Input maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was it for?" />
        </Field>
        <Button type="submit" loading={submit.pending} className="w-full">Submit expense</Button>
      </Form>
    </Card>
  );
}

// ── Budget ────────────────────────────────────────────────────────────────────

function BudgetTab() {
  const user = useAuthUser();
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`);
  const [year, month] = period.split('-').map(Number);
  const report = useApi<BudgetReport>(`/finance/budget?year=${year}&month=${month}`);
  const canEdit = can(user, 'FINANCE');

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card
        title="Budget vs actual"
        description={`${monthLabel(period)}${isCurrentMonth(period) ? ' · month to date' : ''}`}
        actions={
          <div className="w-full sm:w-44">
            <Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} aria-label="Budget month" />
          </div>
        }
        className={canEdit ? 'xl:col-span-2' : 'xl:col-span-3'}
      >
        <DataState
          state={report}
          isEmpty={(r) => r.lines.length === 0}
          skeleton={<div className="space-y-5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 animate-pulse rounded-md bg-surface-3" />)}</div>}
          empty={{ icon: PieChart, title: 'No budgets or expenses this month', description: canEdit ? 'Set a budget with the form to start tracking.' : undefined }}
        >
          {(r) => {
            const variance = toNumber(r.totals.variance);
            return (
              <div className="space-y-5">
                <ul className="space-y-4">
                  {r.lines.map((l) => {
                    const budget = toNumber(l.budget);
                    const actual = toNumber(l.actual);
                    const pctUsed = budget > 0 ? (actual / budget) * 100 : actual > 0 ? 100 : 0;
                    const over = budget > 0 ? actual > budget : actual > 0;
                    return (
                      <li key={l.category}>
                        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <span className="font-medium text-fg">{l.category}</span>
                          <span className="tabular-nums text-fg-muted">
                            <span className="font-medium text-fg">{money(actual)}</span> of {budget > 0 ? money(budget) : 'no budget'}
                            {budget > 0 && <span className={cx('ml-2 text-xs font-medium', over ? 'text-danger' : 'text-fg-subtle')}>{Math.round(pctUsed)}%{over && ' · over'}</span>}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full bg-surface-3"
                          role="meter"
                          aria-label={`${l.category} budget used`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(Math.min(100, pctUsed))}
                        >
                          <div className={cx('h-2 rounded-full', over ? 'bg-danger' : 'bg-primary')} style={{ width: `${Math.min(100, pctUsed)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <dl className="grid grid-cols-3 gap-2 border-t border-line pt-4 text-sm">
                  <div><dt className="text-xs text-fg-muted">Budget</dt><dd className="font-medium tabular-nums">{money(r.totals.budget)}</dd></div>
                  <div><dt className="text-xs text-fg-muted">Spent</dt><dd className="font-medium tabular-nums">{money(r.totals.actual)}</dd></div>
                  <div>
                    <dt className="text-xs text-fg-muted">{variance < 0 ? 'Over budget' : 'Remaining'}</dt>
                    <dd className={cx('font-medium tabular-nums', variance < 0 ? 'text-danger' : 'text-success')}>{money(Math.abs(variance))}</dd>
                  </div>
                </dl>
              </div>
            );
          }}
        </DataState>
      </Card>
      {canEdit && <BudgetForm period={period} year={year!} month={month!} categories={report.data?.lines.map((l) => l.category) ?? []} onSaved={report.reload} />}
    </div>
  );
}

function BudgetForm({ period, year, month, categories, onSaved }: { period: string; year: number; month: number; categories: string[]; onSaved: () => void }) {
  const [form, setForm] = useState({ category: '', amount: '' });
  const save = useMutation(async () => {
    await api.put('/finance/budget', { category: form.category, amount: form.amount, year, month });
    setForm({ category: '', amount: '' });
    onSaved();
  }, { success: `Budget saved for ${monthLabel(period)}` });
  return (
    <Card title="Set a budget" description={`Applies to ${monthLabel(period)}. Saving an existing category replaces its amount.`} className="self-start">
      <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
        <Field label="Category" name="category" required>
          <Input list="budget-categories" maxLength={100} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </Field>
        <datalist id="budget-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <Field label="Monthly amount" name="amount" required>
          <Input type="number" inputMode="decimal" min="0" step="0.01" prefix={CURRENCY_SYMBOL} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Button type="submit" loading={save.pending} className="w-full">Save budget</Button>
      </Form>
    </Card>
  );
}

// ── Reports (P&L) ─────────────────────────────────────────────────────────────

function ReportsTab() {
  const summary = useApi<BISummary>('/bi/summary?months=12');
  return (
    <DataState state={summary} isEmpty={() => false} skeleton={<StatsSkeleton />}>
      {(s) => {
        const columns: Column<BISummary['months'][number]>[] = [
          { key: 'month', header: 'Month', primary: true, cell: (m) => <span className="font-medium">{monthLabel(m.month)}{isCurrentMonth(m.month) && <span className="ml-1.5 text-xs font-normal text-fg-subtle">to date</span>}</span> },
          { key: 'revenue', header: 'Revenue', numeric: true, cell: (m) => money(m.revenue) },
          { key: 'collected', header: 'Collected', numeric: true, cell: (m) => money(m.collected) },
          { key: 'expenses', header: 'Expenses', numeric: true, cell: (m) => money(m.expenses) },
          { key: 'payroll', header: 'Payroll', numeric: true, cell: (m) => money(m.payroll) },
          {
            key: 'net', header: 'Net profit', numeric: true,
            cell: (m) => <span className={cx('font-medium', toNumber(m.netProfit) < 0 && 'text-danger')}>{money(m.netProfit)}</span>,
          },
        ];
        const net = toNumber(s.totals.netProfit);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Revenue · 12 months" value={money(s.totals.revenue)} />
              <StatCard label="Expenses · 12 months" value={money(s.totals.expenses)} />
              <StatCard label="Payroll · 12 months" value={money(s.totals.payroll)} />
              <StatCard label="Net profit · 12 months" value={money(net)} hint={net >= 0 ? 'Profitable' : 'Loss'} tone={net >= 0 ? 'good' : 'bad'} />
            </div>
            <Card title="Profit & loss by month" flush>
              {s.months.length === 0 ? <EmptyState title="No data for the last 12 months" /> : (
                <DataTable caption="Profit and loss by month" columns={columns} rows={[...s.months].reverse()} rowKey={(m) => m.month} />
              )}
            </Card>
            <Alert tone="info">Revenue counts invoices that were sent, paid or overdue. Expenses exclude rejected claims; payroll is gross pay.</Alert>
          </div>
        );
      }}
    </DataState>
  );
}
