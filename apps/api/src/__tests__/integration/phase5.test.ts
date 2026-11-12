import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { prisma, loginAs, resetDb } from './helpers';
import { env } from '../../config/env';

// ── BI totals match the data ──────────────────────────────────────────────────

describe('BI summary', () => {
  let admin: Awaited<ReturnType<typeof loginAs>>;

  beforeAll(async () => {
    await resetDb();
    admin = await loginAs('SUPER_ADMIN');
    const customer = await prisma.customer.create({ data: { name: 'BI Co' } });
    const thisMonth = new Date();
    const lastMonth = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 15));
    await prisma.invoice.createMany({
      data: [
        { customerId: customer.id, number: 'BI-1', subtotal: 1000, tax: 0, total: 1000, status: 'PAID', createdAt: thisMonth },
        { customerId: customer.id, number: 'BI-2', subtotal: 500.5, tax: 0, total: 500.5, status: 'SENT', createdAt: thisMonth },
        { customerId: customer.id, number: 'BI-3', subtotal: 999, tax: 0, total: 999, status: 'DRAFT', createdAt: thisMonth }, // excluded
        { customerId: customer.id, number: 'BI-4', subtotal: 2000, tax: 0, total: 2000, status: 'VOID', createdAt: thisMonth }, // excluded
        { customerId: customer.id, number: 'BI-5', subtotal: 300, tax: 0, total: 300, status: 'OVERDUE', createdAt: lastMonth },
      ],
    });
    await prisma.expense.createMany({
      data: [
        { category: 'Travel', amount: 120.25, submittedBy: admin.user.id, status: 'APPROVED', createdAt: thisMonth },
        { category: 'Travel', amount: 79.75, submittedBy: admin.user.id, status: 'SUBMITTED', createdAt: thisMonth },
        { category: 'Office', amount: 50, submittedBy: admin.user.id, status: 'REJECTED', createdAt: thisMonth }, // excluded
        { category: 'Office', amount: 40, submittedBy: admin.user.id, status: 'REIMBURSED', createdAt: lastMonth },
      ],
    });
    const emp = await prisma.employee.create({ data: { name: 'Payee', email: 'payee@bi.test', grossSalary: 12000, joinDate: new Date('2024-01-01') } });
    const ps = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth(), 1));
    await prisma.payrollRun.create({
      data: {
        periodStart: ps, periodEnd: new Date(Date.UTC(ps.getUTCFullYear(), ps.getUTCMonth() + 1, 0)), status: 'PAID', runBy: admin.user.id,
        totalGross: 1000, totalTaxes: 200, totalNet: 750,
        payslips: { create: [{ employeeId: emp.id, gross: 1000, taxes: 200, insurance: 50, net: 750 }] },
      },
    });
  });

  it('computes monthly revenue, expenses, payroll and profit from the tables', async () => {
    const res = await admin.agent.get('/api/v1/bi/summary?months=2').set(admin.auth).expect(200);
    const s = res.body.data;
    expect(s.months).toHaveLength(2);
    const [prev, cur] = s.months;
    expect(cur).toMatchObject({ revenue: '1500.50', collected: '1000.00', expenses: '200.00', payroll: '0.00', netProfit: '1300.50' });
    expect(prev).toMatchObject({ revenue: '300.00', collected: '0.00', expenses: '40.00', payroll: '1000.00', netProfit: '-740.00' });
    expect(s.totals).toEqual({ revenue: '1800.50', collected: '1000.00', expenses: '240.00', payroll: '1000.00', netProfit: '560.50' });
    expect(s.expensesByCategory).toEqual(expect.arrayContaining([
      { category: 'Travel', amount: '200.00' },
      { category: 'Office', amount: '40.00' },
      { category: 'Payroll', amount: '1000.00' },
    ]));
  });

  it('reports zeros, not invented numbers, when there is no data in range', async () => {
    await prisma.$executeRaw`UPDATE "invoices" SET "created_at" = NOW() - INTERVAL '5 years'`;
    await prisma.$executeRaw`UPDATE "expenses" SET "created_at" = NOW() - INTERVAL '5 years'`;
    await prisma.$executeRaw`UPDATE "payroll_runs" SET "period_start" = (NOW() - INTERVAL '5 years')::date, "period_end" = (NOW() - INTERVAL '5 years')::date`;
    const res = await admin.agent.get('/api/v1/bi/summary?months=3').set(admin.auth).expect(200);
    expect(res.body.data.totals).toEqual({ revenue: '0.00', collected: '0.00', expenses: '0.00', payroll: '0.00', netProfit: '0.00' });
    expect(res.body.data.expensesByCategory).toEqual([]);
  });

  it('validates the months parameter', async () => {
    await admin.agent.get('/api/v1/bi/summary?months=100').set(admin.auth).expect(422);
  });

  it('overview returns KPI shapes; activity only for admins', async () => {
    const res = await admin.agent.get('/api/v1/bi/overview').set(admin.auth).expect(200);
    expect(res.body.data).toMatchObject({ activeEmployees: 1, recentActivity: expect.any(Array) });
    const emp = await loginAs('EMPLOYEE');
    const asEmp = await emp.agent.get('/api/v1/bi/overview').set(emp.auth).expect(200);
    expect(asEmp.body.data.recentActivity).toBeNull();
  });
});

// ── Budget vs actual ──────────────────────────────────────────────────────────

describe('budgets', () => {
  it('merges budgets with actual (non-rejected) expenses', async () => {
    const fin = await loginAs('FINANCE_MANAGER');
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    await fin.agent.put('/api/v1/finance/budget').set(fin.auth).send({ category: 'Marketing', year, month, amount: 1000 }).expect(200);
    await fin.agent.put('/api/v1/finance/budget').set(fin.auth).send({ category: 'Marketing', year, month, amount: 1200 }).expect(200); // upsert
    await prisma.expense.createMany({
      data: [
        { category: 'Marketing', amount: 300, submittedBy: fin.user.id, status: 'APPROVED' },
        { category: 'Marketing', amount: 999, submittedBy: fin.user.id, status: 'REJECTED' },
        { category: 'Gifts', amount: 25, submittedBy: fin.user.id, status: 'SUBMITTED' },
      ],
    });
    const res = await fin.agent.get(`/api/v1/finance/budget?year=${year}&month=${month}`).set(fin.auth).expect(200);
    const lines = Object.fromEntries(res.body.data.lines.map((l: { category: string }) => [l.category, l]));
    expect(lines.Marketing).toMatchObject({ budget: '1200.00', actual: '300.00', variance: '900.00' });
    expect(lines.Gifts).toMatchObject({ budget: '0.00', actual: '25.00', variance: '-25.00' });

    const emp = await loginAs('EMPLOYEE');
    await emp.agent.put('/api/v1/finance/budget').set(emp.auth).send({ category: 'X', year, month, amount: 1 }).expect(403);
  });
});

// ── Sales orders ──────────────────────────────────────────────────────────────

describe('sales orders', () => {
  it('numbers orders atomically and enforces status transitions', async () => {
    const sales = await loginAs('SALES_REP');
    const customer = await prisma.customer.create({ data: { name: 'SO Co' } });
    const created = await Promise.all([1, 2, 3].map(() =>
      sales.agent.post('/api/v1/sales-orders').set(sales.auth).send({ customerId: customer.id, total: 99.9 })));
    expect(new Set(created.map((r) => r.body.data.number)).size).toBe(3);

    const id = created[0]!.body.data.id;
    await sales.agent.patch(`/api/v1/sales-orders/${id}/status`).set(sales.auth).send({ status: 'FULFILLED' }).expect(409);
    await sales.agent.patch(`/api/v1/sales-orders/${id}/status`).set(sales.auth).send({ status: 'CONFIRMED' }).expect(200);
    await sales.agent.patch(`/api/v1/sales-orders/${id}/status`).set(sales.auth).send({ status: 'FULFILLED' }).expect(200);

    const emp = await loginAs('EMPLOYEE');
    await emp.agent.post('/api/v1/sales-orders').set(emp.auth).send({ customerId: customer.id, total: 1 }).expect(403);
  });
});

// ── Purchase order transitions ────────────────────────────────────────────────

describe('purchase orders', () => {
  it('only allows DRAFT → ISSUED → RECEIVED', async () => {
    const inv = await loginAs('INVENTORY_MANAGER');
    const supplier = await prisma.supplier.create({ data: { name: 'PO Supplier' } });
    const po = await inv.agent.post('/api/v1/purchases/orders').set(inv.auth).send({ supplierId: supplier.id, subtotal: 10 }).expect(201);
    await inv.agent.patch(`/api/v1/purchases/orders/${po.body.data.id}/receive`).set(inv.auth).send({}).expect(409);
    await inv.agent.patch(`/api/v1/purchases/orders/${po.body.data.id}/approve`).set(inv.auth).send({}).expect(200);
    await inv.agent.patch(`/api/v1/purchases/orders/${po.body.data.id}/approve`).set(inv.auth).send({}).expect(409);
    await inv.agent.patch(`/api/v1/purchases/orders/${po.body.data.id}/receive`).set(inv.auth).send({}).expect(200);
    await inv.agent.patch(`/api/v1/purchases/orders/${po.body.data.id}/cancel`).set(inv.auth).send({}).expect(409);
  });
});

// ── User administration ───────────────────────────────────────────────────────

describe('user administration', () => {
  it('creates users with a temporary password and revokes sessions on role change', async () => {
    const admin = await loginAs('SUPER_ADMIN');
    const res = await admin.agent.post('/api/v1/users').set(admin.auth).send({ email: 'new.hire@test.amdox.com', role: 'EMPLOYEE' }).expect(201);
    expect(res.body.data.temporaryPassword).toEqual(expect.any(String));
    expect(res.body.data).not.toHaveProperty('passwordHash');

    const target = await loginAs('SALES_REP');
    await admin.agent.patch(`/api/v1/users/${target.user.id}`).set(admin.auth).send({ role: 'READ_ONLY' }).expect(200);
    await target.agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', target.csrf).send({}).expect(401);

    await admin.agent.patch(`/api/v1/users/${admin.user.id}`).set(admin.auth).send({ isActive: false }).expect(409);
  });
});

// ── Notifications are created by business events ──────────────────────────────

describe('notifications', () => {
  it('notifies the employee when HR decides their leave', async () => {
    const hr = await loginAs('HR_MANAGER', { withEmployee: true });
    const emp = await loginAs('EMPLOYEE', { withEmployee: true });
    const leave = await emp.agent.post('/api/v1/leave-requests').set(emp.auth)
      .send({ type: 'SICK', fromDate: '2026-12-10', toDate: '2026-12-10' }).expect(201);
    await hr.agent.patch(`/api/v1/leave-requests/${leave.body.data.id}/approve`).set(hr.auth).send({}).expect(200);
    const list = await emp.agent.get('/api/v1/notifications').set(emp.auth).expect(200);
    expect(list.body.data.items.map((n: { title: string }) => n.title)).toContain('Leave approved');
    expect(list.body.data.unread).toBeGreaterThan(0);
  });
});

// ── Audit trail ───────────────────────────────────────────────────────────────

describe('audit trail', () => {
  it('records successful writes without the request body', async () => {
    const sales = await loginAs('SALES_REP');
    await sales.agent.post('/api/v1/customers').set(sales.auth).send({ name: 'Audited Ltd' }).expect(201);
    // the log is written on response finish
    await new Promise((r) => setTimeout(r, 100));
    const row = await prisma.auditLog.findFirst({ where: { userId: sales.user.id, entity: 'customers' } });
    expect(row).toMatchObject({ action: 'POST', payload: null });
  });
});

// ── Forecast proxy → ml-service ───────────────────────────────────────────────

describe('forecast proxy', () => {
  let server: http.Server;
  let mode: 'ok' | 'slow' | 'error' = 'ok';
  let lastRequest: { headers: http.IncomingHttpHeaders; body: any } | null = null;
  const original = { url: env.ML_SERVICE_URL, timeout: env.ML_TIMEOUT_MS };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        lastRequest = { headers: req.headers, body: JSON.parse(raw || '{}') };
        if (mode === 'slow') return; // never answers → timeout
        if (mode === 'error') { res.writeHead(500).end('boom: internal stack trace'); return; }
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
          jobId: 'job-1', status: 'Completed', cached: false,
          predictions: lastRequest.body.items.map((i: { sku: string }) => ({ sku: i.sku, predictedDemand: 1 })),
        }));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    (env as { ML_SERVICE_URL: string }).ML_SERVICE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    (env as { ML_TIMEOUT_MS: number }).ML_TIMEOUT_MS = 300;
  });

  afterAll(async () => {
    (env as { ML_SERVICE_URL: string }).ML_SERVICE_URL = original.url;
    (env as { ML_TIMEOUT_MS: number }).ML_TIMEOUT_MS = original.timeout;
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  });

  it('sends real OUT history and the shared secret, and wraps the result', async () => {
    mode = 'ok';
    const inv = await loginAs('INVENTORY_MANAGER');
    const wh = await prisma.warehouse.create({ data: { name: 'F WH' } });
    const p = await prisma.product.create({ data: { sku: 'FC-1', name: 'Forecasted', unitPrice: 1, reorderLevel: 3 } });
    await prisma.stockLevel.create({ data: { productId: p.id, warehouseId: wh.id, quantity: 7 } });
    await prisma.stockMovement.createMany({
      data: [
        { productId: p.id, warehouseId: wh.id, type: 'OUT', quantity: 2, createdAt: new Date(Date.now() - 2 * 86_400_000) },
        { productId: p.id, warehouseId: wh.id, type: 'OUT', quantity: 3, createdAt: new Date(Date.now() - 2 * 86_400_000) },
        { productId: p.id, warehouseId: wh.id, type: 'IN', quantity: 50, createdAt: new Date(Date.now() - 3 * 86_400_000) },
        { productId: p.id, warehouseId: wh.id, type: 'OUT', quantity: 9, createdAt: new Date(Date.now() - 400 * 86_400_000) }, // too old
      ],
    });

    const res = await inv.agent.post('/api/v1/inventory/forecast/demand').set(inv.auth).send({ skus: ['FC-1'], horizonDays: 14 }).expect(200);
    expect(res.body).toMatchObject({ success: true, data: { jobId: 'job-1', predictions: [{ sku: 'FC-1' }] } });
    expect(lastRequest!.headers['x-internal-token']).toBe(env.ML_INTERNAL_TOKEN);
    expect(lastRequest!.body.horizonDays).toBe(14);
    expect(lastRequest!.body.items).toEqual([
      expect.objectContaining({ sku: 'FC-1', currentStock: 7, safetyStock: 3, history: [expect.objectContaining({ quantity: 5 })] }),
    ]);
  });

  it('times out with 504 instead of hanging', async () => {
    mode = 'slow';
    const inv = await loginAs('INVENTORY_MANAGER');
    const res = await inv.agent.post('/api/v1/inventory/forecast/demand').set(inv.auth).send({});
    expect(res.status).toBe(504);
  });

  it('does not leak ML error details', async () => {
    mode = 'error';
    const inv = await loginAs('INVENTORY_MANAGER');
    const res = await inv.agent.post('/api/v1/inventory/forecast/demand').set(inv.auth).send({});
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|boom/);
  });
});
