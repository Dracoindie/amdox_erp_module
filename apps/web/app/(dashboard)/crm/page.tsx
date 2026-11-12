'use client';

import { useEffect, useState } from 'react';
import { Kanban, Users, Briefcase, Plus, Mail, Phone } from 'lucide-react';
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Customer, Lead, LeadStage, SalesOrder, SalesOrderStatus } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { can } from '../../../lib/permissions';
import { date, money, moneyCompact, titleCase, toNumber } from '../../../lib/format';
import {
  Badge, Button, Card, DataState, Field, InlineError, Input, Modal, PageHeader, Pager, Select, Table, Tabs, Td, cx,
} from '../../../components/ui';

type Tab = 'pipeline' | 'contacts' | 'orders';
const TABS = [
  { id: 'pipeline', label: 'Sales Pipeline', icon: Kanban },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'orders', label: 'Sales Orders', icon: Briefcase },
] as const;

const STAGES: LeadStage[] = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export default function CRMPage() {
  const [tab, setTab] = useState<Tab>('pipeline');
  return (
    <div className="space-y-6">
      <PageHeader title="CRM & Sales" subtitle="Pipeline, customers and sales orders" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'orders' && <OrdersTab />}
    </div>
  );
}

// ── Pipeline (drag a card to change its stage) ────────────────────────────────

function PipelineTab() {
  const user = useAuthUser();
  const editable = can(user, 'SALES');
  const remote = useApi<Lead[]>('/leads?limit=100');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (remote.data) setLeads(remote.data);
  }, [remote.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const stage = e.over?.id as LeadStage | undefined;
    const lead = leads.find((l) => l.id === e.active.id);
    if (!stage || !lead || lead.stage === stage) return;
    const before = leads;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, stage } : l))); // optimistic
    setError(null);
    try {
      await api.patch(`/leads/${lead.id}/stage`, { stage });
    } catch (err: any) {
      setLeads(before);
      setError(err?.response?.data?.message ?? 'Could not move the lead');
    }
  };

  return (
    <Card title="Pipeline" actions={editable && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New lead</Button>}>
      <InlineError message={error} />
      <DataState state={remote} empty={{ title: 'No leads yet' }}>
        {() => (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={editable ? onDragEnd : undefined}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STAGES.map((stage) => {
                const items = leads.filter((l) => l.stage === stage);
                return (
                  <StageColumn key={stage} stage={stage} total={items.reduce((s, l) => s + toNumber(l.value), 0)} count={items.length}>
                    {items.map((l) => <LeadCard key={l.id} lead={l} draggable={editable} />)}
                  </StageColumn>
                );
              })}
            </div>
          </DndContext>
        )}
      </DataState>
      <LeadModal open={open} onClose={() => setOpen(false)} onSaved={remote.reload} />
    </Card>
  );
}

function StageColumn({ stage, total, count, children }: { stage: LeadStage; total: number; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={cx('flex min-h-[320px] min-w-[220px] flex-1 flex-col gap-2 rounded-2xl p-3', isOver ? 'bg-orange-50 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-900/50')}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{titleCase(stage)} <span className="text-slate-400">· {count}</span></h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{moneyCompact(total)}</span>
      </div>
      {children}
    </div>
  );
}

function LeadCard({ lead, draggable }: { lead: Lead; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cx('rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800', draggable && 'cursor-grab', isDragging && 'opacity-60 shadow-lg')}
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{lead.customer.name}</p>
      <p className="text-xs text-slate-500">{lead.customer.company ?? '—'}</p>
      <p className="mt-2 text-sm font-bold text-[#ff5a00]">{money(lead.value)}</p>
      {lead.expectedClose && <p className="text-[11px] text-slate-400">Close by {date(lead.expectedClose)}</p>}
    </div>
  );
}

function LeadModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const customers = useApi<Customer[]>(open ? '/customers?limit=100&sort=name&order=asc' : null);
  const blank = { customerId: '', value: '', stage: 'PROSPECT', expectedClose: '', notes: '' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/leads', {
      customerId: form.customerId, value: form.value || '0', stage: form.stage,
      ...(form.expectedClose && { expectedClose: form.expectedClose }),
      ...(form.notes && { notes: form.notes }),
    });
    onSaved();
    onClose();
    setForm(blank);
  });
  return (
    <Modal title="New lead" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <Field label="Customer">
          <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">Select…</option>
            {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value"><Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          <Field label="Stage">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Expected close"><Input type="date" value={form.expectedClose} onChange={(e) => setForm({ ...form, expectedClose: e.target.value })} /></Field>
        <Field label="Notes"><Input maxLength={5000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Saving…' : 'Create lead'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────

function ContactsTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = new URLSearchParams({ page: String(page), limit: '20', sort: 'name', order: 'asc', ...(search && { search }) });
  const customers = useApi<Customer[]>(`/customers?${q}`);
  const blank = { name: '', company: '', email: '', phone: '' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/customers', {
      name: form.name,
      ...(form.company && { company: form.company }),
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
    });
    setForm(blank);
    customers.reload();
  });
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card
        title="Customers"
        actions={<Input placeholder="Search name, company, email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-60" />}
        className="lg:col-span-2"
      >
        <DataState state={customers} empty={{ title: 'No customers found' }}>
          {(rows) => (
            <>
              <Table head={['Name', 'Company', 'Contact', 'Since']}>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-semibold">{c.name}</Td>
                    <Td>{c.company ?? '—'}</Td>
                    <Td className="text-xs">
                      {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</div>}
                      {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
                      {!c.email && !c.phone && '—'}
                    </Td>
                    <Td>{date(c.createdAt)}</Td>
                  </tr>
                ))}
              </Table>
              <Pager meta={customers.meta} onPage={setPage} />
            </>
          )}
        </DataState>
      </Card>
      {can(user, 'SALES') && (
        <Card title="Add customer">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <InlineError message={save.error} />
            <Button type="submit" disabled={save.pending} className="w-full">{save.pending ? 'Saving…' : 'Add customer'}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── Sales orders ──────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<SalesOrderStatus, SalesOrderStatus[]>> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['FULFILLED', 'CANCELLED'],
};

function OrdersTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const orders = useApi<SalesOrder[]>(`/sales-orders?page=${page}&limit=20`);
  const move = useMutation(async (id: string, status: SalesOrderStatus) => {
    await api.patch(`/sales-orders/${id}/status`, { status });
    orders.reload();
  });
  return (
    <Card title="Sales orders" actions={can(user, 'SALES') && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New order</Button>}>
      <InlineError message={move.error} />
      <DataState state={orders} empty={{ title: 'No sales orders yet' }}>
        {(rows) => (
          <>
            <Table head={['Number', 'Customer', 'Date', 'Total', 'Status', '']}>
              {rows.map((o) => (
                <tr key={o.id}>
                  <Td className="font-mono text-xs">{o.number}</Td>
                  <Td className="font-semibold">{o.customer.name}</Td>
                  <Td>{date(o.createdAt)}</Td>
                  <Td className="font-semibold">{money(o.total)}</Td>
                  <Td><Badge>{o.status}</Badge></Td>
                  <Td>
                    {can(user, 'SALES') && (
                      <div className="flex gap-1">
                        {NEXT_STATUS[o.status]?.map((s) => (
                          <Button key={s} size="sm" variant={s === 'CANCELLED' ? 'secondary' : 'primary'} disabled={move.pending} onClick={() => void move.run(o.id, s)}>
                            {s === 'CONFIRMED' ? 'Confirm' : s === 'FULFILLED' ? 'Fulfil' : 'Cancel'}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager meta={orders.meta} onPage={setPage} />
          </>
        )}
      </DataState>
      <OrderModal open={open} onClose={() => setOpen(false)} onSaved={orders.reload} />
    </Card>
  );
}

function OrderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const customers = useApi<Customer[]>(open ? '/customers?limit=100&sort=name&order=asc' : null);
  const blank = { customerId: '', total: '', description: '' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/sales-orders', { customerId: form.customerId, total: form.total, ...(form.description && { description: form.description }) });
    onSaved();
    onClose();
    setForm(blank);
  });
  return (
    <Modal title="New sales order" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <Field label="Customer">
          <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">Select…</option>
            {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Total"><Input required type="number" min="0.01" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></Field>
        <Field label="Description"><Input maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Saving…' : 'Create order'}</Button>
        </div>
      </form>
    </Modal>
  );
}
