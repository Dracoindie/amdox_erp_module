'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Kanban, Mail, Phone, Plus, UserPlus, Users } from 'lucide-react';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Customer, Lead, LeadStage, SalesOrder, SalesOrderStatus } from '@repo/types';
import api, { apiErrorMessage } from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { useDebounced } from '../../../lib/useDebounced';
import { can } from '../../../lib/permissions';
import { CURRENCY_SYMBOL, date, money, moneyCompact, titleCase, todayISO, toNumber } from '../../../lib/format';
import {
  Badge, Button, Card, DataState, DataTable, Field, Form, FormActions, Input, Modal, PageHeader, Pagination, SearchInput,
  Select, Skeleton, TabPanel, Tabs, Textarea, cx, useConfirm, useTabParam, useToast, type Column,
} from '../../../components/ui';

const TABS = [
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'contacts', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Sales orders', icon: Briefcase },
] as const;

const STAGES: LeadStage[] = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export default function CRMPage() {
  const [tab, setTab] = useTabParam(TABS);
  return (
    <div className="space-y-6">
      <PageHeader title="CRM & Sales" description="Pipeline, customers and sales orders." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} label="Sales sections" />
      <TabPanel id={tab}>
        {tab === 'pipeline' && <PipelineTab />}
        {tab === 'contacts' && <ContactsTab />}
        {tab === 'orders' && <OrdersTab />}
      </TabPanel>
    </div>
  );
}

// ── Pipeline (drag a card, or use its stage menu, to change the stage) ─────────

function PipelineTab() {
  const user = useAuthUser();
  const toast = useToast();
  const editable = can(user, 'SALES');
  const remote = useApi<Lead[]>('/leads?limit=100');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Local copy for optimistic stage moves; resynced whenever the server list changes.
    if (remote.data) setLeads(remote.data);
  }, [remote.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const move = async (lead: Lead, stage: LeadStage) => {
    if (lead.stage === stage) return;
    const before = leads;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, stage } : l))); // optimistic
    try {
      await api.patch(`/leads/${lead.id}/stage`, { stage });
      toast.success(`${lead.customer.name} moved to ${titleCase(stage)}`);
    } catch (err) {
      setLeads(before);
      toast.error(apiErrorMessage(err, 'Could not move the lead'));
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const stage = e.over?.id as LeadStage | undefined;
    const lead = leads.find((l) => l.id === e.active.id);
    if (stage && lead) void move(lead, stage);
  };

  const open$ = leads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST');
  return (
    <Card
      title="Pipeline"
      description={remote.data ? `${open$.length} open deals · ${moneyCompact(open$.reduce((s, l) => s + toNumber(l.value), 0))}` : undefined}
      actions={editable && <Button icon={Plus} onClick={() => setOpen(true)}>New lead</Button>}
    >
      <DataState
        state={remote}
        skeleton={<div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-80 w-64 shrink-0 rounded-xl" />)}</div>}
        empty={{ icon: Kanban, title: 'No leads yet', action: editable ? <Button icon={Plus} onClick={() => setOpen(true)}>New lead</Button> : undefined }}
      >
        {() => (
          <>
            {editable && <p className="mb-3 text-xs text-fg-subtle">Drag a card to another stage, or use the stage menu on the card.</p>}
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={editable ? onDragEnd : undefined}>
              {/* Scrolls sideways inside the card; columns snap on touch screens */}
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5" tabIndex={0} aria-label="Pipeline stages, scroll horizontally">
                {STAGES.map((stage) => {
                  const items = leads.filter((l) => l.stage === stage);
                  return (
                    <StageColumn key={stage} stage={stage} total={items.reduce((s, l) => s + toNumber(l.value), 0)} count={items.length}>
                      {items.map((l) => <LeadCard key={l.id} lead={l} editable={editable} onMove={(s) => void move(l, s)} />)}
                    </StageColumn>
                  );
                })}
              </div>
            </DndContext>
          </>
        )}
      </DataState>
      <Modal title="New lead" open={open} onClose={() => setOpen(false)}>
        <LeadForm onDone={() => { setOpen(false); remote.reload(); }} onCancel={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

const STAGE_DOT: Record<LeadStage, string> = {
  PROSPECT: 'bg-fg-subtle', QUALIFIED: 'bg-info', PROPOSAL: 'bg-info', NEGOTIATION: 'bg-warning', WON: 'bg-success', LOST: 'bg-danger',
};

function StageColumn({ stage, total, count, children }: { stage: LeadStage; total: number; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${titleCase(stage)}: ${count} deals`}
      className={cx(
        'flex min-h-72 w-64 shrink-0 snap-start flex-col rounded-xl border p-2 transition-colors',
        isOver ? 'border-primary bg-primary-soft' : 'border-line bg-surface-2',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
        <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
          <span className={cx('h-2 w-2 rounded-full', STAGE_DOT[stage])} aria-hidden />
          {titleCase(stage)} <span className="font-normal text-fg-subtle">{count}</span>
        </h3>
        <span className="text-xs font-medium tabular-nums text-fg-muted">{moneyCompact(total)}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {children}
        {count === 0 && <p className="rounded-lg border border-dashed border-line-strong px-3 py-6 text-center text-xs text-fg-subtle">No deals</p>}
      </div>
    </section>
  );
}

function LeadCard({ lead, editable, onMove }: { lead: Lead; editable: boolean; onMove: (s: LeadStage) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, disabled: !editable });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cx(
        'rounded-lg border border-line bg-surface p-3 shadow-xs',
        isDragging && 'relative z-10 rotate-1 shadow-lg ring-2 ring-primary',
      )}
    >
      <div {...(editable ? { ...listeners, ...attributes, 'aria-roledescription': 'draggable deal' } : {})} className={cx(editable && 'cursor-grab touch-none active:cursor-grabbing')}>
        <p className="truncate text-sm font-medium text-fg">{lead.customer.name}</p>
        <p className="truncate text-xs text-fg-subtle">{lead.customer.company ?? '—'}</p>
        <p className="mt-2 text-sm font-semibold tabular-nums text-fg">{money(lead.value)}</p>
        {lead.expectedClose && <p className="text-xs text-fg-subtle">Close by {date(lead.expectedClose)}</p>}
      </div>
      {editable && (
        <select
          aria-label={`Stage of ${lead.customer.name}`}
          value={lead.stage}
          onChange={(e) => onMove(e.target.value as LeadStage)}
          className="mt-2 h-8 w-full rounded-md border border-line bg-surface-2 px-2 text-xs text-fg-muted focus:border-primary focus:outline-none"
        >
          {STAGES.map((s) => <option key={s} value={s}>Stage: {titleCase(s)}</option>)}
        </select>
      )}
    </article>
  );
}

function LeadForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const customers = useApi<Customer[]>('/customers?limit=100&sort=name&order=asc');
  const [form, setForm] = useState({ customerId: '', value: '', stage: 'PROSPECT', expectedClose: '', notes: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/leads', {
      customerId: form.customerId, value: form.value || '0', stage: form.stage,
      ...(form.expectedClose && { expectedClose: form.expectedClose }),
      ...(form.notes && { notes: form.notes }),
    });
    onDone();
  }, { success: 'Lead created' });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <Field label="Customer" name="customerId" required>
        <Select value={form.customerId} onChange={set('customerId')}>
          <option value="">{customers.loading ? 'Loading customers…' : 'Select a customer…'}</option>
          {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Deal value" name="value" optional>
          <Input type="number" inputMode="decimal" min="0" step="0.01" prefix={CURRENCY_SYMBOL} value={form.value} onChange={set('value')} />
        </Field>
        <Field label="Stage" name="stage">
          <Select value={form.stage} onChange={set('stage')}>
            {STAGES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Expected close" name="expectedClose" optional><Input type="date" min={todayISO()} value={form.expectedClose} onChange={set('expectedClose')} /></Field>
      <Field label="Notes" name="notes" optional><Textarea maxLength={5000} value={form.notes} onChange={set('notes')} /></Field>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Create lead</Button>
      </FormActions>
    </Form>
  );
}

// ── Customers ─────────────────────────────────────────────────────────────────

function ContactsTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'name', order: 'asc' as 'asc' | 'desc' });
  const q = useDebounced(search);
  const customers = useApi<Customer[]>(`/customers?${new URLSearchParams({ page: String(page), limit: '20', sort: sort.key, order: sort.order, ...(q && { search: q }) })}`);
  const canEdit = can(user, 'SALES');

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Name', primary: true, sortKey: 'name', cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'company', header: 'Company', sortKey: 'company', cell: (c) => c.company ?? '—' },
    {
      key: 'contact', header: 'Contact',
      cell: (c) => (
        <span className="block min-w-0 space-y-0.5 text-sm">
          {c.email && <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-1.5 text-fg hover:underline"><Mail className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden /> <span className="truncate">{c.email}</span></a>}
          {c.phone && <a href={`tel:${c.phone}`} className="flex min-w-0 items-center gap-1.5 text-fg hover:underline"><Phone className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden /> <span className="truncate">{c.phone}</span></a>}
          {!c.email && !c.phone && '—'}
        </span>
      ),
    },
    { key: 'since', header: 'Customer since', sortKey: 'createdAt', cell: (c) => date(c.createdAt), className: 'whitespace-nowrap' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card
        title="Customers"
        flush
        className={canEdit ? 'xl:col-span-2' : 'xl:col-span-3'}
        actions={<SearchInput label="Search name, company or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />}
      >
        <DataState state={customers} empty={{ icon: Users, title: q ? 'No customers match your search' : 'No customers yet' }}>
          {(rows) => (
            <DataTable
              caption="Customers"
              columns={columns}
              rows={rows}
              rowKey={(c) => c.id}
              sort={sort}
              onSortChange={(s) => { setSort(s); setPage(1); }}
              footer={<Pagination meta={customers.meta} onPage={setPage} noun="customers" />}
            />
          )}
        </DataState>
      </Card>
      {canEdit && <CustomerForm onSaved={customers.reload} />}
    </div>
  );
}

function CustomerForm({ onSaved }: { onSaved: () => void }) {
  const blank = { name: '', company: '', email: '', phone: '' };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/customers', {
      name: form.name,
      ...(form.company && { company: form.company }),
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
    });
    setForm(blank);
    onSaved();
  }, { success: 'Customer added' });
  return (
    <Card title="Add customer" className="self-start">
      <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
        <Field label="Name" name="name" required><Input autoComplete="off" value={form.name} onChange={set('name')} /></Field>
        <Field label="Company" name="company" optional><Input value={form.company} onChange={set('company')} /></Field>
        <Field label="Email" name="email" optional><Input type="email" inputMode="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone" name="phone" optional><Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Button type="submit" icon={UserPlus} loading={save.pending} className="w-full">Add customer</Button>
      </Form>
    </Card>
  );
}

// ── Sales orders ──────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<SalesOrderStatus, SalesOrderStatus[]>> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['FULFILLED', 'CANCELLED'],
};
const ACTION_LABEL: Partial<Record<SalesOrderStatus, string>> = { CONFIRMED: 'Confirm', FULFILLED: 'Mark fulfilled', CANCELLED: 'Cancel' };

function OrdersTab() {
  const user = useAuthUser();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState({ key: 'createdAt', order: 'desc' as 'asc' | 'desc' });
  const orders = useApi<SalesOrder[]>(`/sales-orders?page=${page}&limit=20&sort=${sort.key}&order=${sort.order}`);
  const canEdit = can(user, 'SALES');
  const move = useMutation(async (o: SalesOrder, status: SalesOrderStatus) => {
    await api.patch(`/sales-orders/${o.id}/status`, { status });
    orders.reload();
    return `${o.number} ${status === 'CANCELLED' ? 'cancelled' : titleCase(status).toLowerCase()}`;
  }, { success: (m) => m, errorToast: true });

  const act = async (o: SalesOrder, s: SalesOrderStatus) => {
    if (s === 'CANCELLED' && !(await confirm({
      title: `Cancel ${o.number}?`, message: `The ${money(o.total)} order for ${o.customer.name} will be cancelled. This can't be undone.`,
      confirmLabel: 'Cancel order', tone: 'danger',
    }))) return;
    await move.run(o, s);
  };

  const columns: Column<SalesOrder>[] = [
    { key: 'number', header: 'Order', primary: true, sortKey: 'number', cell: (o) => <span className="font-mono text-xs font-medium">{o.number}</span> },
    { key: 'customer', header: 'Customer', cell: (o) => o.customer.name },
    { key: 'date', header: 'Date', sortKey: 'createdAt', cell: (o) => date(o.createdAt), className: 'whitespace-nowrap' },
    { key: 'total', header: 'Total', numeric: true, sortKey: 'total', cell: (o) => <span className="font-medium">{money(o.total)}</span> },
    { key: 'status', header: 'Status', cell: (o) => <Badge>{o.status}</Badge> },
    ...(canEdit ? [{
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right' as const, mobileLabel: '',
      cell: (o: SalesOrder) => (
        <div className="flex justify-end gap-2">
          {NEXT_STATUS[o.status]?.slice().reverse().map((s) => (
            <Button key={s} size="sm" variant={s === 'CANCELLED' ? 'ghost' : 'primary'} disabled={move.pending} onClick={() => void act(o, s)}>
              {ACTION_LABEL[s]}
            </Button>
          ))}
        </div>
      ),
    }] : []),
  ];

  return (
    <Card title="Sales orders" flush actions={canEdit && <Button icon={Plus} onClick={() => setOpen(true)}>New order</Button>}>
      <DataState state={orders} empty={{ icon: Briefcase, title: 'No sales orders yet', action: canEdit ? <Button icon={Plus} onClick={() => setOpen(true)}>New order</Button> : undefined }}>
        {(rows) => (
          <DataTable
            caption="Sales orders"
            columns={columns}
            rows={rows}
            rowKey={(o) => o.id}
            sort={sort}
            onSortChange={(s) => { setSort(s); setPage(1); }}
            footer={<Pagination meta={orders.meta} onPage={setPage} noun="orders" />}
          />
        )}
      </DataState>
      <Modal title="New sales order" open={open} onClose={() => setOpen(false)}>
        <OrderForm onDone={() => { setOpen(false); orders.reload(); }} onCancel={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

function OrderForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const customers = useApi<Customer[]>('/customers?limit=100&sort=name&order=asc');
  const [form, setForm] = useState({ customerId: '', total: '', description: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/sales-orders', { customerId: form.customerId, total: form.total, ...(form.description && { description: form.description }) });
    onDone();
  }, { success: 'Sales order created' });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <Field label="Customer" name="customerId" required>
        <Select value={form.customerId} onChange={set('customerId')}>
          <option value="">{customers.loading ? 'Loading customers…' : 'Select a customer…'}</option>
          {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </Select>
      </Field>
      <Field label="Order total" name="total" required>
        <Input type="number" inputMode="decimal" min="0.01" step="0.01" prefix={CURRENCY_SYMBOL} value={form.total} onChange={set('total')} />
      </Field>
      <Field label="Description" name="description" optional><Textarea maxLength={1000} value={form.description} onChange={set('description')} /></Field>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Create order</Button>
      </FormActions>
    </Form>
  );
}
