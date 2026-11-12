// Mock API for the static demo build (NEXT_PUBLIC_USE_MOCKS=true, e.g. Vercel).
// Responses follow the real API contracts in @repo/types. State lives in memory
// for the page session; writes are accepted and reflected until a reload.
// Never enabled in normal builds — see components/MSWProvider.tsx.

import { http, HttpResponse, type JsonBodyType } from 'msw';
import type {
  Account, AuditLog, BIMonth, BISummary, BudgetReport, Customer, DashboardOverview, Employee, Expense, Invoice,
  JournalEntry, Lead, LeaveRequest, Notification, PayrollRun, Product, PurchaseOrder, SalesOrder, Supplier, User, Warehouse,
} from '@repo/types';

const ok = (data: unknown, extra: Record<string, unknown> = {}) =>
  HttpResponse.json({ success: true, message: 'Success', data, ...extra } as JsonBodyType);
const fail = (status: number, message: string) => HttpResponse.json({ success: false, message }, { status });
const page = <T,>(rows: T[]) => ok(rows, { meta: { page: 1, limit: rows.length || 20, total: rows.length, totalPages: 1 } });

// ── Demo session (sessionStorage, so a reload keeps you signed in) ────────────
const MOCK_USER = { id: 'u-admin', email: 'demo@amdox.com', role: 'SUPER_ADMIN' as const };
function hasSession() {
  try { return sessionStorage.getItem('amx_mock_session') === '1'; } catch { return false; }
}
function setSession(on: boolean) {
  try { if (on) sessionStorage.setItem('amx_mock_session', '1'); else sessionStorage.removeItem('amx_mock_session'); } catch { /* ignore */ }
}

// ── Dataset ───────────────────────────────────────────────────────────────────
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const monthKey = (offset: number) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offset);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const departments = [{ id: 'd1', name: 'Engineering' }, { id: 'd2', name: 'Human Resources' }, { id: 'd3', name: 'Finance' }, { id: 'd4', name: 'Sales' }];
const employees: Employee[] = [
  ['e1', 'Alice Johnson', 'Engineering', 'Frontend Lead', '120000'], ['e2', 'Bob Smith', 'Engineering', 'Backend Developer', '95000'],
  ['e3', 'Carol White', 'Human Resources', 'HR Manager', '85000'], ['e4', 'Dev Mehta', 'Finance', 'Finance Manager', '110000'],
  ['e5', 'Sara Kim', 'Sales', 'Account Executive', '78000'],
].map(([id, name, dept, title, salary]) => ({
  id: id!, userId: null, name: name!, email: `${name!.split(' ')[0]!.toLowerCase()}@amdox.com`, phone: null,
  departmentId: departments.find((d) => d.name === dept)!.id, designation: title!, grossSalary: salary!, joinDate: iso(400),
  status: 'ACTIVE', isArchived: false, createdAt: iso(400), department: { name: dept! },
}));

const warehouses: Warehouse[] = [{ id: 'w1', name: 'Main Warehouse', location: 'Bangalore' }];
const products: Product[] = [
  ['p1', 'SKU-1001', 'ThinkPad T14 Gen 3', 'Electronics', '1200.00', 10, 38],
  ['p2', 'SKU-1002', 'Ergonomic Office Chair', 'Furniture', '250.00', 15, 9],
  ['p3', 'SKU-1003', 'Wireless Mouse M720', 'Accessories', '40.00', 30, 140],
  ['p4', 'SKU-1004', '27-inch 4K Monitor', 'Electronics', '350.00', 10, 6],
].map(([id, sku, name, category, price, reorder, qty]) => ({
  id: id as string, sku: sku as string, name: name as string, category: category as string, unitPrice: price as string,
  reorderLevel: reorder as number, unit: 'piece', isActive: true,
  stockLevels: [{ id: `sl-${id}`, productId: id as string, warehouseId: 'w1', quantity: qty as number, updatedAt: iso(1), warehouse: { name: 'Main Warehouse' } }],
}));

const suppliers: Supplier[] = [
  { id: 's1', name: 'TechSupply Co.', email: 'orders@techsupply.example', phone: null, leadTimeDays: 7, paymentTerms: 'Net 30' },
  { id: 's2', name: 'OfficeWorks Ltd', email: 'sales@officeworks.example', phone: null, leadTimeDays: 10, paymentTerms: 'Net 45' },
];
const purchaseOrders: PurchaseOrder[] = [
  { id: 'po1', supplierId: 's1', status: 'ISSUED', description: 'Monitors restock', subtotal: '7000.00', tax: '1260.00', total: '8260.00', createdBy: 'u-admin', approvedBy: 'u-admin', createdAt: iso(6), supplier: { name: 'TechSupply Co.' } },
  { id: 'po2', supplierId: 's2', status: 'DRAFT', description: 'Office chairs', subtotal: '3750.00', tax: '675.00', total: '4425.00', createdBy: 'u-admin', approvedBy: null, createdAt: iso(2), supplier: { name: 'OfficeWorks Ltd' } },
];

const customers: Customer[] = ['TechCorp', 'Global Solutions', 'Startup Inc', 'Enterprise LLC'].map((company, i) => ({
  id: `c${i + 1}`, name: ['John Smith', 'Sarah Jones', 'Mike Brown', 'Emily Davis'][i]!, email: null, phone: null, company,
  assignedTo: null, tags: [], createdAt: iso(200 - i * 20),
}));
const leads: Lead[] = (['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const).map((stage, i) => ({
  id: `l${i + 1}`, customerId: customers[i % 4]!.id, stage, value: String(20000 + i * 15000), expectedClose: null, assignedTo: null,
  notes: null, createdAt: iso(30 - i), customer: { name: customers[i % 4]!.name, company: customers[i % 4]!.company },
}));
const salesOrders: SalesOrder[] = [
  { id: 'so1', number: 'SO-2026-00001', customerId: 'c4', description: 'Hardware bundle', total: '25000.00', status: 'FULFILLED', createdBy: 'u-admin', createdAt: iso(20), customer: { name: 'Emily Davis', company: 'Enterprise LLC' } },
  { id: 'so2', number: 'SO-2026-00002', customerId: 'c3', description: 'Laptops', total: '12500.00', status: 'CONFIRMED', createdBy: 'u-admin', createdAt: iso(8), customer: { name: 'Mike Brown', company: 'Startup Inc' } },
];

const accounts: Account[] = [['a1', '1000', 'Cash', 'asset'], ['a2', '1100', 'Accounts Receivable', 'asset'], ['a3', '4000', 'Sales Revenue', 'income'], ['a4', '6000', 'Operating Expenses', 'expense']]
  .map(([id, code, name, type]) => ({ id: id!, code: code!, name: name!, type: type!, isActive: true }));
const ledger: JournalEntry[] = [
  { id: 'j1', date: iso(3), description: 'Client payment - TechCorp', status: 'POSTED', createdBy: 'u-admin', totalDebit: '15000.00', totalCredit: '15000.00', createdAt: iso(3),
    lines: [{ id: 'jl1', entryId: 'j1', accountId: 'a1', debit: '15000.00', credit: '0', memo: null, account: { code: '1000', name: 'Cash' } },
      { id: 'jl2', entryId: 'j1', accountId: 'a2', debit: '0', credit: '15000.00', memo: null, account: { code: '1100', name: 'Accounts Receivable' } }] },
];
const invoices: Invoice[] = customers.map((c, i) => ({
  id: `inv${i + 1}`, customerId: c.id, number: `INV-2026-0000${i + 1}`, subtotal: String(10000 + i * 4000), tax: String((10000 + i * 4000) * 0.18),
  total: String((10000 + i * 4000) * 1.18), status: (['PAID', 'SENT', 'OVERDUE', 'PAID'] as const)[i]!, dueDate: iso(-20), createdAt: iso(10 + i * 9),
  customer: { name: c.name, company: c.company },
}));
const expenses: Expense[] = (['Marketing', 'Travel', 'Software', 'Office'] as const).map((category, i) => ({
  id: `x${i + 1}`, category, amount: String(400 + i * 650), description: `${category} spend`, status: (['SUBMITTED', 'APPROVED', 'REIMBURSED', 'REJECTED'] as const)[i]!,
  submittedBy: 'u-emp', approvedBy: null, createdAt: iso(i * 5),
}));
const payrollRuns: PayrollRun[] = [1, 2, 3].map((m) => ({
  id: `pr${m}`, periodStart: `${monthKey(m)}-01`, periodEnd: `${monthKey(m)}-28`, status: 'PAID', runBy: 'u-admin',
  totalGross: '40666.67', totalTaxes: '8133.33', totalNet: '30500.00', createdAt: iso(m * 30), _count: { payslips: 5 },
}));
const leaveRequests: LeaveRequest[] = [
  { id: 'lr1', employeeId: 'e2', type: 'ANNUAL', fromDate: iso(-10), toDate: iso(-7), reason: 'Family trip', status: 'PENDING', approvedBy: null, createdAt: iso(2), employee: { name: 'Bob Smith' } },
  { id: 'lr2', employeeId: 'e1', type: 'SICK', fromDate: iso(12), toDate: iso(11), reason: null, status: 'APPROVED', approvedBy: 'u-admin', createdAt: iso(13), employee: { name: 'Alice Johnson' } },
];
const notifications: Notification[] = [
  { id: 'n1', userId: 'u-admin', type: 'alert', title: 'Low stock: SKU-1004', body: '27-inch 4K Monitor is at 6 (reorder level 10)', isRead: false, createdAt: iso(0.1) },
  { id: 'n2', userId: 'u-admin', type: 'info', title: 'Leave request pending', body: 'Bob Smith: annual leave', isRead: false, createdAt: iso(0.5) },
];
const users: User[] = [
  { id: 'u-admin', email: 'demo@amdox.com', role: 'SUPER_ADMIN', isActive: true, createdAt: iso(400), employee: null },
  { id: 'u-hr', email: 'hr@amdox.com', role: 'HR_MANAGER', isActive: true, createdAt: iso(300), employee: { id: 'e3', name: 'Carol White' } },
];
const audit: AuditLog[] = [
  { id: 'al1', userId: 'u-admin', action: 'LOGIN', entity: 'User', entityId: 'u-admin', ip: '127.0.0.1', timestamp: iso(0.01), user: { email: 'demo@amdox.com' } },
  { id: 'al2', userId: 'u-hr', action: 'POST', entity: 'payroll/run', entityId: null, ip: '127.0.0.1', timestamp: iso(30), user: { email: 'hr@amdox.com' } },
];

function biMonths(n: number): BIMonth[] {
  return Array.from({ length: n }, (_, i) => {
    const revenue = 80000 + ((i * 7919) % 30000);
    const exp = 12000 + ((i * 3571) % 6000);
    const pay = 40666.67;
    return {
      month: monthKey(n - 1 - i), revenue: revenue.toFixed(2), collected: (revenue * 0.8).toFixed(2), expenses: exp.toFixed(2),
      payroll: pay.toFixed(2), netProfit: (revenue - exp - pay).toFixed(2),
    };
  });
}

function biSummary(n: number): BISummary {
  const months = biMonths(n);
  const sum = (k: keyof Omit<BIMonth, 'month'>) => months.reduce((s, m) => s + Number(m[k]), 0).toFixed(2);
  return {
    from: months[0]!.month, to: months[months.length - 1]!.month, months,
    expensesByCategory: [{ category: 'Payroll', amount: sum('payroll') }, { category: 'Marketing', amount: (Number(sum('expenses')) * 0.5).toFixed(2) }, { category: 'Software', amount: (Number(sum('expenses')) * 0.5).toFixed(2) }],
    totals: { revenue: sum('revenue'), collected: sum('collected'), expenses: sum('expenses'), payroll: sum('payroll'), netProfit: sum('netProfit') },
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────
const A = '*/api/v1';
const authed = () => hasSession();

export const handlers = [
  http.get(`${A}/csrf-token`, () => ok({ csrfToken: 'mock-csrf-token' })),

  http.post(`${A}/auth/login`, () => { setSession(true); return ok({ accessToken: 'mock-access-token', user: MOCK_USER }); }),
  http.post(`${A}/auth/refresh`, () => (authed() ? ok({ accessToken: 'mock-access-token', user: MOCK_USER }) : fail(401, 'No session'))),
  http.get(`${A}/auth/me`, () => (authed() ? ok({ ...MOCK_USER, isActive: true, createdAt: iso(400), employee: { id: 'e4', name: 'Demo Admin' } }) : fail(401, 'Unauthorized'))),
  http.post(`${A}/auth/logout`, () => { setSession(false); return ok(null); }),

  http.get(`${A}/bi/overview`, () => {
    const data: DashboardOverview = {
      finance: { revenueYtd: '985400.00', openInvoices: { count: 2, total: '40120.00' }, trend: biMonths(6) },
      people: {
        activeEmployees: employees.length,
        headcountByDepartment: departments.map((d) => ({ department: d.name, count: employees.filter((e) => e.departmentId === d.id).length })),
      },
      payroll: { latest: { period: monthKey(1), totalNet: '30500.00', status: 'PAID' } },
      inventory: { lowStock: { count: 2, skus: ['SKU-1002', 'SKU-1004'] } },
      sales: { pipeline: { count: 4, value: '170000.00' } },
      me: { employeeName: 'Demo Admin', pendingLeave: 0, clockedIn: false, latestPayslip: null },
      recentActivity: audit.map((a) => ({ id: a.id, action: a.action, entity: a.entity, user: a.user.email, timestamp: a.timestamp })),
    };
    return ok(data);
  }),
  http.get(`${A}/bi/summary`, ({ request }) => ok(biSummary(Number(new URL(request.url).searchParams.get('months') ?? 6)))),

  http.get(`${A}/employees/departments`, () => ok(departments)),
  http.get(`${A}/employees`, () => page(employees)),
  http.post(`${A}/employees`, () => ok(null)),
  http.get(`${A}/leave-requests`, () => ok(leaveRequests)),
  http.post(`${A}/leave-requests`, () => fail(403, 'Your account is not linked to an employee record')),
  http.patch(`${A}/leave-requests/:id/:action`, ({ params }) => {
    const l = leaveRequests.find((x) => x.id === params.id);
    if (l) l.status = params.action === 'approve' ? 'APPROVED' : 'REJECTED';
    return ok(l);
  }),
  http.get(`${A}/attendance/history`, () => ok([])),
  http.get(`${A}/payroll`, () => ok(payrollRuns)),
  http.post(`${A}/payroll/run`, () => {
    if (payrollRuns.some((r) => r.periodStart.startsWith(monthKey(0)))) return fail(409, 'Payroll for this month has already been run');
    payrollRuns.unshift({ ...payrollRuns[0]!, id: 'pr0', periodStart: `${monthKey(0)}-01`, status: 'CONFIRMED', createdAt: iso(0) });
    return ok(payrollRuns[0]);
  }),
  http.get(`${A}/payroll/:id/payslips`, ({ params }) => {
    const run = payrollRuns.find((r) => r.id === params.id);
    if (!run) return fail(404, 'Payroll run not found');
    return ok({ ...run, payslips: employees.map((e, i) => {
      const gross = Number(e.grossSalary) / 12;
      return { id: `ps${i}`, payrollRunId: run.id, employeeId: e.id, gross: gross.toFixed(2), taxes: (gross * 0.2).toFixed(2), insurance: (gross * 0.05).toFixed(2), net: (gross * 0.75).toFixed(2), createdAt: run.createdAt, employee: { name: e.name, designation: e.designation } };
    }) });
  }),

  http.get(`${A}/inventory/products`, () => page(products)),
  http.get(`${A}/inventory/warehouses`, () => ok(warehouses)),
  http.post(`${A}/inventory/stock/movement`, async ({ request }) => {
    const body = (await request.json()) as { productId: string; type: string; quantity: number };
    const level = products.find((p) => p.id === body.productId)?.stockLevels[0];
    if (!level) return fail(404, 'Product not found');
    const delta = body.type === 'OUT' ? -body.quantity : body.quantity;
    if (level.quantity + delta < 0) return HttpResponse.json({ success: false, message: 'Insufficient stock', errors: { available: level.quantity, requested: -delta } }, { status: 409 });
    level.quantity += delta;
    return ok({ stockLevel: level });
  }),
  http.post(`${A}/inventory/forecast/demand`, () => {
    const today = new Date();
    const day = (o: number) => new Date(today.getTime() + o * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    return ok({
      jobId: 'mock-job', status: 'Completed', cached: false,
      predictions: products.map((p, i) => {
        const base = [1.6, 0.7, 4.5, 1.1][i]!;
        const stock = p.stockLevels[0]!.quantity;
        const predicted = Math.round(base * 30);
        return {
          sku: p.sku, name: p.name, predictedDemand: predicted, confidenceScore: 0.82, currentStock: stock, model: 'holt', date: today.toISOString().slice(0, 10),
          stockoutRisk: stock <= p.reorderLevel ? 'High' : stock < predicted ? 'Medium' : 'Low',
          recommendedReorder: stock < predicted + p.reorderLevel ? Math.ceil((predicted + p.reorderLevel - stock) / 5) * 5 : 0,
          timeSeries: [
            ...Array.from({ length: 15 }, (_, d) => ({ day: day(d - 15), actual: Math.max(0, Math.round(base + Math.sin(d) * base * 0.4)), pred: null })),
            ...Array.from({ length: 30 }, (_, d) => ({ day: day(d), actual: null, pred: Number((base * (1 + d * 0.005)).toFixed(2)) })),
          ],
        };
      }),
    });
  }),
  http.get(`${A}/purchases/orders`, () => ok(purchaseOrders)),
  http.patch(`${A}/purchases/orders/:id/:action`, ({ params }) => {
    const po = purchaseOrders.find((p) => p.id === params.id);
    if (po) po.status = params.action === 'approve' ? 'ISSUED' : params.action === 'receive' ? 'RECEIVED' : 'CANCELLED';
    return ok(po);
  }),
  http.get(`${A}/purchases/suppliers`, () => ok(suppliers)),

  http.get(`${A}/finance/accounts`, () => ok(accounts)),
  http.get(`${A}/finance/ledger`, () => page(ledger)),
  http.get(`${A}/finance/invoices`, () => page(invoices)),
  http.get(`${A}/finance/expenses`, () => page(expenses)),
  http.get(`${A}/finance/budget`, ({ request }) => {
    const u = new URL(request.url).searchParams;
    const lines = [['Marketing', '14000.00', '9850.00'], ['Software', '3500.00', '4100.00'], ['Travel', '4000.00', '1200.00']]
      .map(([category, budget, actual]) => ({ category: category!, budget: budget!, actual: actual!, variance: (Number(budget) - Number(actual)).toFixed(2) }));
    const report: BudgetReport = {
      year: Number(u.get('year')), month: Number(u.get('month')), lines,
      totals: { budget: '21500.00', actual: '15150.00', variance: '6350.00' },
    };
    return ok(report);
  }),

  http.get(`${A}/customers`, () => page(customers)),
  http.get(`${A}/leads`, () => page(leads)),
  http.patch(`${A}/leads/:id/stage`, async ({ params, request }) => {
    const lead = leads.find((l) => l.id === params.id);
    if (lead) lead.stage = ((await request.json()) as { stage: Lead['stage'] }).stage;
    return ok(lead);
  }),
  http.get(`${A}/sales-orders`, () => page(salesOrders)),

  http.get(`${A}/notifications`, () => ok({ items: notifications, unread: notifications.filter((n) => !n.isRead).length })),
  http.patch(`${A}/notifications/:id/read`, ({ params }) => {
    const n = notifications.find((x) => x.id === params.id);
    if (n) n.isRead = true;
    return ok({ id: params.id, isRead: true });
  }),
  http.post(`${A}/notifications/read-all`, () => { notifications.forEach((n) => { n.isRead = true; }); return ok({ updated: 0 }); }),

  http.get(`${A}/users`, () => page(users)),
  http.get(`${A}/admin/audit-logs`, () => page(audit)),
  http.get(`${A}/admin/system-health`, () => ok({ status: 'healthy', database: 'mocked', timestamp: new Date().toISOString(), stats: { users: users.length, employees: employees.length, products: products.length } })),
  http.get(`${A}/health/ready`, () => ok({ database: 'mocked' })),

  // Any other write in demo mode: explain instead of failing silently.
  http.all(`${A}/*`, ({ request }) => (request.method === 'GET' ? fail(404, 'Not available in the demo') : fail(501, 'This action is disabled in the demo build'))),
];
