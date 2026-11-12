// Demo data for AMX-ERP-2026.
//
//   pnpm --filter api db:seed
//
// Master data (users, departments, accounts, products, ...) is upserted, so the
// seed can be re-run. Transactional history (6 months of invoices, expenses,
// payroll, stock movements, ...) is generated once: it is skipped when invoices
// already exist. A fixed-seed RNG keeps the numbers identical on every machine.
//
// Passwords: SEED_ADMIN_PASSWORD (default Admin@1234) and SEED_DEMO_PASSWORD
// (default Demo@1234). Change them for anything other than a local demo.

import { PrismaClient, Prisma, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

// mulberry32 — tiny deterministic PRNG
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260512);
const between = (min: number, max: number) => min + rand() * (max - min);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;

const now = new Date();
const monthsAgo = (n: number, day = 1) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, day, 10));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  console.log('Seeding AMX-ERP-2026 demo data...');

  // ── Users (one per role) ────────────────────────────────────────────────────
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234';
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'Demo@1234';
  const [adminHash, demoHash] = await Promise.all([bcrypt.hash(adminPassword, 12), bcrypt.hash(demoPassword, 12)]);

  const userSpecs: Array<[string, Role]> = [
    ['admin@amdox.com', 'SUPER_ADMIN'],
    ['hr@amdox.com', 'HR_MANAGER'],
    ['finance@amdox.com', 'FINANCE_MANAGER'],
    ['inventory@amdox.com', 'INVENTORY_MANAGER'],
    ['sales@amdox.com', 'SALES_REP'],
    ['employee@amdox.com', 'EMPLOYEE'],
    ['viewer@amdox.com', 'READ_ONLY'],
  ];
  const users: Record<string, string> = {};
  for (const [email, role] of userSpecs) {
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, role, passwordHash: role === 'SUPER_ADMIN' ? adminHash : demoHash },
    });
    users[email] = u.id;
  }
  const admin = users['admin@amdox.com']!;
  console.log(`  users: ${userSpecs.length} (one per role)`);

  // ── Departments & employees ─────────────────────────────────────────────────
  const deptNames = ['Engineering', 'Human Resources', 'Finance', 'Sales', 'Operations'];
  const depts: Record<string, string> = {};
  for (const name of deptNames) {
    depts[name] = (await prisma.department.upsert({ where: { name }, update: {}, create: { name } })).id;
  }

  const employeeSpecs: Array<{ name: string; email: string; dept: string; title: string; salary: number; join: string; user?: string; status?: 'ACTIVE' | 'ONBOARDING' }> = [
    { name: 'Asha Rao', email: 'admin@amdox.com', dept: 'Operations', title: 'COO', salary: 180000, join: '2022-02-01', user: 'admin@amdox.com' },
    { name: 'Carol White', email: 'hr@amdox.com', dept: 'Human Resources', title: 'HR Manager', salary: 85000, join: '2023-06-01', user: 'hr@amdox.com' },
    { name: 'Dev Mehta', email: 'finance@amdox.com', dept: 'Finance', title: 'Finance Manager', salary: 110000, join: '2023-01-09', user: 'finance@amdox.com' },
    { name: 'Ivan Petrov', email: 'inventory@amdox.com', dept: 'Operations', title: 'Inventory Planner', salary: 72000, join: '2024-04-15', user: 'inventory@amdox.com' },
    { name: 'Sara Kim', email: 'sales@amdox.com', dept: 'Sales', title: 'Account Executive', salary: 78000, join: '2024-02-19', user: 'sales@amdox.com' },
    { name: 'Eli Brooks', email: 'employee@amdox.com', dept: 'Engineering', title: 'Software Engineer', salary: 98000, join: '2024-07-01', user: 'employee@amdox.com' },
    { name: 'Alice Johnson', email: 'alice@amdox.com', dept: 'Engineering', title: 'Frontend Lead', salary: 120000, join: '2024-01-15' },
    { name: 'Bob Smith', email: 'bob@amdox.com', dept: 'Engineering', title: 'Backend Developer', salary: 95000, join: '2024-03-01' },
    { name: 'Nina Patel', email: 'nina@amdox.com', dept: 'Sales', title: 'Sales Associate', salary: 64000, join: '2025-01-06' },
    { name: 'Omar Haddad', email: 'omar@amdox.com', dept: 'Engineering', title: 'QA Engineer', salary: 82000, join: '2025-09-01', status: 'ONBOARDING' },
  ];
  const employees: Record<string, string> = {};
  for (const e of employeeSpecs) {
    const emp = await prisma.employee.upsert({
      where: { email: e.email },
      update: {},
      create: {
        name: e.name, email: e.email, departmentId: depts[e.dept], designation: e.title,
        grossSalary: e.salary, joinDate: new Date(e.join), status: e.status ?? 'ACTIVE',
        userId: e.user ? users[e.user] : undefined,
      },
    });
    employees[e.email] = emp.id;
  }
  console.log(`  employees: ${employeeSpecs.length}`);

  // ── Chart of accounts ───────────────────────────────────────────────────────
  const accountSpecs: Array<[string, string, string]> = [
    ['1000', 'Cash', 'asset'], ['1100', 'Accounts Receivable', 'asset'], ['1200', 'Inventory', 'asset'],
    ['2000', 'Accounts Payable', 'liability'], ['2100', 'Payroll Payable', 'liability'], ['2200', 'Tax Payable', 'liability'],
    ['3000', 'Owner Equity', 'equity'], ['4000', 'Sales Revenue', 'income'],
    ['5000', 'Cost of Goods Sold', 'expense'], ['6000', 'Operating Expenses', 'expense'], ['6100', 'Payroll Expense', 'expense'],
  ];
  const accounts: Record<string, string> = {};
  for (const [code, name, type] of accountSpecs) {
    accounts[code] = (await prisma.account.upsert({ where: { code }, update: {}, create: { code, name, type } })).id;
  }

  // ── Products, warehouses, suppliers ─────────────────────────────────────────
  const productSpecs = [
    { sku: 'SKU-1001', name: 'ThinkPad T14 Gen 3', category: 'Electronics', price: 1200, reorder: 10, daily: 1.6, stock: 38 },
    { sku: 'SKU-1002', name: 'Ergonomic Office Chair', category: 'Furniture', price: 250, reorder: 15, daily: 0.7, stock: 9 },
    { sku: 'SKU-1003', name: 'Wireless Mouse M720', category: 'Accessories', price: 40, reorder: 30, daily: 4.5, stock: 140 },
    { sku: 'SKU-1004', name: '27-inch 4K Monitor', category: 'Electronics', price: 350, reorder: 10, daily: 1.1, stock: 6 },
    { sku: 'SKU-1005', name: 'USB-C Docking Station', category: 'Accessories', price: 180, reorder: 12, daily: 0.9, stock: 27 },
  ];
  const warehouseSpecs = [
    { id: 'wh-main-001', name: 'Main Warehouse', location: 'Bangalore, India' },
    { id: 'wh-west-002', name: 'West Hub', location: 'Mumbai, India' },
  ];
  for (const w of warehouseSpecs) {
    await prisma.warehouse.upsert({ where: { id: w.id }, update: {}, create: w });
  }
  const products: Record<string, string> = {};
  for (const p of productSpecs) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { sku: p.sku, name: p.name, category: p.category, unitPrice: p.price, reorderLevel: p.reorder },
    });
    products[p.sku] = prod.id;
  }

  const supplierSpecs = [
    { id: 'sup-001', name: 'TechSupply Co.', email: 'orders@techsupply.example', leadTimeDays: 7, paymentTerms: 'Net 30' },
    { id: 'sup-002', name: 'OfficeWorks Ltd', email: 'sales@officeworks.example', leadTimeDays: 10, paymentTerms: 'Net 45' },
    { id: 'sup-003', name: 'Peripheral Partners', email: 'hello@peripherals.example', leadTimeDays: 5, paymentTerms: 'Net 15' },
  ];
  for (const s of supplierSpecs) {
    await prisma.supplier.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // ── Customers ───────────────────────────────────────────────────────────────
  const customerSpecs = [
    { name: 'John Smith', email: 'john@techcorp.example', company: 'TechCorp' },
    { name: 'Sarah Jones', email: 'sarah@globalsolutions.example', company: 'Global Solutions' },
    { name: 'Mike Brown', email: 'mike@startupinc.example', company: 'Startup Inc' },
    { name: 'Emily Davis', email: 'emily@enterprise.example', company: 'Enterprise LLC' },
    { name: 'Raj Verma', email: 'raj@nimbus.example', company: 'Nimbus Retail' },
    { name: 'Lena Fischer', email: 'lena@alpenlogistik.example', company: 'Alpen Logistik' },
  ];
  const customers: string[] = [];
  for (const c of customerSpecs) {
    customers.push((await prisma.customer.upsert({ where: { email: c.email }, update: {}, create: { ...c, assignedTo: 'sales@amdox.com' } })).id);
  }
  console.log('  master data: departments, accounts, products, warehouses, suppliers, customers');

  // ── Transactional history (generated once) ──────────────────────────────────
  if ((await prisma.invoice.count()) > 0) {
    console.log('  history already present — skipping (reset the DB to regenerate)');
    return;
  }

  // Stock: 180 days of daily OUT movements with a weekly pattern, plus periodic
  // replenishment, ending at each product's target stock level.
  const movements: Prisma.StockMovementCreateManyInput[] = [];
  for (const p of productSpecs) {
    const pid = products[p.sku]!;
    let out = 0;
    for (let d = 180; d >= 1; d--) {
      const day = daysAgo(d);
      const weekday = day.getUTCDay();
      const factor = weekday === 0 || weekday === 6 ? 0.4 : weekday <= 3 ? 1.3 : 1.0;
      const qty = Math.round(Math.max(0, p.daily * factor + between(-0.8, 0.8)));
      if (qty > 0) {
        movements.push({ productId: pid, warehouseId: 'wh-main-001', type: 'OUT', quantity: qty, performedBy: users['inventory@amdox.com'], createdAt: day, note: 'Seeded demand' });
        out += qty;
      }
    }
    // One opening IN 181 days ago covers all OUTs and leaves the target stock.
    movements.push({ productId: pid, warehouseId: 'wh-main-001', type: 'IN', quantity: out + p.stock, performedBy: users['inventory@amdox.com'], createdAt: daysAgo(181), note: 'Opening stock' });
    await prisma.stockLevel.upsert({
      where: { productId_warehouseId: { productId: pid, warehouseId: 'wh-main-001' } },
      update: { quantity: p.stock },
      create: { productId: pid, warehouseId: 'wh-main-001', quantity: p.stock },
    });
  }
  await prisma.stockMovement.createMany({ data: movements });

  // Purchase orders
  await prisma.purchaseOrder.createMany({
    data: [
      { supplierId: 'sup-001', description: 'Monitors restock', subtotal: 7000, tax: 1260, total: 8260, status: 'ISSUED', createdBy: users['inventory@amdox.com']!, approvedBy: admin, createdAt: daysAgo(6) },
      { supplierId: 'sup-002', description: 'Office chairs Q4', subtotal: 3750, tax: 675, total: 4425, status: 'DRAFT', createdBy: users['inventory@amdox.com']!, createdAt: daysAgo(2) },
      { supplierId: 'sup-003', description: 'Mice and docks', subtotal: 2200, tax: 396, total: 2596, status: 'RECEIVED', createdBy: users['inventory@amdox.com']!, approvedBy: admin, createdAt: daysAgo(25) },
    ],
  });

  // Invoices: 4-7 per month for the last 6 months (current month included)
  const invoiceCounters = new Map<number, number>();
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  for (let m = 5; m >= 0; m--) {
    const n = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const createdAt = monthsAgo(m, 1 + Math.floor(rand() * 25));
      if (createdAt > now) continue;
      const year = createdAt.getUTCFullYear();
      const seq = (invoiceCounters.get(year) ?? 0) + 1;
      invoiceCounters.set(year, seq);
      const subtotal = D(Math.round(between(4000, 30000)));
      const tax = subtotal.times('0.18').toDecimalPlaces(2);
      const status = m >= 2 ? pick(['PAID', 'PAID', 'PAID', 'OVERDUE'] as const) : pick(['SENT', 'SENT', 'PAID', 'DRAFT'] as const);
      invoices.push({
        customerId: pick(customers), number: `INV-${year}-${String(seq).padStart(5, '0')}`,
        subtotal, tax, total: subtotal.plus(tax), status, createdAt,
        dueDate: new Date(createdAt.getTime() + 30 * 86_400_000),
      });
    }
  }
  await prisma.invoice.createMany({ data: invoices });
  for (const [year, value] of invoiceCounters) {
    await prisma.counter.upsert({ where: { name: `invoice:${year}` }, update: { value }, create: { name: `invoice:${year}`, value } });
  }

  // Expenses
  const categories = ['Marketing', 'Travel', 'Infrastructure', 'Office', 'Software'] as const;
  const submitters = [users['employee@amdox.com']!, users['sales@amdox.com']!, users['inventory@amdox.com']!];
  const expenses: Prisma.ExpenseCreateManyInput[] = [];
  for (let m = 5; m >= 0; m--) {
    for (let i = 0; i < 8; i++) {
      const createdAt = monthsAgo(m, 1 + Math.floor(rand() * 25));
      if (createdAt > now) continue;
      const category = pick(categories);
      const base = { Marketing: 3500, Travel: 1200, Infrastructure: 2600, Office: 600, Software: 900 }[category];
      expenses.push({
        category, amount: D(Math.round(between(base * 0.5, base * 1.5))), description: `${category} spend`,
        status: m >= 1 ? pick(['APPROVED', 'REIMBURSED', 'REIMBURSED', 'REJECTED'] as const) : pick(['SUBMITTED', 'APPROVED'] as const),
        submittedBy: pick(submitters), approvedBy: m >= 1 ? users['finance@amdox.com'] : null, createdAt,
      });
    }
  }
  await prisma.expense.createMany({ data: expenses });

  // Budgets for the current and previous month
  for (const offset of [0, 1]) {
    const d = monthsAgo(offset);
    for (const category of categories) {
      const amount = { Marketing: 14000, Travel: 4000, Infrastructure: 9000, Office: 2500, Software: 3500 }[category];
      await prisma.budget.upsert({
        where: { category_year_month: { category, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 } },
        update: {},
        create: { category, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, amount, updatedBy: users['finance@amdox.com'] },
      });
    }
  }

  // Payroll for the previous 5 months (the current month is left for the demo)
  const payable = await prisma.employee.findMany({ where: { isArchived: false, status: { in: ['ACTIVE', 'ONBOARDING'] } } });
  for (let m = 5; m >= 1; m--) {
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m + 1, 0));
    const slips = payable
      .filter((e) => e.joinDate <= periodEnd)
      .map((e) => {
        const gross = e.grossSalary.dividedBy(12).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const taxes = gross.times('0.20').toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const insurance = gross.times('0.05').toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        return { employeeId: e.id, gross, taxes, insurance, net: gross.minus(taxes).minus(insurance) };
      });
    const total = (k: 'gross' | 'taxes' | 'net') => slips.reduce((s, x) => s.plus(x[k]), D(0));
    await prisma.payrollRun.create({
      data: {
        periodStart, periodEnd, status: 'PAID', runBy: users['hr@amdox.com']!,
        totalGross: total('gross'), totalTaxes: total('taxes'), totalNet: total('net'),
        createdAt: new Date(periodEnd.getTime() + 86_400_000),
        payslips: { create: slips },
      },
    });
  }

  // A few balanced journal entries
  const entries: Array<[string, string, string, number]> = [
    ['Client payment received', '1000', '1100', 15000],
    ['Office rent', '6000', '1000', 5000],
    ['Inventory purchase on credit', '1200', '2000', 8260],
  ];
  for (const [i, [description, debitAcc, creditAcc, amount]] of entries.entries()) {
    await prisma.journalEntry.create({
      data: {
        date: daysAgo(10 - i * 3), description, status: 'POSTED', createdBy: users['finance@amdox.com']!,
        totalDebit: amount, totalCredit: amount,
        lines: { create: [{ accountId: accounts[debitAcc]!, debit: amount }, { accountId: accounts[creditAcc]!, credit: amount }] },
      },
    });
  }

  // CRM pipeline and sales orders
  const stages = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
  await prisma.lead.createMany({
    data: customers.flatMap((customerId, i) => [
      { customerId, stage: stages[i % stages.length]!, value: Math.round(between(10000, 150000)), assignedTo: 'sales@amdox.com', createdAt: daysAgo(40 - i * 4) },
      ...(i % 2 === 0 ? [{ customerId, stage: stages[(i + 2) % stages.length]!, value: Math.round(between(5000, 60000)), assignedTo: 'sales@amdox.com', createdAt: daysAgo(15 - i) }] : []),
    ]),
  });
  await prisma.interaction.createMany({
    data: customers.slice(0, 4).map((customerId, i) => ({ customerId, type: pick(['call', 'email', 'meeting'] as const), note: 'Follow-up on proposal', performedBy: users['sales@amdox.com']!, createdAt: daysAgo(i + 1) })),
  });
  const year = now.getUTCFullYear();
  const orderSpecs = [
    { status: 'FULFILLED', total: 25000 }, { status: 'CONFIRMED', total: 48000 }, { status: 'DRAFT', total: 12500 }, { status: 'CANCELLED', total: 7800 },
  ] as const;
  for (const [i, o] of orderSpecs.entries()) {
    await prisma.salesOrder.create({
      data: { number: `SO-${year}-${String(i + 1).padStart(5, '0')}`, customerId: customers[i]!, total: o.total, status: o.status, description: 'Hardware bundle', createdBy: users['sales@amdox.com']!, createdAt: daysAgo(30 - i * 6) },
    });
  }
  await prisma.counter.upsert({ where: { name: `sales-order:${year}` }, update: { value: orderSpecs.length }, create: { name: `sales-order:${year}`, value: orderSpecs.length } });

  // Leave, attendance, notifications
  await prisma.leaveRequest.createMany({
    data: [
      { employeeId: employees['employee@amdox.com']!, type: 'ANNUAL', fromDate: daysAgo(-10), toDate: daysAgo(-7), reason: 'Family trip', status: 'PENDING' },
      { employeeId: employees['bob@amdox.com']!, type: 'SICK', fromDate: daysAgo(12), toDate: daysAgo(11), status: 'APPROVED', approvedBy: users['hr@amdox.com'] },
      { employeeId: employees['sales@amdox.com']!, type: 'ANNUAL', fromDate: daysAgo(-20), toDate: daysAgo(-16), status: 'PENDING' },
    ],
  });
  const attendance: Prisma.AttendanceCreateManyInput[] = [];
  for (const email of ['employee@amdox.com', 'alice@amdox.com', 'bob@amdox.com', 'hr@amdox.com']) {
    for (let d = 5; d >= 1; d--) {
      const day = daysAgo(d);
      if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
      const clockIn = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 3, 30 + Math.floor(rand() * 30)));
      const hours = Math.round(between(7.5, 9.5) * 100) / 100;
      attendance.push({ employeeId: employees[email]!, date: clockIn, clockIn, clockOut: new Date(clockIn.getTime() + hours * 3_600_000), hoursWorked: hours });
    }
  }
  await prisma.attendance.createMany({ data: attendance });

  await prisma.notification.createMany({
    data: [
      { userId: admin, type: 'alert', title: 'Low stock: SKU-1004', body: '27-inch 4K Monitor is at 6 (reorder level 10)' },
      { userId: admin, type: 'info', title: 'Leave request pending', body: 'Eli Brooks: annual leave' },
      { userId: users['hr@amdox.com']!, type: 'info', title: 'Leave request pending', body: 'Eli Brooks: annual leave' },
      { userId: users['inventory@amdox.com']!, type: 'alert', title: 'Low stock: SKU-1002', body: 'Ergonomic Office Chair is at 9 (reorder level 15)' },
    ],
  });

  console.log(`  history: ${invoices.length} invoices, ${expenses.length} expenses, 5 payroll runs, ${movements.length} stock movements`);
}

main()
  .then(() => console.log('Seed complete.'))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
