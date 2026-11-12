'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, BrainCircuit, Package, Plus, ShoppingCart, Truck } from 'lucide-react';
import type { AIForecastResponse, Product, PurchaseOrder, StockMovementType, Supplier, Warehouse } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { useDebounced } from '../../../lib/useDebounced';
import { can, canRead } from '../../../lib/permissions';
import { CURRENCY_SYMBOL, date, money, num, titleCase } from '../../../lib/format';
import { ChartLegend, LineTrend, SLOT } from '../../../components/charts';
import {
  Alert, Badge, BlockSkeleton, Button, Card, DataState, DataTable, EmptyState, Field, Form, FormActions, Input, Modal,
  PageHeader, Pagination, SearchInput, Select, StatCard, TabPanel, Tabs, Textarea, useConfirm, useTabParam,
  type Column, type SortState,
} from '../../../components/ui';

const totalStock = (p: Product) => p.stockLevels.reduce((s, l) => s + l.quantity, 0);

export default function SCMPage() {
  const user = useAuthUser();
  const tabs = [
    { id: 'inventory', label: 'Inventory', icon: Package, hidden: !canRead(user, 'INVENTORY') },
    { id: 'orders', label: 'Purchase orders', icon: ShoppingCart, hidden: !canRead(user, 'PURCHASING') },
    { id: 'vendors', label: 'Vendors', icon: Truck, hidden: !canRead(user, 'PURCHASING') },
    // The forecast endpoint is restricted to inventory roles: hide rather than show a 403
    { id: 'ai', label: 'Demand forecast', icon: BrainCircuit, hidden: !can(user, 'INVENTORY') },
  ] as const;
  const [tab, setTab] = useTabParam(tabs);
  return (
    <div className="space-y-6">
      <PageHeader title="Supply Chain" description="Stock levels, purchasing, vendors and demand forecasting." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Supply chain sections" />
      <TabPanel id={tab}>
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'vendors' && <VendorsTab />}
        {tab === 'ai' && <ForecastTab />}
      </TabPanel>
    </div>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

function InventoryTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'sku', order: 'asc' });
  const [moveOpen, setMoveOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const q = useDebounced(search);
  const params = new URLSearchParams({ page: String(page), limit: '20', sort: sort.key, order: sort.order, ...(q && { search: q }) });
  const products = useApi<Product[]>(`/inventory/products?${params}`);
  const canEdit = can(user, 'INVENTORY');
  const low = products.data?.filter((p) => totalStock(p) <= p.reorderLevel) ?? [];
  const value = products.data?.reduce((s, p) => s + totalStock(p) * Number(p.unitPrice), 0) ?? 0;

  const columns: Column<Product>[] = [
    {
      key: 'name', header: 'Product', primary: true, sortKey: 'name',
      cell: (p) => <><span className="block font-medium">{p.name}</span><span className="block font-mono text-xs text-fg-subtle">{p.sku}</span></>,
    },
    { key: 'category', header: 'Category', sortKey: 'category', cell: (p) => p.category ?? '—' },
    { key: 'price', header: 'Unit price', numeric: true, sortKey: 'unitPrice', cell: (p) => money(p.unitPrice) },
    {
      key: 'stock', header: 'In stock', numeric: true,
      cell: (p) => (
        <span title={p.stockLevels.map((l) => `${l.warehouse.name}: ${l.quantity}`).join('\n')}>
          <span className="font-medium">{num(totalStock(p))}</span>
          {p.stockLevels.length > 1 && <span className="block text-xs text-fg-subtle">{p.stockLevels.length} warehouses</span>}
        </span>
      ),
    },
    { key: 'reorder', header: 'Reorder at', numeric: true, cell: (p) => num(p.reorderLevel) },
    { key: 'status', header: 'Status', cell: (p) => (totalStock(p) <= p.reorderLevel ? <Badge tone="bad">Low stock</Badge> : <Badge tone="good">In stock</Badge>) },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Products (this page)" value={products.data ? num(products.data.length) : '—'} hint={products.meta ? `${products.meta.total} in catalogue` : undefined} />
        <StatCard label="Stock value (this page)" value={money(value)} hint="Quantity × unit price" />
        <StatCard
          label="Below reorder level"
          value={num(low.length)}
          hint={low.length ? low.map((p) => p.sku).join(', ') : 'Nothing to reorder'}
          tone={low.length ? 'bad' : 'good'}
        />
      </div>
      <Card
        title="Products"
        flush
        actions={
          <>
            <SearchInput label="Search SKU or name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            {canEdit && (
              <>
                <Button variant="secondary" icon={ArrowRightLeft} onClick={() => setMoveOpen(true)}>Record movement</Button>
                <Button icon={Plus} onClick={() => setProductOpen(true)}>New product</Button>
              </>
            )}
          </>
        }
      >
        <DataState
          state={products}
          empty={{
            icon: Package,
            title: q ? 'No products match your search' : 'No products yet',
            action: !q && canEdit ? <Button icon={Plus} onClick={() => setProductOpen(true)}>New product</Button> : undefined,
          }}
        >
          {(rows) => (
            <DataTable
              caption="Products"
              columns={columns}
              rows={rows}
              rowKey={(p) => p.id}
              sort={sort}
              onSortChange={(s) => { setSort(s); setPage(1); }}
              footer={<Pagination meta={products.meta} onPage={setPage} noun="products" />}
            />
          )}
        </DataState>
      </Card>
      <Modal title="Record stock movement" description="Receive, issue or correct stock in one warehouse." open={moveOpen} onClose={() => setMoveOpen(false)}>
        <MovementForm onDone={() => { setMoveOpen(false); products.reload(); }} onCancel={() => setMoveOpen(false)} />
      </Modal>
      <Modal title="New product" open={productOpen} onClose={() => setProductOpen(false)}>
        <ProductForm onDone={() => { setProductOpen(false); products.reload(); }} onCancel={() => setProductOpen(false)} />
      </Modal>
    </>
  );
}

function MovementForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const products = useApi<Product[]>('/inventory/products?limit=100&sort=sku&order=asc');
  const warehouses = useApi<Warehouse[]>('/inventory/warehouses');
  const [form, setForm] = useState({ productId: '', warehouseId: '', type: 'OUT' as StockMovementType, quantity: '', note: '' });
  const product = products.data?.find((p) => p.id === form.productId);
  const warehouseName = warehouses.data?.find((w) => w.id === form.warehouseId)?.name;
  const inWarehouse = warehouseName ? product?.stockLevels.find((l) => l.warehouse.name === warehouseName)?.quantity ?? (product ? 0 : undefined) : undefined;
  const save = useMutation(async () => {
    await api.post('/inventory/stock/movement', {
      productId: form.productId, warehouseId: form.warehouseId, type: form.type,
      quantity: Number(form.quantity), ...(form.note && { note: form.note }),
    });
    onDone();
  }, { success: 'Stock movement recorded' });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <Field label="Product" name="productId" required>
        <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
          <option value="">{products.loading ? 'Loading products…' : 'Select a product…'}</option>
          {products.data?.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
        </Select>
      </Field>
      <Field label="Warehouse" name="warehouseId" required hint={inWarehouse !== undefined ? `${inWarehouse} currently in this warehouse` : undefined}>
        <Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
          <option value="">Select a warehouse…</option>
          {warehouses.data?.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Movement" name="type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StockMovementType })}>
            <option value="IN">Receive (in)</option>
            <option value="OUT">Issue (out)</option>
            <option value="ADJUSTMENT">Adjustment (±)</option>
          </Select>
        </Field>
        <Field label="Quantity" name="quantity" required hint={form.type === 'ADJUSTMENT' ? 'Negative to reduce stock' : undefined}>
          <Input type="number" inputMode="numeric" step="1" min={form.type === 'ADJUSTMENT' ? undefined : 1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </Field>
      </div>
      <Field label="Note" name="note" optional><Textarea maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Record movement</Button>
      </FormActions>
    </Form>
  );
}

function ProductForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ sku: '', name: '', category: '', unitPrice: '', reorderLevel: '10' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/inventory/products', {
      sku: form.sku, name: form.name, unitPrice: form.unitPrice, reorderLevel: Number(form.reorderLevel),
      ...(form.category && { category: form.category }),
    });
    onDone();
  }, { success: `Product ${form.sku} created` });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="SKU" name="sku" required><Input autoCapitalize="characters" value={form.sku} onChange={set('sku')} placeholder="SKU-1010" /></Field>
        <Field label="Category" name="category" optional><Input value={form.category} onChange={set('category')} /></Field>
      </div>
      <Field label="Name" name="name" required><Input value={form.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Unit price" name="unitPrice" required>
          <Input type="number" inputMode="decimal" min="0.01" step="0.01" prefix={CURRENCY_SYMBOL} value={form.unitPrice} onChange={set('unitPrice')} />
        </Field>
        <Field label="Reorder level" name="reorderLevel" required hint="Alert when stock falls to this">
          <Input type="number" inputMode="numeric" min="0" step="1" value={form.reorderLevel} onChange={set('reorderLevel')} />
        </Field>
      </div>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Create product</Button>
      </FormActions>
    </Form>
  );
}

// ── Purchase orders ───────────────────────────────────────────────────────────

function OrdersTab() {
  const user = useAuthUser();
  const confirm = useConfirm();
  const orders = useApi<PurchaseOrder[]>('/purchases/orders');
  const [open, setOpen] = useState(false);
  const canAct = can(user, 'INVENTORY');
  const act = useMutation(async (po: PurchaseOrder, action: 'approve' | 'receive' | 'cancel') => {
    await api.patch(`/purchases/orders/${po.id}/${action}`, {});
    orders.reload();
    return { approve: 'Purchase order approved', receive: 'Purchase order marked as received', cancel: 'Purchase order cancelled' }[action];
  }, { success: (m) => m, errorToast: true });

  const cancel = async (po: PurchaseOrder) => {
    const ok = await confirm({
      title: 'Cancel this purchase order?',
      message: `The ${money(po.total)} order to ${po.supplier.name} will be cancelled. This can't be undone.`,
      confirmLabel: 'Cancel order',
      tone: 'danger',
    });
    if (ok) await act.run(po, 'cancel');
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'supplier', header: 'Supplier', primary: true, sortValue: (p) => p.supplier.name, cell: (p) => <span className="font-medium">{p.supplier.name}</span> },
    { key: 'created', header: 'Created', sortValue: (p) => p.createdAt, cell: (p) => date(p.createdAt), className: 'whitespace-nowrap' },
    { key: 'description', header: 'Description', cell: (p) => <span className="text-fg-muted">{p.description ?? '—'}</span> },
    { key: 'total', header: 'Total', numeric: true, sortValue: (p) => Number(p.total), cell: (p) => <span className="font-medium">{money(p.total)}</span> },
    { key: 'status', header: 'Status', sortValue: (p) => p.status, cell: (p) => <Badge>{p.status}</Badge> },
    ...(canAct ? [{
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right' as const, mobileLabel: '',
      cell: (p: PurchaseOrder) => (
        <div className="flex justify-end gap-2">
          {(p.status === 'DRAFT' || p.status === 'ISSUED') && <Button size="sm" variant="ghost" disabled={act.pending} onClick={() => void cancel(p)}>Cancel</Button>}
          {p.status === 'DRAFT' && <Button size="sm" disabled={act.pending} onClick={() => void act.run(p, 'approve')}>Approve</Button>}
          {p.status === 'ISSUED' && <Button size="sm" disabled={act.pending} onClick={() => void act.run(p, 'receive')}>Mark received</Button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <Card title="Purchase orders" flush actions={canAct && <Button icon={Plus} onClick={() => setOpen(true)}>New purchase order</Button>}>
      <DataState
        state={orders}
        empty={{ icon: ShoppingCart, title: 'No purchase orders yet', action: canAct ? <Button icon={Plus} onClick={() => setOpen(true)}>New purchase order</Button> : undefined }}
      >
        {(rows) => (
          <DataTable
            caption="Purchase orders"
            columns={columns}
            rows={rows}
            rowKey={(p) => p.id}
            defaultSort={{ key: 'created', order: 'desc' }}
            footer={<p className="border-t border-line px-4 py-3 text-xs text-fg-subtle sm:px-5">Receiving an order doesn&apos;t change stock yet (orders have no line items) — record an incoming movement in Inventory.</p>}
          />
        )}
      </DataState>
      <Modal title="New purchase order" description="Orders start as drafts and need approval." open={open} onClose={() => setOpen(false)}>
        <POForm onDone={() => { setOpen(false); orders.reload(); }} onCancel={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

function POForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const suppliers = useApi<Supplier[]>('/purchases/suppliers');
  const [form, setForm] = useState({ supplierId: '', description: '', subtotal: '', tax: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/purchases/orders', {
      supplierId: form.supplierId, subtotal: form.subtotal, tax: form.tax || '0',
      ...(form.description && { description: form.description }),
    });
    onDone();
  }, { success: 'Draft purchase order created' });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <Field label="Supplier" name="supplierId" required>
        <Select value={form.supplierId} onChange={set('supplierId')}>
          <option value="">{suppliers.loading ? 'Loading suppliers…' : 'Select a supplier…'}</option>
          {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Description" name="description" optional><Textarea maxLength={1000} value={form.description} onChange={set('description')} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Subtotal" name="subtotal" required>
          <Input type="number" inputMode="decimal" min="0" step="0.01" prefix={CURRENCY_SYMBOL} value={form.subtotal} onChange={set('subtotal')} />
        </Field>
        <Field label="Tax" name="tax" optional>
          <Input type="number" inputMode="decimal" min="0" step="0.01" prefix={CURRENCY_SYMBOL} value={form.tax} onChange={set('tax')} />
        </Field>
      </div>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Create draft</Button>
      </FormActions>
    </Form>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────────

function VendorsTab() {
  const user = useAuthUser();
  const suppliers = useApi<Supplier[]>('/purchases/suppliers');
  const canEdit = can(user, 'INVENTORY');
  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Supplier', primary: true, sortValue: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'email', header: 'Email', cell: (s) => (s.email ? <a href={`mailto:${s.email}`} className="text-fg hover:underline">{s.email}</a> : '—') },
    { key: 'phone', header: 'Phone', cell: (s) => (s.phone ? <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a> : '—') },
    { key: 'lead', header: 'Lead time', numeric: true, sortValue: (s) => s.leadTimeDays, cell: (s) => (s.leadTimeDays != null ? `${s.leadTimeDays} days` : '—') },
    { key: 'terms', header: 'Payment terms', cell: (s) => s.paymentTerms ?? '—' },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card title="Suppliers" flush className={canEdit ? 'xl:col-span-2' : 'xl:col-span-3'}>
        <DataState state={suppliers} empty={{ icon: Truck, title: 'No suppliers yet' }}>
          {(rows) => <DataTable caption="Suppliers" columns={columns} rows={rows} rowKey={(s) => s.id} defaultSort={{ key: 'name', order: 'asc' }} />}
        </DataState>
      </Card>
      {canEdit && <SupplierForm onSaved={suppliers.reload} />}
    </div>
  );
}

function SupplierForm({ onSaved }: { onSaved: () => void }) {
  const blank = { name: '', email: '', phone: '', leadTimeDays: '', paymentTerms: '' };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/purchases/suppliers', {
      name: form.name,
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
      ...(form.leadTimeDays && { leadTimeDays: Number(form.leadTimeDays) }),
      ...(form.paymentTerms && { paymentTerms: form.paymentTerms }),
    });
    setForm(blank);
    onSaved();
  }, { success: 'Supplier added' });
  return (
    <Card title="Add supplier" className="self-start">
      <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
        <Field label="Name" name="name" required><Input value={form.name} onChange={set('name')} /></Field>
        <Field label="Email" name="email" optional><Input type="email" inputMode="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone" name="phone" optional><Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead time (days)" name="leadTimeDays" optional><Input type="number" inputMode="numeric" min="0" max="365" value={form.leadTimeDays} onChange={set('leadTimeDays')} /></Field>
          <Field label="Payment terms" name="paymentTerms" optional><Input value={form.paymentTerms} onChange={set('paymentTerms')} placeholder="Net 30" /></Field>
        </div>
        <Button type="submit" loading={save.pending} className="w-full">Add supplier</Button>
      </Form>
    </Card>
  );
}

// ── Demand forecast ───────────────────────────────────────────────────────────

const MODEL_LABEL: Record<string, string> = { prophet: 'Prophet', holt: 'Holt (damped trend)', moving_average: 'Moving average' };

function ForecastTab() {
  const [result, setResult] = useState<AIForecastResponse | null>(null);
  const [selectedSku, setSelectedSku] = useState('');
  const run = useMutation(async () => {
    const res = await api.post('/inventory/forecast/demand', { horizonDays: 30 });
    const data = res.data.data as AIForecastResponse;
    setResult(data);
    setSelectedSku((s) => (data.predictions.some((p) => p.sku === s) ? s : data.predictions[0]?.sku ?? ''));
  });
  const selected = useMemo(() => result?.predictions.find((p) => p.sku === selectedSku), [result, selectedSku]);
  type Pred = AIForecastResponse['predictions'][number];

  const columns: Column<Pred>[] = [
    { key: 'sku', header: 'Product', primary: true, sortValue: (p) => p.sku, cell: (p) => <><span className="block font-medium">{p.name ?? p.sku}</span><span className="block font-mono text-xs text-fg-subtle">{p.sku}</span></> },
    { key: 'stock', header: 'In stock', numeric: true, sortValue: (p) => p.currentStock, cell: (p) => num(p.currentStock) },
    { key: 'demand', header: '30-day demand', numeric: true, sortValue: (p) => p.predictedDemand, cell: (p) => <span className="font-medium">{num(p.predictedDemand)}</span> },
    { key: 'risk', header: 'Stock-out risk', sortValue: (p) => ({ High: 0, Medium: 1, Low: 2 })[p.stockoutRisk], cell: (p) => <Badge>{p.stockoutRisk}</Badge> },
    { key: 'reorder', header: 'Reorder', numeric: true, sortValue: (p) => p.recommendedReorder, cell: (p) => (p.recommendedReorder ? num(p.recommendedReorder) : '—') },
    { key: 'model', header: 'Model', cell: (p) => <span className="text-fg-muted">{MODEL_LABEL[p.model] ?? titleCase(p.model)}</span> },
    { key: 'conf', header: 'Confidence', numeric: true, sortValue: (p) => p.confidenceScore, cell: (p) => `${Math.round(p.confidenceScore * 100)}%` },
  ];

  const series = [
    { key: 'actual', label: 'Issued (actual)', slot: SLOT.actual },
    { key: 'pred', label: 'Forecast', slot: SLOT.forecast, dashed: true },
  ];

  return (
    <>
      <Card
        title="30-day demand forecast"
        description="Fits a model per product on the last 180 days of stock issued. Prophet is used when there is enough regular history; otherwise a damped-trend or moving-average model."
        actions={
          <Button icon={BrainCircuit} loading={run.pending} onClick={() => void run.run()}>
            {run.pending ? 'Forecasting…' : result ? 'Refresh forecast' : 'Run forecast'}
          </Button>
        }
      >
        {run.error && <Alert tone="danger" title="The forecast could not be generated">{run.error}</Alert>}
        {!result && !run.pending && !run.error && (
          <EmptyState compact icon={BrainCircuit} title="No forecast yet" description="Run the forecast to see predicted demand and reorder suggestions." />
        )}
        {run.pending && !result && <BlockSkeleton className="h-40" />}
        {result && <p className="text-sm text-fg-muted">{result.predictions.length} products · {result.cached ? 'served from cache' : 'freshly computed'}</p>}
      </Card>

      {result && result.predictions.length === 0 && <Card><EmptyState title="No active products to forecast" /></Card>}
      {result && result.predictions.length > 0 && (
        <>
          <Card title="Predictions" description="Select a product to see its history and forecast." flush>
            <DataTable
              caption="Demand predictions"
              columns={columns}
              rows={result.predictions}
              rowKey={(p) => p.sku}
              defaultSort={{ key: 'risk', order: 'asc' }}
              onRowClick={(p) => setSelectedSku(p.sku)}
              selectedKey={selectedSku}
            />
          </Card>
          {selected && (
            <Card title={`${selected.name ?? selected.sku} · actual vs forecast`} description="Units issued per day: last 15 days and the next 30.">
              <ChartLegend series={series} />
              <LineTrend
                data={selected.timeSeries}
                series={series}
                xKey="day"
                format={(v) => `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} units`}
                axisFormat={(v) => String(Math.round(v))}
                xInterval={6}
                height={280}
                ariaLabel={`Daily units issued and 30-day forecast for ${selected.sku}`}
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}
