import type { Role } from '@prisma/client';
import { prisma, loginAs } from './helpers';

const ID = '00000000-0000-4000-8000-000000000000';

type Method = 'get' | 'post' | 'patch' | 'delete';

// [method, path, a role that must be refused]
const RESTRICTED: Array<[Method, string, Role]> = [
  ['post', '/api/v1/customers', 'EMPLOYEE'],
  ['patch', `/api/v1/customers/${ID}`, 'READ_ONLY'],
  ['post', '/api/v1/leads', 'EMPLOYEE'],
  ['patch', `/api/v1/leads/${ID}/stage`, 'INVENTORY_MANAGER'],
  ['post', '/api/v1/finance/ledger', 'SALES_REP'],
  ['post', '/api/v1/finance/invoices', 'HR_MANAGER'],
  ['patch', `/api/v1/finance/invoices/${ID}`, 'EMPLOYEE'],
  ['post', '/api/v1/finance/expenses', 'READ_ONLY'],
  ['patch', `/api/v1/finance/expenses/${ID}/status`, 'EMPLOYEE'],
  ['post', '/api/v1/attendance/clock-in', 'READ_ONLY'],
  ['post', '/api/v1/attendance/clock-out', 'READ_ONLY'],
  ['post', '/api/v1/leave-requests', 'READ_ONLY'],
  ['patch', `/api/v1/leave-requests/${ID}/approve`, 'EMPLOYEE'],
  ['patch', `/api/v1/leave-requests/${ID}/reject`, 'FINANCE_MANAGER'],
  ['post', '/api/v1/inventory/products', 'SALES_REP'],
  ['patch', `/api/v1/inventory/products/${ID}`, 'EMPLOYEE'],
  ['post', '/api/v1/inventory/stock/movement', 'FINANCE_MANAGER'],
  ['post', '/api/v1/inventory/forecast/demand', 'EMPLOYEE'],
  ['post', '/api/v1/purchases/orders', 'EMPLOYEE'],
  ['patch', `/api/v1/purchases/orders/${ID}/approve`, 'SALES_REP'],
  ['patch', `/api/v1/purchases/orders/${ID}/receive`, 'READ_ONLY'],
  ['post', '/api/v1/purchases/suppliers', 'HR_MANAGER'],
  ['post', '/api/v1/employees', 'EMPLOYEE'],
  ['patch', `/api/v1/employees/${ID}`, 'SALES_REP'],
  ['delete', `/api/v1/employees/${ID}`, 'FINANCE_MANAGER'],
  ['post', '/api/v1/payroll/run', 'FINANCE_MANAGER'],
  ['get', '/api/v1/payroll', 'EMPLOYEE'],
  ['get', '/api/v1/users', 'HR_MANAGER'],
  ['get', '/api/v1/admin/audit-logs', 'FINANCE_MANAGER'],
  ['get', '/api/v1/admin/system-health', 'READ_ONLY'],
];

describe('RBAC: restricted routes return 403 for unauthorised roles', () => {
  const sessions = new Map<Role, Awaited<ReturnType<typeof loginAs>>>();
  beforeAll(async () => {
    for (const role of new Set(RESTRICTED.map(([, , r]) => r))) {
      sessions.set(role, await loginAs(role));
    }
  });

  it.each(RESTRICTED)('%s %s as %s → 403', async (method, path, role) => {
    const s = sessions.get(role)!;
    const res = await s.agent[method](path).set(s.auth).send({});
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('RBAC: permitted roles get through', () => {
  it('SALES_REP can create a customer', async () => {
    const s = await loginAs('SALES_REP');
    await s.agent.post('/api/v1/customers').set(s.auth).send({ name: 'Acme' }).expect(201);
  });

  it('SUPER_ADMIN can list users', async () => {
    const s = await loginAs('SUPER_ADMIN');
    await s.agent.get('/api/v1/users').set(s.auth).expect(200);
  });

  it('unauthenticated requests get 401, not 403', async () => {
    const s = await loginAs('EMPLOYEE');
    await s.agent.get('/api/v1/users').expect(401);
  });
});

describe('ownership: notifications', () => {
  it('only the owner can mark a notification as read', async () => {
    const owner = await loginAs('EMPLOYEE');
    const other = await loginAs('SUPER_ADMIN');
    const n = await prisma.notification.create({ data: { userId: owner.user.id, type: 'info', title: 'Hi' } });

    await other.agent.patch(`/api/v1/notifications/${n.id}/read`).set(other.auth).send({}).expect(404);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(false);

    await owner.agent.patch(`/api/v1/notifications/${n.id}/read`).set(owner.auth).send({}).expect(200);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: n.id } })).isRead).toBe(true);
  });

  it('lists only the caller’s notifications', async () => {
    const a = await loginAs('EMPLOYEE');
    const b = await loginAs('EMPLOYEE');
    await prisma.notification.create({ data: { userId: b.user.id, type: 'info', title: 'for b' } });
    const res = await a.agent.get('/api/v1/notifications').set(a.auth).expect(200);
    expect(res.body.data.items.every((n: { userId: string }) => n.userId === a.user.id)).toBe(true);
  });
});

describe('ownership: attendance', () => {
  it('an employee cannot clock in for someone else', async () => {
    const me = await loginAs('EMPLOYEE', { withEmployee: true });
    const other = await loginAs('EMPLOYEE', { withEmployee: true });
    const res = await me.agent.post('/api/v1/attendance/clock-in').set(me.auth).send({ employeeId: other.employee!.id });
    expect(res.status).toBe(403);
  });

  it('an employee clocks in for themselves; a second clock-in is 409', async () => {
    const me = await loginAs('EMPLOYEE', { withEmployee: true });
    const res = await me.agent.post('/api/v1/attendance/clock-in').set(me.auth).send({}).expect(201);
    expect(res.body.data.employeeId).toBe(me.employee!.id);
    await me.agent.post('/api/v1/attendance/clock-in').set(me.auth).send({}).expect(409);
  });

  it('HR may clock in on behalf of an employee', async () => {
    const hr = await loginAs('HR_MANAGER');
    const emp = await loginAs('EMPLOYEE', { withEmployee: true });
    await hr.agent.post('/api/v1/attendance/clock-in').set(hr.auth).send({ employeeId: emp.employee!.id }).expect(201);
  });

  it('an employee cannot read another employee’s history', async () => {
    const me = await loginAs('EMPLOYEE', { withEmployee: true });
    const other = await loginAs('EMPLOYEE', { withEmployee: true });
    await me.agent.get(`/api/v1/attendance/history?employeeId=${other.employee!.id}`).set(me.auth).expect(403);
  });

  it('a user without an employee record cannot clock in', async () => {
    const s = await loginAs('SALES_REP');
    await s.agent.post('/api/v1/attendance/clock-in').set(s.auth).send({}).expect(403);
  });
});

describe('ownership: leave requests', () => {
  const body = { type: 'ANNUAL', fromDate: '2026-12-01', toDate: '2026-12-03' };

  it('an employee cannot file leave for someone else', async () => {
    const me = await loginAs('EMPLOYEE', { withEmployee: true });
    const other = await loginAs('EMPLOYEE', { withEmployee: true });
    await me.agent.post('/api/v1/leave-requests').set(me.auth).send({ ...body, employeeId: other.employee!.id }).expect(403);
  });

  it('an employee files leave for themselves and only sees their own requests', async () => {
    const me = await loginAs('EMPLOYEE', { withEmployee: true });
    const other = await loginAs('EMPLOYEE', { withEmployee: true });
    await other.agent.post('/api/v1/leave-requests').set(other.auth).send(body).expect(201);
    const mine = await me.agent.post('/api/v1/leave-requests').set(me.auth).send(body).expect(201);
    expect(mine.body.data.employeeId).toBe(me.employee!.id);

    const list = await me.agent.get('/api/v1/leave-requests').set(me.auth).expect(200);
    expect(list.body.data.map((l: { employeeId: string }) => l.employeeId)).toEqual([me.employee!.id]);
  });

  it('HR cannot approve their own leave, and a decided request cannot be decided again', async () => {
    const hr = await loginAs('HR_MANAGER', { withEmployee: true });
    const own = await hr.agent.post('/api/v1/leave-requests').set(hr.auth).send(body).expect(201);
    await hr.agent.patch(`/api/v1/leave-requests/${own.body.data.id}/approve`).set(hr.auth).send({}).expect(403);

    const emp = await loginAs('EMPLOYEE', { withEmployee: true });
    const req = await emp.agent.post('/api/v1/leave-requests').set(emp.auth).send(body).expect(201);
    await hr.agent.patch(`/api/v1/leave-requests/${req.body.data.id}/approve`).set(hr.auth).send({}).expect(200);
    await hr.agent.patch(`/api/v1/leave-requests/${req.body.data.id}/reject`).set(hr.auth).send({}).expect(409);
  });
});

describe('ownership: salaries', () => {
  it('hides grossSalary from roles without payroll access', async () => {
    const hr = await loginAs('HR_MANAGER', { withEmployee: true });
    const emp = await loginAs('EMPLOYEE', { withEmployee: true });
    const asEmp = await emp.agent.get('/api/v1/employees').set(emp.auth).expect(200);
    expect(asEmp.body.data[0]).not.toHaveProperty('grossSalary');
    const asHr = await hr.agent.get('/api/v1/employees').set(hr.auth).expect(200);
    expect(asHr.body.data[0]).toHaveProperty('grossSalary');
  });
});

describe('expenses', () => {
  it('finance cannot approve their own expense; staff see only their own', async () => {
    const fin = await loginAs('FINANCE_MANAGER');
    const emp = await loginAs('EMPLOYEE');
    const own = await fin.agent.post('/api/v1/finance/expenses').set(fin.auth).send({ category: 'Travel', amount: 50 }).expect(201);
    await fin.agent.patch(`/api/v1/finance/expenses/${own.body.data.id}/status`).set(fin.auth).send({ status: 'APPROVED' }).expect(403);

    const e = await emp.agent.post('/api/v1/finance/expenses').set(emp.auth).send({ category: 'Meals', amount: 20 }).expect(201);
    const list = await emp.agent.get('/api/v1/finance/expenses').set(emp.auth).expect(200);
    expect(list.body.data.map((x: { id: string }) => x.id)).toEqual([e.body.data.id]);

    await fin.agent.patch(`/api/v1/finance/expenses/${e.body.data.id}/status`).set(fin.auth).send({ status: 'REIMBURSED' }).expect(409);
    await fin.agent.patch(`/api/v1/finance/expenses/${e.body.data.id}/status`).set(fin.auth).send({ status: 'APPROVED' }).expect(200);
  });
});
