'use client';

import { useMemo, useState } from 'react';
import { Package, ShoppingCart, Truck, BrainCircuit, Plus, ArrowRightLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AIForecastResponse, Product, PurchaseOrder, StockMovementType, Supplier, Warehouse } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { can } from '../../../lib/permissions';
import { date, money, titleCase } from '../../../lib/format';
import {
  Badge, Button, Card, DataState, EmptyState, ErrorState, Field, InlineError, Input, Modal, PageHeader, Pager, Select, Spinner, StatCard, Table, Tabs, Td,
} from '../../../components/ui';

type Tab = 'inventory' | 'orders' | 'vendors' | 'ai';
const TABS = [
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'vendors', label: 'Vendors', icon: Truck },
  { id: 'ai', label: 'AI Forecast', icon: BrainCircuit },
] as const;

const totalStock = (p: Product) => p.stockLevels.reduce((s, l) => s + l.quantity, 0);

export default function SCMPage() {
  const [tab, setTab] = useState<Tab>('inventory');
  return (
    <div className="space-y-6">
      <PageHeader title="Supply Chain" subtitle="Stock levels, purchasing, vendors and demand forecasting" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'vendors' && <VendorsTab />}
      {tab === 'ai' && <ForecastTab />}
    </div>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

function InventoryTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const q = new URLSearchParams({ page: String(page), limit: '20', sort: 'sku', order: 'asc', ...(search && { search }) });
  const products = useApi<Product[]>(`/inventory/products?${q}`);
  const low = products.data?.filter((p) => totalStock(p) <= p.reorderLevel) ?? [];
  const value = products.data?.reduce((s, p) => s + totalStock(p) * Number(p.unitPrice), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="SKUs (this page)" value={products.data?.length ?? '—'} />
        <StatCard label="Stock value (this page)" value={money(value)} tone="brand" />
        <StatCard label="Below reorder level" value={low.length} hint={low.map((p) => p.sku).join(', ') || 'None'} tone={low.length ? 'bad' : 'good'} />
      </div>
      <Card
        title="Products"
        actions={
          <div className="flex gap-2">
            <Input placeholder="Search SKU or name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-56" />
            {can(user, 'INVENTORY') && (
              <>
                <Button variant="secondary" onClick={() => setMoveOpen(true)}><ArrowRightLeft className="h-4 w-4" /> Stock movement</Button>
                <Button onClick={() => setProductOpen(true)}><Plus className="h-4 w-4" /> Product</Button>
              </>
            )}
          </div>
        }
      >
        <DataState state={products} empty={{ title: 'No products found' }}>
          {(rows) => (
            <>
              <Table head={['SKU', 'Name', 'Category', 'Unit price', 'In stock', 'Reorder at', 'Status']}>
                {rows.map((p) => {
                  const qty = totalStock(p);
                  return (
                    <tr key={p.id}>
                      <Td className="font-mono text-xs">{p.sku}</Td>
                      <Td className="font-semibold">{p.name}</Td>
                      <Td>{p.category ?? '—'}</Td>
                      <Td>{money(p.unitPrice)}</Td>
                      <Td>
                        <span className="font-semibold">{qty}</span>
                        {p.stockLevels.length > 1 && <span className="block text-xs text-slate-400">{p.stockLevels.map((l) => `${l.warehouse.name}: ${l.quantity}`).join(' · ')}</span>}
                      </Td>
                      <Td>{p.reorderLevel}</Td>
                      <Td>{qty <= p.reorderLevel ? <Badge tone="bad">Low stock</Badge> : <Badge tone="good">OK</Badge>}</Td>
                    </tr>
                  );
                })}
              </Table>
              <Pager meta={products.meta} onPage={setPage} />
            </>
          )}
        </DataState>
      </Card>
      <MovementModal open={moveOpen} onClose={() => setMoveOpen(false)} onSaved={products.reload} />
      <ProductModal open={productOpen} onClose={() => setProductOpen(false)} onSaved={products.reload} />
    </div>
  );
}

function MovementModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const products = useApi<Product[]>(open ? '/inventory/products?limit=100&sort=sku&order=asc' : null);
  const warehouses = useApi<Warehouse[]>(open ? '/inventory/warehouses' : null);
  const blank = { productId: '', warehouseId: '', type: 'OUT' as StockMovementType, quantity: '', note: '' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/inventory/stock/movement', {
      productId: form.productId, warehouseId: form.warehouseId, type: form.type,
      quantity: Number(form.quantity), ...(form.note && { note: form.note }),
    });
    onSaved();
    onClose();
    setForm(blank);
  });
  return (
    <Modal title="Record stock movement" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <Field label="Product">
          <Select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select…</option>
            {products.data?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name} ({totalStock(p)} in stock)</option>)}
          </Select>
        </Field>
        <Field label="Warehouse">
          <Select required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
            <option value="">Select…</option>
            {warehouses.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StockMovementType })}>
              <option value="IN">IN (receive)</option>
              <option value="OUT">OUT (issue)</option>
              <option value="ADJUSTMENT">Adjustment (±)</option>
            </Select>
          </Field>
          <Field label={form.type === 'ADJUSTMENT' ? 'Quantity (+/−)' : 'Quantity'}>
            <Input required type="number" step="1" min={form.type === 'ADJUSTMENT' ? undefined : 1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
        </div>
        <Field label="Note"><Input maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Saving…' : 'Record'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ProductModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const blank = { sku: '', name: '', category: '', unitPrice: '', reorderLevel: '10' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/inventory/products', {
      sku: form.sku, name: form.name, unitPrice: form.unitPrice, reorderLevel: Number(form.reorderLevel),
      ...(form.category && { category: form.category }),
    });
    onSaved();
    onClose();
    setForm(blank);
  });
  return (
    <Modal title="New product" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU"><Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        </div>
        <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit price"><Input required type="number" min="0.01" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
          <Field label="Reorder level"><Input required type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
        </div>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Saving…' : 'Create product'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Purchase orders ───────────────────────────────────────────────────────────

function OrdersTab() {
  const user = useAuthUser();
  const orders = useApi<PurchaseOrder[]>('/purchases/orders');
  const [open, setOpen] = useState(false);
  const act = useMutation(async (id: string, action: 'approve' | 'receive' | 'cancel') => {
    await api.patch(`/purchases/orders/${id}/${action}`, {});
    orders.reload();
  });
  const canAct = can(user, 'INVENTORY');
  return (
    <Card title="Purchase orders" actions={canAct && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New PO</Button>}>
      <InlineError message={act.error} />
      <DataState state={orders} empty={{ title: 'No purchase orders yet' }}>
        {(rows) => (
          <Table head={['Created', 'Supplier', 'Description', 'Total', 'Status', '']}>
            {rows.map((po) => (
              <tr key={po.id}>
                <Td>{date(po.createdAt)}</Td>
                <Td className="font-semibold">{po.supplier.name}</Td>
                <Td className="text-slate-500">{po.description ?? '—'}</Td>
                <Td className="font-semibold">{money(po.total)}</Td>
                <Td><Badge>{po.status}</Badge></Td>
                <Td>
                  {canAct && (
                    <div className="flex gap-1">
                      {po.status === 'DRAFT' && <Button size="sm" disabled={act.pending} onClick={() => void act.run(po.id, 'approve')}>Approve</Button>}
                      {po.status === 'ISSUED' && <Button size="sm" disabled={act.pending} onClick={() => void act.run(po.id, 'receive')}>Mark received</Button>}
                      {(po.status === 'DRAFT' || po.status === 'ISSUED') && <Button size="sm" variant="secondary" disabled={act.pending} onClick={() => void act.run(po.id, 'cancel')}>Cancel</Button>}
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </DataState>
      <POModal open={open} onClose={() => setOpen(false)} onSaved={orders.reload} />
    </Card>
  );
}

function POModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const suppliers = useApi<Supplier[]>(open ? '/purchases/suppliers' : null);
  const blank = { supplierId: '', description: '', subtotal: '', tax: '' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/purchases/orders', {
      supplierId: form.supplierId, subtotal: form.subtotal, tax: form.tax || '0',
      ...(form.description && { description: form.description }),
    });
    onSaved();
    onClose();
    setForm(blank);
  });
  return (
    <Modal title="New purchase order" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <Field label="Supplier">
          <Select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">Select…</option>
            {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Description"><Input maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subtotal"><Input required type="number" min="0" step="0.01" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></Field>
          <Field label="Tax"><Input type="number" min="0" step="0.01" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></Field>
        </div>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Saving…' : 'Create draft'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────────

function VendorsTab() {
  const user = useAuthUser();
  const suppliers = useApi<Supplier[]>('/purchases/suppliers');
  const blank = { name: '', email: '', phone: '', leadTimeDays: '', paymentTerms: '' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/purchases/suppliers', {
      name: form.name,
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
      ...(form.leadTimeDays && { leadTimeDays: Number(form.leadTimeDays) }),
      ...(form.paymentTerms && { paymentTerms: form.paymentTerms }),
    });
    setForm(blank);
    suppliers.reload();
  });
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card title="Suppliers" className="lg:col-span-2">
        <DataState state={suppliers} empty={{ title: 'No suppliers yet' }}>
          {(rows) => (
            <Table head={['Name', 'Email', 'Phone', 'Lead time', 'Terms']}>
              {rows.map((s) => (
                <tr key={s.id}>
                  <Td className="font-semibold">{s.name}</Td>
                  <Td>{s.email ?? '—'}</Td>
                  <Td>{s.phone ?? '—'}</Td>
                  <Td>{s.leadTimeDays != null ? `${s.leadTimeDays} days` : '—'}</Td>
                  <Td>{s.paymentTerms ?? '—'}</Td>
                </tr>
              ))}
            </Table>
          )}
        </DataState>
      </Card>
      {can(user, 'INVENTORY') && (
        <Card title="Add supplier">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lead time (days)"><Input type="number" min="0" max="365" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} /></Field>
              <Field label="Payment terms"><Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></Field>
            </div>
            <InlineError message={save.error} />
            <Button type="submit" disabled={save.pending} className="w-full">{save.pending ? 'Saving…' : 'Add supplier'}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}

// ── AI forecast ───────────────────────────────────────────────────────────────

function ForecastTab() {
  const user = useAuthUser();
  const [result, setResult] = useState<AIForecastResponse | null>(null);
  const [selectedSku, setSelectedSku] = useState('');
  const run = useMutation(async () => {
    const res = await api.post('/inventory/forecast/demand', { horizonDays: 30 });
    const data = res.data.data as AIForecastResponse;
    setResult(data);
    setSelectedSku((s) => (data.predictions.some((p) => p.sku === s) ? s : data.predictions[0]?.sku ?? ''));
  });
  const selected = useMemo(() => result?.predictions.find((p) => p.sku === selectedSku), [result, selectedSku]);

  if (!can(user, 'INVENTORY')) {
    return <Card><ErrorState status={403} message="" /></Card>;
  }

  return (
    <div className="space-y-6">
      <Card
        title="30-day demand forecast"
        actions={<Button onClick={() => void run.run()} disabled={run.pending}><BrainCircuit className="h-4 w-4" /> {run.pending ? 'Forecasting…' : result ? 'Refresh forecast' : 'Run forecast'}</Button>}
      >
        <p className="text-sm text-slate-500">
          Fits a model per SKU on the last 180 days of stock issued (OUT movements). Prophet is used when there is enough history, otherwise a damped-trend Holt model.
        </p>
        <div className="mt-2"><InlineError message={run.error} /></div>
      </Card>

      {run.pending && !result && <Spinner label="Fitting models…" />}
      {result && result.predictions.length === 0 && <Card><EmptyState title="No active products to forecast" /></Card>}
      {result && result.predictions.length > 0 && (
        <>
          <Card title="Predictions">
            <Table head={['SKU', 'Product', 'In stock', 'Predicted demand', 'Risk', 'Reorder', 'Model', 'Confidence']}>
              {result.predictions.map((p) => (
                <tr key={p.sku} className={p.sku === selectedSku ? 'bg-orange-50/50 dark:bg-slate-700/40' : undefined} onClick={() => setSelectedSku(p.sku)} style={{ cursor: 'pointer' }}>
                  <Td className="font-mono text-xs">{p.sku}</Td>
                  <Td>{p.name ?? '—'}</Td>
                  <Td>{p.currentStock}</Td>
                  <Td className="font-semibold">{p.predictedDemand}</Td>
                  <Td><Badge>{p.stockoutRisk}</Badge></Td>
                  <Td>{p.recommendedReorder || '—'}</Td>
                  <Td>{titleCase(p.model)}</Td>
                  <Td>{Math.round(p.confidenceScore * 100)}%</Td>
                </tr>
              ))}
            </Table>
          </Card>
          {selected && (
            <Card title={`${selected.sku} · actual vs forecast`}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selected.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={4} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" name="Issued (actual)" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line type="monotone" dataKey="pred" name="Forecast" stroke="#ff5a00" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
