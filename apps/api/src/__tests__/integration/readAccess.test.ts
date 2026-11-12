import type { Role } from '@prisma/client';
import { loginAs } from './helpers';

// Read access per role (decided 2026-11-12):
//  - EMPLOYEE: only their own profile, attendance, leave and payslips
//  - READ_ONLY: reads every module, writes nothing
//  - other roles: the modules they write to, plus what they clearly need
// Expectations are written out here on purpose (not derived from roles.ts),
// so a change to the matrix has to be made in both places.

const ALL: Role[] = ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE', 'READ_ONLY'];
const ID = '00000000-0000-4000-8000-000000000000';

const A = 'SUPER_ADMIN', HR = 'HR_MANAGER', FIN = 'FINANCE_MANAGER', INV = 'INVENTORY_MANAGER', SALES = 'SALES_REP', EMP = 'EMPLOYEE', RO = 'READ_ONLY';

// [path, roles that may read it]. Detail paths use an unknown id: allowed → 404, refused → 403.
const MATRIX: Array<[string, Role[]]> = [
  // HR
  ['/api/v1/employees', [A, HR, FIN, RO]],
  ['/api/v1/employees/departments', [A, HR, FIN, RO]],
  ['/api/v1/payroll', [A, HR, FIN, RO]],
  [`/api/v1/payroll/${ID}/payslips`, [A, HR, FIN, RO]],
  ['/api/v1/payroll/my-payslips', [A, HR, FIN, INV, SALES, EMP]],
  ['/api/v1/leave-requests', ALL], // scoped to own records below PEOPLE_RECORDS
  ['/api/v1/attendance/history', ALL],
  // Finance
  ['/api/v1/finance/accounts', [A, FIN, RO]],
  ['/api/v1/finance/ledger', [A, FIN, RO]],
  ['/api/v1/finance/invoices', [A, FIN, RO]],
  ['/api/v1/finance/budget', [A, FIN, RO]],
  ['/api/v1/finance/expenses', [A, HR, FIN, INV, SALES, RO]],
  ['/api/v1/bi/summary', [A, FIN, RO]],
  // Supply chain
  ['/api/v1/inventory/products', [A, INV, SALES, RO]],
  [`/api/v1/inventory/products/${ID}`, [A, INV, SALES, RO]],
  ['/api/v1/inventory/warehouses', [A, INV, SALES, RO]],
  ['/api/v1/inventory/stock', [A, INV, SALES, RO]],
  ['/api/v1/purchases/orders', [A, INV, FIN, RO]],
  ['/api/v1/purchases/suppliers', [A, INV, FIN, RO]],
  // CRM
  ['/api/v1/customers', [A, SALES, FIN, RO]],
  [`/api/v1/customers/${ID}`, [A, SALES, FIN, RO]],
  ['/api/v1/leads', [A, SALES, RO]],
  [`/api/v1/leads/${ID}`, [A, SALES, RO]],
  ['/api/v1/sales-orders', [A, SALES, FIN, RO]],
  // Administration
  ['/api/v1/users', [A, RO]],
  ['/api/v1/admin/audit-logs', [A, RO]],
  ['/api/v1/admin/system-health', [A, RO]],
  // Everyone
  ['/api/v1/bi/overview', ALL],
  ['/api/v1/notifications', ALL],
];

const CASES = MATRIX.flatMap(([path, allowed]) =>
  ALL.map((role) => {
    const isDetail = path.includes(ID) && !path.endsWith('/payslips');
    const expected = allowed.includes(role) ? (isDetail ? 404 : 200) : 403;
    // An unknown payroll run is a 404 for readers
    return [path, role, path.endsWith('/payslips') && allowed.includes(role) ? 404 : expected] as [string, Role, number];
  }),
);

describe('read access matrix (GET) by role', () => {
  const sessions = new Map<Role, Awaited<ReturnType<typeof loginAs>>>();
  beforeAll(async () => {
    // READ_ONLY accounts normally have no employee record; staff roles do
    for (const role of ALL) sessions.set(role, await loginAs(role, { withEmployee: role !== 'READ_ONLY' }));
  });

  it.each(CASES)('GET %s as %s → %i', async (path, role, status) => {
    const s = sessions.get(role)!;
    const res = await s.agent.get(path).set(s.auth);
    expect(res.status).toBe(status);
  });

  it('READ_ONLY and HR see every leave request; others only their own', async () => {
    const emp = sessions.get('EMPLOYEE')!;
    const sales = sessions.get('SALES_REP')!;
    const body = { type: 'ANNUAL', fromDate: '2027-03-01', toDate: '2027-03-02' };
    const a = await emp.agent.post('/api/v1/leave-requests').set(emp.auth).send(body).expect(201);
    const b = await sales.agent.post('/api/v1/leave-requests').set(sales.auth).send(body).expect(201);

    const ids = async (role: Role) => {
      const s = sessions.get(role)!;
      const res = await s.agent.get('/api/v1/leave-requests').set(s.auth).expect(200);
      return res.body.data.map((l: { id: string }) => l.id) as string[];
    };
    expect(await ids('EMPLOYEE')).toEqual([a.body.data.id]);
    expect(await ids('SALES_REP')).toEqual([b.body.data.id]);
    expect(await ids('READ_ONLY')).toEqual(expect.arrayContaining([a.body.data.id, b.body.data.id]));
    expect(await ids('HR_MANAGER')).toEqual(expect.arrayContaining([a.body.data.id, b.body.data.id]));
  });

  it('finance reads a customer without its leads and call notes', async () => {
    const sales = sessions.get('SALES_REP')!;
    const fin = sessions.get('FINANCE_MANAGER')!;
    const c = await sales.agent.post('/api/v1/customers').set(sales.auth).send({ name: 'Visible Co' }).expect(201);
    const asSales = await sales.agent.get(`/api/v1/customers/${c.body.data.id}`).set(sales.auth).expect(200);
    expect(asSales.body.data).toHaveProperty('leads');
    const asFin = await fin.agent.get(`/api/v1/customers/${c.body.data.id}`).set(fin.auth).expect(200);
    expect(asFin.body.data).not.toHaveProperty('leads');
    expect(asFin.body.data).not.toHaveProperty('interactions');
  });

  it('READ_ONLY cannot write anywhere it can read', async () => {
    const ro = sessions.get('READ_ONLY')!;
    const writes: Array<['post' | 'patch' | 'put', string]> = [
      ['post', '/api/v1/finance/ledger'], ['post', '/api/v1/finance/invoices'], ['put', '/api/v1/finance/budget'],
      ['post', '/api/v1/finance/expenses'], ['post', '/api/v1/employees'], ['post', '/api/v1/payroll/run'],
      ['post', '/api/v1/inventory/products'], ['post', '/api/v1/purchases/orders'], ['post', '/api/v1/purchases/suppliers'],
      ['post', '/api/v1/customers'], ['post', '/api/v1/leads'], ['post', '/api/v1/sales-orders'],
      ['post', '/api/v1/users'], ['post', '/api/v1/leave-requests'], ['post', '/api/v1/attendance/clock-in'],
    ];
    for (const [method, path] of writes) {
      const res = await ro.agent[method](path).set(ro.auth).send({});
      expect([method, path, res.status]).toEqual([method, path, 403]);
    }
  });
});
