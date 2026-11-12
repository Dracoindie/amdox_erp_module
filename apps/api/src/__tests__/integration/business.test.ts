import { prisma, loginAs } from './helpers';

let fin: Awaited<ReturnType<typeof loginAs>>;
let inv: Awaited<ReturnType<typeof loginAs>>;
let hr: Awaited<ReturnType<typeof loginAs>>;

beforeAll(async () => {
  fin = await loginAs('FINANCE_MANAGER');
  inv = await loginAs('INVENTORY_MANAGER');
  hr = await loginAs('HR_MANAGER');
});

// ── Journal entries ───────────────────────────────────────────────────────────

describe('journal entries', () => {
  let cash: string;
  let revenue: string;
  beforeAll(async () => {
    cash = (await prisma.account.create({ data: { code: 'T-1000', name: 'Cash', type: 'asset' } })).id;
    revenue = (await prisma.account.create({ data: { code: 'T-4000', name: 'Revenue', type: 'income' } })).id;
  });

  const post = (lines: unknown[]) =>
    fin.agent.post('/api/v1/finance/ledger').set(fin.auth).send({ date: '2026-11-01', description: 'Test entry', lines });

  it('posts a balanced entry and returns money as strings', async () => {
    const res = await post([{ accountId: cash, debit: 100.5 }, { accountId: revenue, credit: '100.50' }]).expect(201);
    expect(res.body.data.totalDebit).toBe('100.5');
    expect(res.body.data.totalCredit).toBe('100.5');
    expect(res.body.data.lines).toHaveLength(2);
  });

  it('rejects an unbalanced entry (422) and writes nothing', async () => {
    const before = await prisma.journalEntry.count();
    const res = await post([{ accountId: cash, debit: 100 }, { accountId: revenue, credit: 99.99 }]);
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/debits.*must equal.*credits/i);
    expect(await prisma.journalEntry.count()).toBe(before);
  });

  it('rejects a line with both debit and credit', async () => {
    const res = await post([{ accountId: cash, debit: 50, credit: 50 }, { accountId: revenue, credit: 0.01 }]);
    expect(res.status).toBe(422);
  });

  it('rejects a line with neither side above 0', async () => {
    const res = await post([{ accountId: cash, debit: 0 }, { accountId: revenue, credit: 0 }]);
    expect(res.status).toBe(422);
  });

  it('rejects more than 2 decimal places', async () => {
    const res = await post([{ accountId: cash, debit: 1.005 }, { accountId: revenue, credit: 1.005 }]);
    expect(res.status).toBe(422);
  });

  it('rejects unknown accounts (422) without a partial write', async () => {
    const before = await prisma.journalLine.count();
    const res = await post([
      { accountId: cash, debit: 10 },
      { accountId: '00000000-0000-4000-8000-000000000000', credit: 10 },
    ]);
    expect(res.status).toBe(422);
    expect(res.body.errors.accountIds).toEqual(['00000000-0000-4000-8000-000000000000']);
    expect(await prisma.journalLine.count()).toBe(before);
  });
});

// ── Stock movements ───────────────────────────────────────────────────────────

describe('stock movements', () => {
  let productId: string;
  let warehouseId: string;
  beforeAll(async () => {
    productId = (await prisma.product.create({ data: { sku: 'T-SKU-1', name: 'Widget', unitPrice: 9.99 } })).id;
    warehouseId = (await prisma.warehouse.create({ data: { name: 'Test WH' } })).id;
  });

  const move = (type: string, quantity: number) =>
    inv.agent.post('/api/v1/inventory/stock/movement').set(inv.auth).send({ productId, warehouseId, type, quantity });

  const level = async () =>
    (await prisma.stockLevel.findUnique({ where: { productId_warehouseId: { productId, warehouseId } } }))?.quantity ?? 0;

  it('IN creates the stock level and OUT decrements it', async () => {
    const r = await move('IN', 10).expect(201);
    expect(r.body.data.stockLevel.quantity).toBe(10);
    await move('OUT', 4).expect(201);
    expect(await level()).toBe(6);
  });

  it('an OUT that would go negative is 409 and changes nothing', async () => {
    const movementsBefore = await prisma.stockMovement.count({ where: { productId } });
    const res = await move('OUT', 7);
    expect(res.status).toBe(409);
    expect(res.body.errors).toEqual({ available: 6, requested: 7 });
    expect(await level()).toBe(6);
    expect(await prisma.stockMovement.count({ where: { productId } })).toBe(movementsBefore);
  });

  it('concurrent OUTs never oversell', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => move('OUT', 2)));
    const okCount = results.filter((r) => r.status === 201).length;
    expect(okCount).toBe(3); // 6 in stock → three OUTs of 2
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await level()).toBe(0);
  });

  it('a negative ADJUSTMENT is also guarded', async () => {
    await move('ADJUSTMENT', -1).expect(409);
    await move('ADJUSTMENT', 3).expect(201);
    expect(await level()).toBe(3);
  });

  it('rejects OUT with a non-positive quantity (422)', async () => {
    await move('OUT', -5).expect(422);
  });
});

// ── Payroll ───────────────────────────────────────────────────────────────────

describe('payroll runs', () => {
  beforeAll(async () => {
    await prisma.employee.createMany({
      data: [
        { name: 'Ann', email: 'ann@payroll.test', grossSalary: 120000, joinDate: new Date('2024-01-01') },
        { name: 'Bob', email: 'bob@payroll.test', grossSalary: 60000, joinDate: new Date('2024-01-01') },
        { name: 'Gone', email: 'gone@payroll.test', grossSalary: 99999, joinDate: new Date('2024-01-01'), status: 'TERMINATED', isArchived: true },
      ],
    });
  });

  it('creates the run and one payslip per active employee in one go', async () => {
    const res = await hr.agent.post('/api/v1/payroll/run').set(hr.auth).send({ year: 2026, month: 3 }).expect(201);
    const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: res.body.data.id }, include: { payslips: true } });
    const active = await prisma.employee.count({ where: { isArchived: false, status: { in: ['ACTIVE', 'ONBOARDING'] } } });
    expect(run.payslips).toHaveLength(active);
    // Ann: 10000.00 gross / month → 2000 tax, 500 insurance, 7500 net
    const ann = await prisma.employee.findUniqueOrThrow({ where: { email: 'ann@payroll.test' } });
    const slip = run.payslips.find((p) => p.employeeId === ann.id)!;
    expect([slip.gross.toFixed(2), slip.taxes.toFixed(2), slip.insurance.toFixed(2), slip.net.toFixed(2)])
      .toEqual(['10000.00', '2000.00', '500.00', '7500.00']);
    const slipTotal = run.payslips.reduce((s, p) => s + Number(p.gross), 0);
    expect(Number(run.totalGross)).toBeCloseTo(slipTotal, 2);
  });

  it('a second run for the same period is 409 and creates no payslips', async () => {
    const slipsBefore = await prisma.payslip.count();
    const res = await hr.agent.post('/api/v1/payroll/run').set(hr.auth).send({ year: 2026, month: 3 });
    expect(res.status).toBe(409);
    expect(await prisma.payslip.count()).toBe(slipsBefore);
  });

  it('concurrent runs for one period produce exactly one run', async () => {
    const results = await Promise.all(
      [1, 2, 3].map(() => hr.agent.post('/api/v1/payroll/run').set(hr.auth).send({ year: 2026, month: 4 })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    const runs = await prisma.payrollRun.count({ where: { periodStart: new Date(Date.UTC(2026, 3, 1)) } });
    expect(runs).toBe(1);
  });
});

// ── Invoices ──────────────────────────────────────────────────────────────────

describe('invoice numbering', () => {
  it('concurrent invoice creation yields unique, sequential numbers', async () => {
    const customer = await prisma.customer.create({ data: { name: 'Concurrency Co' } });
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        fin.agent.post('/api/v1/finance/invoices').set(fin.auth).send({ customerId: customer.id, subtotal: 100, tax: 18 })),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    const numbers = results.map((r) => r.body.data.number as string);
    expect(new Set(numbers).size).toBe(8);
    const seqs = numbers.map((n) => Number(n.split('-').pop())).sort((a, b) => a - b);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(results[0]!.body.data.total).toBe('118');
  });
});

// ── Attendance ────────────────────────────────────────────────────────────────

describe('attendance hours', () => {
  it('computes hoursWorked from clock-in and clock-out', async () => {
    const me = await loginAs('EMPLOYEE', { withEmployee: true });
    const inRes = await me.agent.post('/api/v1/attendance/clock-in').set(me.auth).send({}).expect(201);
    await prisma.attendance.update({
      where: { id: inRes.body.data.id },
      data: { clockIn: new Date(Date.now() - 2.5 * 3_600_000) },
    });
    const out = await me.agent.post('/api/v1/attendance/clock-out').set(me.auth).send({}).expect(200);
    expect(out.body.data.hoursWorked).toBeCloseTo(2.5, 1);
    await me.agent.post('/api/v1/attendance/clock-out').set(me.auth).send({}).expect(409);
  });
});
